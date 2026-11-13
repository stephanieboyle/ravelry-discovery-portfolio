import numpy as np
import pandas as pd
import pytest
from ravelry_analytics.simulate_experiment import generate
from ravelry_analytics.analyse_experiment import compare, analyse, null_calibration, validate_and_join, planning

AT=pd.Timestamp('2026-10-20',tz='UTC')

def prepared(scenario='null'):
    users,events=generate(scenario)
    # Same representation as CSV round-trip: absent assignments are null.
    users['variant']=users.variant.replace('',np.nan)
    return users,events

def test_reproducible_without_reselecting_seed():
    a,b=generate();c,d=generate()
    pd.testing.assert_frame_equal(a,c);pd.testing.assert_frame_equal(b,d)

def test_primary_ci_known_effect_and_symmetry():
    v=compare(150,1000,120,1000);w=compare(120,1000,150,1000)
    assert v['difference']==pytest.approx(.03)
    assert v['ci_low']<.03<v['ci_high']
    assert w['ci_low']==pytest.approx(-v['ci_high'])
    assert w['p_value']==pytest.approx(v['p_value'])

def test_full_maturity_and_srm():
    users,events=prepared();r=analyse(users,events,AT)
    assert r['mature']==r['assigned'] and r['immature']==0
    assert r['primary']['treatment_n']+r['primary']['control_n']==r['assigned']
    assert 0<=r['srm_p']<=1

def test_duplicate_users_rejected():
    u,e=prepared()
    with pytest.raises(ValueError,match='Duplicate'):validate_and_join(pd.concat([u,u.iloc[:1]]),e,AT)

def test_missing_outcomes_rejected():
    u,e=prepared();idx=u.index[u.eligible][0];u.loc[idx,'started_14d']=np.nan
    with pytest.raises(ValueError,match='Missing'):validate_and_join(u,e,AT)

def test_invalid_event_window_rejected():
    u,e=prepared();e.loc[e.index[0],'occurred_at']=pd.Timestamp('2026-01-01',tz='UTC')
    with pytest.raises(ValueError,match='outside'):validate_and_join(u,e,AT)

def test_event_outcome_mismatch_rejected():
    u,e=prepared()
    with pytest.raises(ValueError,match='disagrees'):validate_and_join(u,e.iloc[1:],AT)

def test_repeat_events_are_not_independent_users():
    u,e=prepared();one=analyse(u,e,AT);many=analyse(u,pd.concat([e,e]),AT)
    assert one['primary']==many['primary']

def test_immature_windows_not_zero_filled():
    u,e=prepared();all_rows,mature=validate_and_join(u,e,pd.Timestamp('2026-09-20',tz='UTC'))
    assert 0<len(mature)<len(all_rows)

def test_null_calibration_not_single_p_value():
    v=null_calibration()
    assert .90<=v['ci_coverage']<=.99
    assert .01<=v['false_positive_fraction']<=.10

def test_planning_reasonable_scale():
    v=planning()
    assert 10000<v['required_total']<25000
    assert .01<v['mde_at_10800_per_arm']<.02


def test_power_uses_expected_population_baseline():
    v=planning()
    assert v['assumed_baseline']==pytest.approx(.12+.03*.45-.01*.30)
    assert v['reference_group_baseline']==pytest.approx(.12)
