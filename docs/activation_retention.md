# Activation and later retention

This analysis uses the fictional behavioural stream only. Its question is whether accounts recording a start within 14 days also return to discovery in week four. It is an observational association, not an estimate of the effect of inducing a start.

Activation is fixed at day 14 after first discovery. Return is measured in calendar week four after the first-discovery cohort week. This window begins after every account's activation landmark; no return event can retrospectively define activation. Include only cohorts whose entire week-four window is observable, and require mature activation. The mart preserves null outcomes for ineligible observations. Both groups are drawn from the same mature cohort frame, including people without subsequent events; zero return means no qualifying event in a complete window.

The raw comparison is the difference in week-four return proportions between starters and non-starters. Each account is counted once. The SQL mart has one row per discovery account and is joined one-to-one to the filtered discovery population.

A composition check directly standardises to the pooled craft × experience distribution. Include only strata represented in both activation groups. Each group's stratum-specific return rate is multiplied by the same pooled stratum weight, then summed. Report common-support account coverage and stratum counts; do not pretend excluded strata have a valid counterfactual rate. Empty or unsupported comparisons remain null.

Standardisation adjusts only these observed pre-discovery fields. The generator includes latent intent, and starting is a post-discovery behaviour. Motivation, suitability and other selection differences remain possible explanations. The standardised difference is not a causal treatment effect. No empirical claim about Ravelry users is made and subgroup significance is not used to promote a finding.

Numerators, denominators, raw rates, standardised rates, gaps and coverage are exported with each of the 27 filter slices. SQL quality tests check grain, relationships and observable-versus-unknown outcomes. A hand-authored journey fixture checks that a late cohort is excluded, a starter return is counted once, a non-return is zero only with full follow-up, and unsupported strata are reported.
