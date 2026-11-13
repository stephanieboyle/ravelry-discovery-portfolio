# Designer attention: synthetic guardrail protocol

This is an extension of the experiment demonstration, not Ravelry impression data. The existing primary/abandonment decision remains unchanged. This protocol fixes new assumptions before generating or inspecting this guardrail's output; it is an added sensitivity analysis, not a claim that the original experiment pre-registered every criterion.

Use the same fixed user assignments as the separate synthetic experiment. Generate a fictional pre-period with 100 designers: ten have 900 impressions each and ninety have 100 each. This defines a fixed pre-period top decile, not a ranking derived from the treatment period. The simulated pre-period is constructed independently, not inferred from any Ravelry snapshot.

Seed 20261113 generates a 90% chance of any qualifying impressions per assigned account, then 1 + Poisson(8) impressions, capped at 20. Impressions have timestamps within the account's 14-day follow-up. All generated impressions qualify by construction; this does not validate real visibility tracking. No impression data are joined to the real catalogue.

Two explicit exposure assumptions share the same users, impression volumes, times and random uniforms:

- Neutral: both arms allocate 50% of impressions to the fixed top-decile designers.
- Concentration stress: control remains 50%; treatment allocates 58% to that group.

These percentages are sensitivity assumptions, not estimates or effects learned from Ravelry. Primary/abandonment outcomes are not changed by selecting an attention assumption. There is no simulated causal coupling between attention and starts or supply response.

Primary attention guardrail: top-decile impression share in treatment minus control. Its unit is an impression share; inference resamples assigned accounts, including accounts with zero impressions. A fixed-seed (20261114), 500-replicate account-cluster percentile bootstrap produces the 95% difference interval. This preserves within-account event dependence and the impression-weighted ratio. It does not model shared designer feedback or market-level interference. Real designs need adequate clusters, market checks and justified margins.

Illustrative harm margin: +3 percentage points. An upper 95% bound below +3 points clears this attention check; a lower bound above +3 points signals material harm; overlap is inconclusive. Non-significance is not evidence of safety. Fix this margin before the new guardrail output; do not alter it to match a preferred result. Report no-exposure counts, impression counts and denominator coverage. Designer coverage and HHI are descriptive secondary diagnostics; no naïve impression-level significance tests are used.

The extended review requires the original illustrative primary/abandonment checks and the new attention check. It is not a full launch gate: experience quality, real telemetry, relevance and user research remain unresolved. Neither scenario supplies evidence that a feature works or that network effects have been empirically measured.

Each synthetic impression is allocated directly to one fictional designer. A real implementation would need pattern-level impression identity and a documented attribution rule for multiple credited designers. The direct allocation here is a simplification, not evidence that the real catalogue has only one designer per pattern.
