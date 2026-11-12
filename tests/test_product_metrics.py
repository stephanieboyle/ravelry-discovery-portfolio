"""Known event journeys test metric meaning, not merely whether SQL executes."""
from pathlib import Path
import re

import duckdb
import pandas as pd
import pytest

from ravelry_analytics.export_dashboard import make_slice
from ravelry_analytics.simulate_product import generate

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def modelled():
    con = duckdb.connect()
    users = pd.DataFrame({'user_id': [1, 2, 3, 4, 5],
                          'signed_up_at': pd.to_datetime(['2026-08-31'] * 5, utc=True),
                          'craft': ['Knitting', 'Crochet', 'Knitting', 'Knitting', 'Crochet'],
                          'experience': ['Experienced', 'New to craft', 'New to craft', 'Experienced', 'New to craft']})
    records = []

    def add(uid, name, time):
        stamp = pd.Timestamp(time, tz='UTC')
        records.append({'event_id': f'e{len(records)}', 'user_id': uid, 'event_name': name,
                        'occurred_at': stamp, 'received_at': stamp + pd.Timedelta(seconds=5),
                        'session_id': f's{uid}', 'pattern_id': 100, 'schema_version': 1})
    for uid in [1, 2, 4]:
        add(uid, 'discovery_viewed', '2026-09-01')
    add(1, 'pattern_opened', '2026-09-02')
    add(1, 'project_started', '2026-09-03')
    add(1, 'pattern_saved', '2026-09-04')  # Saving after starting is not save-before-start.
    add(1, 'discovery_viewed', '2026-09-28')  # Calendar week 4.
    add(2, 'pattern_opened', '2026-09-02')
    add(3, 'discovery_viewed', '2026-10-20')
    add(3, 'pattern_opened', '2026-10-20 01:00')
    add(3, 'project_started', '2026-10-21')  # Realised start, but immature account.
    duplicate = dict(records[3]); duplicate['received_at'] += pd.Timedelta(minutes=1)
    records.append(duplicate)
    events = pd.DataFrame(records)
    con.register('input_users', users); con.register('input_events', events)
    con.execute('create table synthetic_users as select * from input_users')
    con.execute('create table synthetic_events as select * from input_events')
    for name in ['fct_product_events', 'dim_discovery_users', 'fct_discovery_weeks', 'mart_activation_retention']:
        sql = (ROOT / 'dbt_product/models' / f'{name}.sql').read_text()
        sql = re.sub(r"\{\{ source\('demo', '([^']+)'\) \}\}", r'\1', sql)
        sql = re.sub(r"\{\{ ref\('([^']+)'\) \}\}", r'\1', sql)
        con.execute(f'create table {name} as {sql}')
    yield con
    con.close()


def test_primary_denominator_and_optional_saving(modelled):
    s = make_slice(modelled)['summary']
    assert s['entrants'] == 4  # Fifth signed-up account never enters discovery.
    assert s['mature'] == 3 and s['immature'] == 1
    assert s['opened'] == 2 and s['started'] == 1
    assert s['activation_rate'] == pytest.approx(1 / 3)
    assert s['saved'] == 1 and s['saved_then_started'] == 0
    assert s['median_days'] == pytest.approx(2)


def test_mature_calendar_week_retention(modelled):
    v = make_slice(modelled)
    assert v['summary']['retention4_eligible'] == 3
    assert v['summary']['retention4_n'] == 1
    assert v['summary']['retention4'] == pytest.approx(1 / 3)
    assert v['cohorts'][-1]['cells'][4]['rate'] is None
    assert v['cohorts'][0]['cells'][0]['rate'] == 1


def test_recent_cohort_is_not_counted_as_failure(modelled):
    s = make_slice(modelled, window='4')['summary']
    assert s['entrants'] == 1 and s['mature'] == 0
    assert s['activation_rate'] is None and s['retention4'] is None


def test_transport_duplicates_do_not_inflate_events(modelled):
    raw = modelled.execute('select count(*) from synthetic_events').fetchone()[0]
    clean = modelled.execute('select count(*) from fct_product_events').fetchone()[0]
    assert raw - clean == 1
    assert modelled.execute('select count(*)-count(distinct event_id) from fct_product_events').fetchone()[0] == 0


def test_partitioning_and_empty_slice(modelled):
    total = make_slice(modelled)['summary']['entrants']
    parts = sum(make_slice(modelled, craft=c)['summary']['entrants'] for c in ['Knitting', 'Crochet'])
    assert parts == total
    empty = make_slice(modelled, craft='Crochet', experience='Experienced')['summary']
    assert empty['entrants'] == 0 and empty['activation_rate'] is None


def test_product_generator_seed_and_event_identity():
    u1, e1 = generate(users=200); u2, e2 = generate(users=200)
    pd.testing.assert_frame_equal(u1, u2); pd.testing.assert_frame_equal(e1, e2)
    assert e1.event_id.duplicated().any()
    assert set(e1.user_id) <= set(u1.user_id)
    assert e1.occurred_at.max() < pd.Timestamp('2026-10-26', tz='UTC')


def test_activation_precedes_retention_and_unknowns_stay_unknown(modelled):
    result=make_slice(modelled)['activation_retention']
    assert result['groups'][0]['numerator']==1
    assert result['groups'][0]['denominator']==1
    assert result['groups'][1]['numerator']==0
    assert result['groups'][1]['denominator']==2
    assert result['eligible_accounts']==3
    assert result['crude_gap']==pytest.approx(1)
    assert result['coverage']==pytest.approx(2/3)
    assert result['standardised_gap']==pytest.approx(1)
    recent=make_slice(modelled,window='4')['activation_retention']
    assert recent['eligible_accounts']==0 and recent['crude_gap'] is None
    assert recent['standardised_gap'] is None
