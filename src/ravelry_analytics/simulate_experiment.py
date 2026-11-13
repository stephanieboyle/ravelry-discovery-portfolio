"""Synthetic only. Fixed assumptions, no significance-seeking seed selection."""
import argparse
import json
from pathlib import Path
import numpy as np
import pandas as pd

SEED = 20261026
ASSUMPTIONS = {"seed": SEED, "candidates": 24000, "eligibility_probability": .9,
    "allocation": .5, "experience_probability": .45, "knitting_probability": .7, "baseline": .12, "experienced_increment": .03,
    "crochet_increment": -.01, "treatment_effect": .015,
    "abandonment_baseline": .28, "abandonment_treatment_effect": -.005,
    "practical_lift": .01, "abandonment_harm_margin": .01,
    "alpha": .05, "srm_alpha": .001, "followup_days": 14,
    "analysis_at": "2026-10-20T00:00:00Z", "synthetic": True}

def generate(scenario="assumed_effect", seed=SEED, candidates=24000):
    rng = np.random.default_rng(seed)
    n = candidates
    eligible = rng.random(n) < .9
    variant = np.where(eligible, np.where(rng.random(n)<.5, "treatment", "control"), "")
    experienced = rng.random(n)<ASSUMPTIONS["experience_probability"]
    craft = np.where(rng.random(n)<ASSUMPTIONS["knitting_probability"], "knitting", "crochet")
    assigned = pd.Series(pd.Timestamp("2026-09-01",tz="UTC") + pd.to_timedelta(rng.integers(0,14*86400,n),unit="s"))
    assigned.loc[~eligible] = pd.NaT
    delta = .015 if scenario == "assumed_effect" else 0.
    probability = .12 + .03*experienced - .01*(craft=="crochet") + delta*(variant=="treatment")
    started = eligible & (rng.random(n)<probability)
    abandoned = eligible & (rng.random(n)<(.28 - .005*(variant=="treatment") if scenario=="assumed_effect" else np.full(n,.28)))
    users = pd.DataFrame({"user_id": np.arange(n), "eligible": eligible, "variant": variant,
        "assigned_at": assigned, "experienced": experienced, "craft": craft,
        "abandoned_first_session": np.where(eligible, abandoned.astype(float), np.nan)})
    events = pd.DataFrame({"user_id": users.loc[started,"user_id"].to_numpy(), "event": "project_started",
        "occurred_at": pd.DatetimeIndex(assigned.loc[started]) + pd.to_timedelta(rng.integers(1,14*86400,int(started.sum())),unit="s")})
    # Binary outcome is derived from the same events, not independently generated.
    users["started_14d"] = users.user_id.isin(events.user_id).astype(int)
    users.loc[~eligible,"started_14d"] = pd.NA
    return users, events

def main():
    p=argparse.ArgumentParser();p.add_argument("--out",default="data/synthetic");args=p.parse_args()
    out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
    (out/"assumptions.json").write_text(json.dumps(ASSUMPTIONS,indent=2))
    for scenario in ("assumed_effect", "null"):
        users,events=generate(scenario)
        users.to_csv(out/f"{scenario}_users.csv",index=False)
        events.to_csv(out/f"{scenario}_events.csv",index=False)
    print("Generated separately labelled synthetic effect and null scenarios with fixed seed.")

if __name__=="__main__": main()
