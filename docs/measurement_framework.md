# Measurement framework — proposed internal experiment

These are hypothetical internal metrics, not verified public API capabilities. Thresholds and baseline rates need research and internal historical data before a real test.

## Population and primary outcome

Eligibility: authenticated adult accounts visiting the relevant discovery surface with a supported craft and permission to participate; exclude staff/test/bot accounts using rules fixed before assignment. Assign once, immediately before the first eligible discovery response. Persist assignment at account level. Anonymous visitors are outside the initial experiment; this limits generalisability.

Primary: percentage of assigned eligible accounts with at least one newly recorded in-progress project linked to a pattern in the interval [assignment, assignment + 14 days). Count each account once, regardless of impressions or number of projects. Include all assigned eligible accounts in the denominator, including those who never see the feature; use only cohorts whose full 14-day window plus a predeclared ingestion allowance has elapsed. Do not exclude later inactivity. A saved pattern or backfilled historical start is not a qualifying start. Use server recording time and the recorded current state; deduplicate by project ID. Pattern starts outside the recommendation list still count, to capture substitution.

This is recording behaviour, not proof of actual making. Equal recording affordances across arms, voluntary follow-up research and existing recording-history segments can help assess this limitation. Do not retrospectively redefine the primary metric based on results.

## Supporting metrics and guardrails

| Metric | Unit and denominator | Window and definition |
|---|---|---|
| Any pattern open (supporting) | Assigned account; all assigned accounts | At least one detail open within 14 days |
| Any save (supporting) | Assigned account; all assigned accounts | At least one newly saved pattern within 14 days |
| First-session abandonment (guardrail) | Assigned account; all assigned accounts | First eligible discovery session ends without a pattern open/save/start; session ends after 30 minutes of inactivity; all sessions must mature |
| Experience quality (guardrail) | Responding account; report invited and responding counts separately | One standard satisfaction prompt within 14 days; report response rate by arm and score distribution; response selection prevents a clean all-user causal claim |
| Designer exposure concentration (guardrail) | Share of qualifying pattern impressions | Over mature cohorts' 14-day windows; fixed pre-period top-decile designer set, plus HHI across designer impression shares |
| Catalogue popularity concentration (guardrail) | Share of qualifying pattern impressions | Same window; fixed pre-period top-decile pattern set ranked by recorded projects; include unknown baseline status separately |

For abandonment, an assigned account with no functioning session telemetry is unknown, not automatically an abandonment. Missingness is reported by arm and must be resolved before the decision. Also report technical error rate per assigned account. Predeclare material harm margins with product owners using baseline variability and the economic/user cost of harm.

Exposure shares require stable designer attribution. For co-designed patterns split each impression equally across credited designers; include an unknown-designer bucket and report its share. Freeze the eligible designer universe before the test. HHI = sum of squared impression shares; report catalogue coverage and impressions alongside it. These are aggregate ecosystem outcomes with dependence across users; do not apply independent-user binomial confidence intervals to impression rows. Use account-cluster bootstrap for descriptive arm differences, and discuss shared supply/spillovers.

## Public data boundary

No API field is verified yet. Catalogue attributes and snapshot totals, if accessible, may support descriptive segmentation. They cannot reconstruct eligible users, assignment, true impressions, starts after assignment, abandonment or confidence. Internal metrics require the tracking plan and reliable joins. Pre-period popularity requires a genuine earlier snapshot, never a reconstruction from present totals.

## Future decision rule

Before generating simulated outcomes, lock an assumed baseline, meaningful absolute lift, power, sample size and guardrail margin. For a real experiment, agree these using actual baselines and costs. An illustrative launch criterion is a primary confidence interval excluding zero, a point estimate meeting the agreed practical threshold, no guardrail harm beyond agreed margins, and valid telemetry. A non-significant guardrail result does not establish safety; evaluate its interval against the harm margin. Inconclusive evidence means extend only under a preplanned design or revise and retest, not declare success.
