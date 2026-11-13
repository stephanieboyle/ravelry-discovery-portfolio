"""Independently reconcile synthetic dashboard metrics using pandas on source events.

Requires the local simulated product database, not any Ravelry API credentials.
"""
import json
from pathlib import Path

import duckdb
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
AS_OF = pd.Timestamp('2026-10-26')


def check(actual, expected, label):
    if expected is None:
        assert actual is None or pd.isna(actual), (label, actual, expected)
    else:
        assert actual is not None and np.isclose(actual, expected, rtol=1e-10, atol=1e-10), (label, actual, expected)


def main():
    data = json.loads((ROOT / 'dashboard/data.json').read_text())
    con = duckdb.connect(str(ROOT / 'data/product_demo.duckdb'), read_only=True)
    con.execute("set TimeZone='UTC'")
    raw = con.execute('select * from synthetic_events').df()
    users = con.execute('select * from synthetic_users').df().set_index('user_id')
    con.close()
    e = raw.sort_values(['event_id', 'received_at']).drop_duplicates('event_id', keep='first').copy()
    e['time'] = e.occurred_at.dt.tz_convert('UTC').dt.tz_localize(None)
    assert len(e) == data['meta']['unique_events']
    assert len(raw) == data['meta']['received_events']
    assert set(e.user_id) <= set(users.index)
    first = e[e.event_name.eq('discovery_viewed')].groupby('user_id').time.min()
    d = users.join(first.rename('first'), how='inner')
    opened = e[e.event_name.eq('pattern_opened')].join(first.rename('first'), on='user_id')
    opened = opened[opened.time >= opened['first']].groupby('user_id').time.min()
    d = d.join(opened.rename('open'))
    for name, event in [('save', 'pattern_saved'), ('start', 'project_started')]:
        events = e[e.event_name.eq(event)].join(opened.rename('open'), on='user_id')
        times = events[events.time >= events.open].groupby('user_id').time.min()
        d = d.join(times.rename(name))
    d['cohort'] = d['first'].dt.normalize() - pd.to_timedelta(d['first'].dt.dayofweek, unit='D')
    d['deadline'] = d['first'] + pd.Timedelta(days=14)
    d['mature'] = d.deadline <= AS_OF
    d['opened'] = d.open < d.deadline
    d['saved'] = d.save < d.deadline
    d['started'] = d.start < d.deadline
    d['eligible4'] = d.cohort + pd.Timedelta(weeks=5) <= AS_OF
    post = e.join(first.rename('first'), on='user_id')
    post = post[post.time >= post['first']].copy()
    post['week'] = post.time.dt.normalize() - pd.to_timedelta(post.time.dt.dayofweek, unit='D')
    activity = post[['user_id', 'week']].drop_duplicates().join(d.cohort, on='user_id')
    activity['since'] = ((activity.week - activity.cohort).dt.days // 7).astype(int)
    d['returned4'] = d.index.isin(activity[activity.since.eq(4)].user_id)
    cells = 0
    for key, expected in data['slices'].items():
        craft, experience, window = key.split('|')
        a = d.copy()
        if craft != 'All crafts':
            a = a[a.craft.eq(craft)]
        if experience != 'All experience':
            a = a[a.experience.eq(experience)]
        threshold = pd.Timestamp('2026-07-06') if window == 'all' else AS_OF - pd.Timedelta(weeks=int(window))
        a = a[a.cohort >= threshold]
        m = a[a.mature]
        values = {'entrants': len(a), 'mature': len(m), 'immature': len(a)-len(m),
            'opened': int(m.opened.sum()), 'saved': int(m.saved.sum()), 'started': int(m.started.sum()),
            'saved_then_started': int((m.started & (m.save <= m.start)).sum()),
            'median_days': float(((m.loc[m.started, 'start'] - m.loc[m.started, 'first']).dt.total_seconds()/86400).median()) if m.started.any() else None,
            'activation_rate': m.started.mean() if len(m) else None,
            'retention4_eligible': int(a.eligible4.sum()),
            'retention4_n': int((a.eligible4 & a.returned4).sum()),
            'retention4': a.loc[a.eligible4, 'returned4'].mean() if a.eligible4.any() else None}
        for name, value in values.items():
            check(value, expected['summary'][name], key+':'+name)
        selected = activity[activity.user_id.isin(a.index)]
        for cohort in expected['cohorts']:
            group = a[a.cohort.eq(pd.Timestamp(cohort['cohort']))]
            assert len(group) == cohort['users']
            for cell in cohort['cells']:
                cells += 1
                mature = pd.Timestamp(cohort['cohort']) + pd.Timedelta(weeks=cell['week']+1) <= AS_OF
                n = selected[(selected.user_id.isin(group.index)) & selected.since.eq(cell['week'])].user_id.nunique() if mature else None
                assert mature == cell['mature']
                check(n, cell['numerator'], key+':retention-n')
                check(n / len(group) if n is not None else None, cell['rate'], key+':retention-rate')
        for week in expected['weekly']:
            events = selected[selected.week.eq(pd.Timestamp(week['week']))]
            assert len(events) == week['active']
            assert int(events.since.eq(0).sum()) == week['new']
            starts = e[e.user_id.isin(a.index) & e.event_name.eq('project_started')].copy()
            starts['week'] = starts.time.dt.normalize() - pd.to_timedelta(starts.time.dt.dayofweek, unit='D')
            assert starts[starts.week.eq(pd.Timestamp(week['week']))].user_id.nunique() == week['recording_users']
        eligible = a[a.eligible4]
        for group in expected['activation_retention']['groups']:
            members = eligible[eligible.started.eq(group['activated'])]
            assert len(members) == group['denominator']
            assert int(members.returned4.sum()) == group['numerator']
            check(members.returned4.mean() if len(members) else None, group['rate'], key+':landmark')
    for row in data['decision']['scenarios']:
        check(data['decision']['eligible_accounts']*row['coverage']*row['absolute_lift'],
              row['additional_recorded_starts'], 'opportunity sizing')
    result = {'evidence_class': 'SYNTHETIC product events only',
        'method': 'Independent pandas event deduplication, ordered journeys, elapsed 14-day windows and UTC calendar cohorts; no model tables read',
        'received_events': len(raw), 'unique_events': len(e), 'slices_checked': len(data['slices']),
        'retention_cells_checked': cells, 'all_summary': data['slices']['All crafts|All experience|all']['summary'],
        'opportunity_scenarios_checked': len(data['decision']['scenarios'])}
    out = ROOT / 'reports/synthetic/numerical_audit.json'
    out.write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
