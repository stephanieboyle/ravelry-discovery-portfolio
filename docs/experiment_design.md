# Synthetic experiment protocol

**Synthetic demonstration only.** No Ravelry behaviour is simulated as an observed fact. Constants are fixed in source before outcome generation; the seed was not searched for significance. The two scenarios share assignment/covariate draws to isolate the assumed treatment effect, so they are not independent experiments.

## Population and assumptions

The fixed seed is 20261026. Generate 24,000 candidate accounts; independent eligibility probability 90%. Every eligible account is assigned once with independent 50/50 user-level randomisation. Pretreatment fields are craft and prior experience. Baseline start probability is assumed 12%, plus 3 points for experienced makers and minus 1 point for crochet. These differences are illustrative assumptions, not claims about crafts. The assumed-effect scenario adds 1.5 points for treatment; the null scenario adds zero.

Assignments occur during a fixed two-week September 2026 interval. Outcome events occur within 14 days; a fixed 20 October 2026 analysis date makes all windows mature, including one ingestion day. The binary start outcome is independently validated against the generated event table. Missing events are not assumed measurable in real life: in this simulation the generator guarantees complete logging, and corruption checks fail on discrepancies.

First-session abandonment is the one simulated guardrail: assumed baseline 28% and treatment difference −0.5 points in the effect scenario; no difference in the null scenario. These assumptions are not tuned to make the guardrail pass. Synthetic outcomes have no pattern-level supply dynamics. Designer concentration and quality remain proposed internal guardrails rather than fabricated measurements.

## Estimand, inference and locked illustrative decision

One account is the randomisation and analysis unit. Intention to treat includes every assigned eligible account with mature follow-up; no conditioning on clicks/exposure. Repeated events collapse to one binary user outcome. Eligibility exclusions precede assignment. Report all candidates, eligible/assigned, mature and immature counts, plus missing-data failures.

One primary outcome, two-sided 5% alpha. Report treatment-minus-control risk difference and a 95% Newcombe interval, pooled two-proportion z-test, relative lift and an adjusted log risk-ratio interval. The methods differ slightly in finite samples; do not treat a borderline p-value and interval as interchangeable decisions. Relative effects are undefined at zero control risk; absolute results remain available. Planning uses statsmodels NormalIndPower with Cohen's h, assumed 12% baseline, +1.5 points and 80% power. This is an approximation; real planning must allow for measured baseline, telemetry loss and interference.

Illustrative proceed rule: no SRM flag at p < .001; all assignment windows mature; primary lower CI > 0 and point estimate at least +1 percentage point; abandonment upper 95% CI below +1 point. Incomplete telemetry blocks analysis. A positive primary estimate smaller than the practical threshold is insufficient. A non-significant guardrail alone does not establish safety. The simulation decision covers only the implemented criteria, not a real launch recommendation.

SRM uses Pearson chi-square against expected 50/50 allocation on all assignments. Observed pretreatment balance uses standardised differences and is exploratory. Neither passing SRM nor observed balance proves correct assignment or logging. Also inspect eligibility timestamps, stable assignments, implementation version and cross-device contamination in a real deployment.

The fixed null scenario is accompanied by 500 independent binomial A/A repetitions at a second fixed seed (20261027), checking approximate rejection rate and confidence interval coverage. A single null scenario can produce a false positive. See generated results.json for actual outcomes; do not change assumptions based on them.

## Peeking, multiplicity and marketplace judgement

Use one planned mature-cohort analysis. Repeatedly reading fixed-horizon p-values inflates false positives; a sequential design would need explicit spending or always-valid inference and different planning. Secondary craft/experience summaries and guardrails are not additional primary success claims. Correlated safety outcomes need predefined joint decision rules and sufficient precision; exploratory subgroup differences need interaction tests and multiplicity-aware follow-up.

User-level randomisation is reasonable for a limited interface change if supply is effectively non-rival and cross-arm feedback is weak over the test. Patterns are reusable, but designer attention, reviews and ranking feedback are shared: one arm may change the environment of the other. User-level ITT then measures effects under that mixed allocation, not necessarily full rollout equilibrium.

A cluster design by a credible low-overlap craft/community could reduce contamination but risks cross-cluster users, imbalance, fewer independent units and a design-effect penalty. A switchback could expose the whole market to one policy per time block, but requires washout, enough independent blocks, comparable time trends and limited carry-over; craft projects can create long lags. Neither is automatically preferable. Validate the interference mechanism and timing before choosing. The simulation does not estimate network effects or establish any real marketplace outcome.

References: statsmodels [two-proportion intervals](https://www.statsmodels.org/stable/generated/statsmodels.stats.proportion.confint_proportions_2indep.html) and [power solver](https://www.statsmodels.org/stable/generated/statsmodels.stats.power.NormalIndPower.solve_power.html). Installed package versions are locked for reproducibility.
