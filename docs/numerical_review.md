# Numerical and narrative review

The review checks consistency within an explicitly simulated case study, not accuracy against Ravelry behaviour.

- Funnel stages share the mature 14-day discovery denominator and preserve event order. Saving is optional before starting.
- Retention uses complete calendar-week windows. Incomplete cells are unobserved, not zero.
- The day-14 landmark fixes activation before subsequent W4 measurement. Starter retention is 413/1,290 (32.02%); non-starter retention is 1,603/6,405 (25.03%). The crude gap is 6.99 percentage points; craft/experience standardisation gives 6.26 points. This is an association under simulated intent, not an activation treatment effect.
- Experiment populations are separate from dashboard filters. Control is 1,405/10,838 and assumed-effect treatment is 1,590/10,819. The 1.73-point difference has a 0.81–2.65-point interval. The null result remains inconclusive.
- Power planning was corrected from the 12% reference-group baseline to the 13.05% expected marginal baseline. Required total is 16,588; approximate MDE at 10,800 per arm is 1.31 points. The correction does not change assignments, outcomes or decision thresholds. The A/A calibration remains a separate 12% reference-case check.
- Designer attention uses a separately fictional designer frame. A +3-point harm margin is checked against user-bootstrap intervals. Neutral and concentration-stress scenarios illustrate why a positive primary result can still be held.
- Opportunity sizing is 4,703 eligible fictional accounts × coverage × assumed absolute lift. At 75% coverage and +1.5 points this is about 53 additional recorded starts. It is not a forecast or a measured segment effect.
- Real catalogue records and outputs remain local. The bounded cowl sample cannot establish site-wide popularity, impressions, conversion or retention.

Validation: 37 Python tests, four product dbt models and 23 dbt checks; reproducible source-only build. The app reports percentage points for absolute differences and percent for relative changes.
