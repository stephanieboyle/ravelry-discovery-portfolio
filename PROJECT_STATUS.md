# Project status

Updated: 13 November 2026. **Count Your Stitches** is a publicly hosted product metrics app, backed by a source repository and reproducible Python/SQL/dbt analysis.

## Product and presentation decisions

- Main question: help makers choose patterns they feel confident starting while supporting designers.
- User selected simulated product funnels/retention as the main experience, with real Ravelry catalogue context separate. No other ChatGPT conversations were accessed; the user's writing sample informed the README.
- Report-style app copy, three overview metrics (discovery activity, recorded starts, week-four retention), visual charts, no pies, and a preserved analysis summary.
- Knitting identity, a knitting-needle divider, and “Stephanie Boyle · Product analytics” without the sb monogram.

## Completed analysis

- Bounded real API feasibility probe then separate 50-pattern cowl sample. Read-only app access verified. Six catalogue dbt models; no impressions, conversion or causal claims inferred from public totals.
- Fictional product stream: 12,000 accounts, fixed seed and explicit assumptions. Four product dbt models cover deduplicated events, discovery journeys, active weeks and activation-to-retention association.
- Retention analysis fixes activation at day 14 before week four. Raw and craft/experience-standardised gaps are reported with common-support coverage, never as causal effects.
- Original independent synthetic effect/null experiment retains its primary/abandonment outputs and fixed rules.
- New designer-attention extension has neutral/stress assumptions, a fictional pre-period top-designer group, and account-cluster bootstrap intervals. It is a later sensitivity, not retroactive original pre-registration or evidence of network effects.
- Product-decision page adds a proposed research target, assumption-based impact sizing and explicit criteria. It does not claim an empirical segment treatment effect or recommend real rollout from simulated results.

## Validation

- 38 Python tests pass, including hand-constructed retention, exposure, clustering, orphan/window, reproducibility and sizing checks.
- Product dbt: four models and 23 tests pass. Original catalogue build: six models, 23 tests, no errors; its one missingness-warning test remains documented.
- Browser checks confirm activation-retention values, stress-triggered hold, impact controls and divider rendering. Fresh source-only full rebuild passes without credentials or real catalogue data. The app export, attention intervals and original experiment results match the main checkout; all 27 retention group totals reconcile. Final source-control checks exclude private data.

## Data and repository

Public repository: https://github.com/stephanieboyle/ravelry-discovery-portfolio

Credentials, local databases, generated event/impression CSVs, real catalogue payloads and real-data portable HTML remain ignored. Only source, documentation, labelled synthetic aggregates and synthetic-only screenshots are tracked. No new real API requests were made for these extensions. The supplied API agreement's constraints remain recorded; private use does not confer publication permission. Include derived app copies in retention/deletion reviews.

## Next evidence outside this portfolio demonstration

Audit the current discovery flow; observe makers and speak to designers; validate the recording proxy and actual metadata/telemetry; establish real baselines and harm margins; assess shared-market interference before choosing a real experiment. These are research/deployment steps, not invented results.

## Numerical publication review

Explicit UTC weeks and 336-hour maturity windows remove machine-timezone and daylight-saving ambiguity. Independent source-event reconciliation passes all 27 slices and 2,268 retention cells; see docs/validation.md and reports/synthetic/numerical_audit.json. Public hosting contains only simulated aggregates.

Live app: https://count-your-stitches.pages.dev — free static Cloudflare Pages hosting, with an explicit public-file allowlist and no private catalogue payload. See docs/hosting.md for updates.
