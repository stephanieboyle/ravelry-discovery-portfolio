"""Account-level intention-to-treat analysis of synthetic events only."""
import argparse
import json
import math
from pathlib import Path
import numpy as np
import pandas as pd
from scipy.stats import chisquare
from statsmodels.stats.proportion import confint_proportions_2indep, proportions_ztest, proportion_effectsize
from statsmodels.stats.power import NormalIndPower
from .simulate_experiment import ASSUMPTIONS
import os
os.environ.setdefault("MPLCONFIGDIR", str(Path(".cache/matplotlib").resolve()))
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# Decision constants locked before reading outcomes.
ALPHA=.05
PRACTICAL_LIFT=.01
HARM_MARGIN=.01
SRM_ALPHA=.001

def compare(success_t, n_t, success_c, n_c):
    if min(n_t,n_c)<=0: raise ValueError("Both arms require observations")
    pt,pc=success_t/n_t,success_c/n_c
    ci=confint_proportions_2indep(success_t,n_t,success_c,n_c,method="newcomb",alpha=ALPHA)
    if success_t+success_c in (0,n_t+n_c):
        p=1.
    else:
        p=float(proportions_ztest([success_t,success_c],[n_t,n_c])[1])
    ratio_ci=confint_proportions_2indep(success_t,n_t,success_c,n_c,compare="ratio",method="log-adjusted",alpha=ALPHA)
    return {"treatment_n":int(n_t),"control_n":int(n_c),"treatment_successes":int(success_t),
        "control_successes":int(success_c),"treatment_rate":pt,"control_rate":pc,
        "difference":pt-pc,"ci_low":float(ci[0]),"ci_high":float(ci[1]),
        "relative_lift":pt/pc-1 if pc else None,
        "relative_lift_ci": [float(ratio_ci[0]-1),float(ratio_ci[1]-1)],"p_value":p}

def validate_and_join(users, events, analysis_at):
    if users.user_id.duplicated().any(): raise ValueError("Duplicate users")
    eligible=users[users.eligible].copy()
    if eligible.variant.isna().any() or not eligible.variant.isin(["control","treatment"]).all():
        raise ValueError("Missing/invalid assignments")
    if users.loc[~users.eligible,"variant"].notna().any(): raise ValueError("Ineligible assignment")
    eligible["assigned_at"]=pd.to_datetime(eligible.assigned_at,utc=True)
    if eligible.assigned_at.isna().any(): raise ValueError("Missing assignment timestamp")
    if eligible[["abandoned_first_session","started_14d","experienced","craft"]].isna().any().any():
        raise ValueError("Missing outcomes or covariates")
    for col in ("abandoned_first_session","started_14d"):
        if not eligible[col].isin([0,1]).all(): raise ValueError("Non-binary outcome")
    if not events.event.eq("project_started").all(): raise ValueError("Unexpected event")
    ev=events.merge(eligible[["user_id","assigned_at"]],on="user_id",how="left",validate="many_to_one")
    ev["occurred_at"]=pd.to_datetime(ev.occurred_at,utc=True)
    if ev.assigned_at.isna().any() or ev.occurred_at.isna().any(): raise ValueError("Orphan/invalid event")
    if ((ev.occurred_at<ev.assigned_at)|(ev.occurred_at>=ev.assigned_at+pd.Timedelta(days=14))).any():
        raise ValueError("Event outside 14-day window")
    derived=eligible.user_id.isin(ev.user_id).astype(int)
    if not np.array_equal(derived,eligible.started_14d.astype(int)):
        raise ValueError("Stored binary disagrees with event-derived outcome")
    eligible["outcome"]=derived
    mature=eligible.assigned_at+pd.Timedelta(days=15)<=analysis_at # 14 days + 1 ingestion day
    return eligible,eligible[mature].copy()

def analyse(users,events,analysis_at):
    eligible,mature=validate_and_join(users,events,analysis_at)
    counts=eligible.variant.value_counts().reindex(["control","treatment"],fill_value=0)
    srm=float(chisquare(counts.to_numpy(),f_exp=[len(eligible)/2]*2).pvalue)
    t=mature[mature.variant=="treatment"];c=mature[mature.variant=="control"]
    primary=compare(int(t.outcome.sum()),len(t),int(c.outcome.sum()),len(c))
    guard=compare(int(t.abandoned_first_session.sum()),len(t),int(c.abandoned_first_session.sum()),len(c))
    mature_all=len(mature)==len(eligible)
    go=(srm>=SRM_ALPHA and mature_all and primary["ci_low"]>0 and primary["difference"]>=PRACTICAL_LIFT and guard["ci_high"]<HARM_MARGIN)
    balance={}
    for field in ("experienced","craft"):
        if field=="experienced": pt=t[field].mean();pc=c[field].mean()
        else: pt=t[field].eq("knitting").mean();pc=c[field].eq("knitting").mean()
        pooled=(pt+pc)/2
        balance[field]={"treatment_fraction":float(pt),"control_fraction":float(pc),
          "standardised_difference":float((pt-pc)/math.sqrt(pooled*(1-pooled))) if 0<pooled<1 else 0.}
    return {"synthetic":True,"candidates":len(users),"ineligible":int((~users.eligible).sum()),
        "assigned":len(eligible),"mature":len(mature),"immature":len(eligible)-len(mature),
        "srm_p":srm,"primary":primary,"abandonment_guardrail":guard,"baseline_balance_exploratory":balance,
        "decision":"meets illustrative criteria" if go else "does not meet illustrative criteria",
        "interpretation":"Simulation only; no evidence of Ravelry feature effectiveness."}

def null_calibration(repetitions=500):
    rng=np.random.default_rng(20261027)
    rejected=0;covered=0
    for _ in range(repetitions):
        a,b=rng.binomial(10000,.12,size=2)
        result=compare(int(a),10000,int(b),10000)
        rejected+=result["p_value"]<.05
        covered+=result["ci_low"]<=0<=result["ci_high"]
    return {"repetitions":repetitions,"seed":20261027,"true_effect":0,
       "false_positive_fraction":rejected/repetitions,"ci_coverage":covered/repetitions,
       "mc_standard_error_at_nominal":math.sqrt(.05*.95/repetitions)}

def planning():
    power=NormalIndPower()
    baseline=(ASSUMPTIONS['baseline']
        + ASSUMPTIONS['experienced_increment']*ASSUMPTIONS['experience_probability']
        + ASSUMPTIONS['crochet_increment']*(1-ASSUMPTIONS['knitting_probability']))
    lift=ASSUMPTIONS['treatment_effect']
    effect=proportion_effectsize(baseline+lift,baseline)
    n=math.ceil(power.solve_power(effect_size=effect,alpha=.05,power=.8,ratio=1,alternative="two-sided"))
    target_effect=power.solve_power(nobs1=10800,alpha=.05,power=.8,ratio=1,alternative="two-sided")
    from scipy.optimize import brentq
    mde=brentq(lambda d:proportion_effectsize(baseline+d,baseline)-target_effect,1e-8,.5)
    return {"assumed_baseline":baseline,"reference_group_baseline":ASSUMPTIONS["baseline"],"assumed_absolute_effect":lift,"alpha":.05,"power":.8,
         "required_per_arm":n,"required_total":2*n,"mde_at_10800_per_arm":mde,
         "method":"Two-sided normal approximation, Cohen h; no attrition/inference across repeated looks"}

def main():
    p=argparse.ArgumentParser();p.add_argument("--data",default="data/synthetic");p.add_argument("--out",default="reports/synthetic");a=p.parse_args()
    out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
    results={}
    for scenario in ("assumed_effect","null"):
        users=pd.read_csv(Path(a.data)/f"{scenario}_users.csv")
        events=pd.read_csv(Path(a.data)/f"{scenario}_events.csv")
        results[scenario]=analyse(users,events,pd.Timestamp("2026-10-20",tz="UTC"))
    results["planning"]=planning();results["null_calibration"]=null_calibration()
    (out/"results.json").write_text(json.dumps(results,indent=2,allow_nan=False))
    fig,ax=plt.subplots(figsize=(8,3.8))
    for i,scenario in enumerate(("assumed_effect","null")):
        v=results[scenario]["primary"]
        ax.errorbar(v["difference"]*100,i,xerr=[[100*(v["difference"]-v["ci_low"])], [100*(v["ci_high"]-v["difference"])]],fmt='o',capsize=4,color='#376b69')
    ax.axvline(0,color='#888888',linestyle='--');ax.axvline(1,color='#be7354',linestyle=':',label='Illustrative practical threshold')
    ax.set_yticks([0,1],['Assumed effect scenario','Null scenario'])
    ax.set_xlabel('Treatment − control (percentage points), 95% Newcombe interval')
    ax.set_title('SYNTHETIC ONLY · Recorded starts within 14 days',loc='left',fontweight='bold')
    ax.set_ylim(-.6,1.6);ax.legend(loc='center right',frameon=False);fig.tight_layout();fig.savefig(out/'effect_intervals.png',dpi=160);plt.close(fig)
    lines=['# Simulated experiment results','', '**SYNTHETIC ONLY. No Ravelry users or events.**','']
    for scenario in ('assumed_effect','null'):
        x=results[scenario];v=x['primary'];g=x['abandonment_guardrail']
        lines += [f"## {scenario.replace('_',' ').title()}", '',
          f"{x['candidates']:,} candidates; {x['ineligible']:,} ineligible; {x['assigned']:,} assigned and {x['mature']:,} mature. SRM p={x['srm_p']:.4f}.",
          f"Control: {v['control_successes']:,}/{v['control_n']:,} ({v['control_rate']:.2%}); treatment: {v['treatment_successes']:,}/{v['treatment_n']:,} ({v['treatment_rate']:.2%}).",
          f"Absolute effect: {v['difference']*100:.2f} percentage points (95% CI {v['ci_low']*100:.2f} to {v['ci_high']*100:.2f}); relative lift {v['relative_lift']:.1%}; p={v['p_value']:.4g}.",
          f"Abandonment difference: {g['difference']*100:.2f} points (95% CI {g['ci_low']*100:.2f} to {g['ci_high']*100:.2f}); harm margin +1 point.",
          f"Decision: **{x['decision']}**. This concerns illustrative criteria, not a launch decision for Ravelry.", '']
    pl=results['planning'];cal=results['null_calibration']
    lines += [f"Planning: assumed {pl['assumed_baseline']:.2%} marginal baseline, +1.5-point effect, 80% power and two-sided 5% alpha require {pl['required_total']:,} total accounts. Approximate MDE at 10,800 per arm: {pl['mde_at_10800_per_arm']*100:.2f} points.", '',
      f"Null calibration: {cal['repetitions']} fixed-seed independent A/A repetitions; rejection fraction {cal['false_positive_fraction']:.1%}, CI coverage {cal['ci_coverage']:.1%}, Monte Carlo SE at nominal 5% = {cal['mc_standard_error_at_nominal']:.3f}. A single null run may be significant by chance.", '',
      'All values derive from results.json. Binary outcomes are cross-checked against events; absence of missing telemetry is an assumption of the generator, not evidence about real instrumentation.']
    (out/'summary.md').write_text('\n'.join(lines)+'\n')
    print('Wrote synthetic results, calibration, planning and interval chart.')

if __name__=="__main__":main()
