"""Guardrail tests preserve assignment units and catch invalid exposure records."""
import numpy as np
import pandas as pd
import pytest

from ravelry_analytics.designer_attention import (
    analyse_attention, cluster_interval, generate_attention, ratio_difference,
)
from ravelry_analytics.simulate_experiment import generate
from ravelry_analytics.export_dashboard import decision_scenarios


@pytest.fixture
def known_exposure():
    users=pd.DataFrame({'user_id':np.arange(60),'eligible':True,
        'variant':['control']*30+['treatment']*30,
        'assigned_at':pd.Timestamp('2026-09-01',tz='UTC')})
    records=[]
    for uid in range(60):
        if uid in [29,59]:
            continue  # Included in assignment bootstrap, even without impressions.
        top=1 if uid<30 else 3
        for slot in range(4):
            records.append({'event_id':f'{uid}-{slot}','user_id':uid,
                'designer_id':1 if slot<top else 11,
                'occurred_at':pd.Timestamp('2026-09-02',tz='UTC')})
    preperiod=pd.DataFrame({'designer_id':np.arange(1,101),'impressions':[900]*10+[100]*90})
    return users,pd.DataFrame(records),preperiod


def test_known_ratio_and_zero_exposure_accounts(known_exposure):
    users,events,prior=known_exposure
    r=analyse_attention(users,events,prior,repetitions=50)
    assert r['difference']==pytest.approx(.5)
    assert r['arms']['control']['top_share']==pytest.approx(.25)
    assert r['arms']['treatment']['top_share']==pytest.approx(.75)
    assert r['arms']['control']['accounts']==30
    assert r['arms']['control']['without_impressions']==1
    assert r['ci_low']==pytest.approx(.5) and r['ci_high']==pytest.approx(.5)
    assert r['status']=='material harm'


def test_generation_fixed_and_shared_assignments():
    users,_=generate(candidates=200)
    p,a=generate_attention(users);q,b=generate_attention(users)
    pd.testing.assert_frame_equal(p,q)
    for key in a:
        pd.testing.assert_frame_equal(a[key],b[key])
    pd.testing.assert_series_equal(a['neutral'].user_id,a['concentration_stress'].user_id)
    pd.testing.assert_series_equal(a['neutral'].occurred_at,a['concentration_stress'].occurred_at)
    assert (a['concentration_stress'].designer_id<=10).sum()>=(a['neutral'].designer_id<=10).sum()


def test_guardrail_rejects_orphans_and_bad_windows(known_exposure):
    users,events,prior=known_exposure
    bad=events.copy();bad.loc[0,'user_id']=999
    with pytest.raises(ValueError,match='Orphan'):analyse_attention(users,bad,prior)
    bad=events.copy();bad.loc[0,'occurred_at']=pd.Timestamp('2026-10-01',tz='UTC')
    with pytest.raises(ValueError,match='outside'):analyse_attention(users,bad,prior)
    bad=events.copy();bad.loc[0,'designer_id']=101
    with pytest.raises(ValueError,match='Unknown'):analyse_attention(users,bad,prior)


def test_duplicate_impressions_fail(known_exposure):
    users,events,prior=known_exposure
    with pytest.raises(ValueError,match='Duplicate'):
        analyse_attention(users,pd.concat([events,events.iloc[:1]]),prior)


def test_empty_exposure_does_not_become_zero_share():
    with pytest.raises(ValueError,match='observable'):
        ratio_difference(np.zeros((10,2)),np.ones((10,2)))


def test_cluster_bootstrap_is_reproducible():
    a=np.array([[1,4],[2,5],[0,0],[3,6]])
    b=np.array([[1,5],[1,4],[2,6],[0,0]])
    assert cluster_interval(a,b,50)==cluster_interval(a,b,50)


def test_opportunity_sizing_uses_absolute_lift_and_coverage():
    r=decision_scenarios({'All crafts|New to craft|all':{'summary':{'mature':1000,'activation_rate':.12}}})
    cell=next(s for s in r['scenarios'] if s['coverage']==.5 and s['absolute_lift']==.015)
    assert cell['additional_recorded_starts']==pytest.approx(7.5)
    assert len(r['scenarios'])==12 and r['synthetic'] is True
