# Project status

Updated: 12 November 2026. Main deliverable: an interactive product analytics app, with local-only real catalogue context and a private source repository.

## Direction

The initial version overemphasised a written case study. The user clarified that the centrepiece should be a product metrics app with clearly simulated funnels and retention, and supplied their own article as a tone reference. The app and README now use first-person, product-focused explanations. No other ChatGPT conversations were accessed.

## Completed app

- Six sections: overview, discovery funnel, retention cohorts, experiment, real catalogue context, and definitions/SQL.
- Craft, experience and cohort filters across 27 precomputed metric slices; inspectable definitions and cohort numerators/denominators; downloadable labelled CSV; effect/null scenario switch; responsive layout.
- Separate synthetic product stream: 12,000 fictional accounts, fixed seed 20261112, explicit assumptions, ordered events and intentional transport retry copies. No real behavioural metrics claimed.
- Three new dbt models: event grain/deduplication, discovery-account journeys and distinct active calendar weeks. Mature 14-day outcomes and complete calendar retention windows use different explicit rules.
- The existing independently seeded experiment remains separate. The real catalogue section uses the previous bounded API sample, not simulated event joins.
- A self-contained local HTML app is generated at reports/private/product-metrics.html. When available it includes the ignored real catalogue payload, so it stays untracked. The normal dashboard uses source files plus a safe committed synthetic aggregate JSON.
- README rewritten around questions, interpretation, app exploration and how the SQL supports the analysis. Desktop app screenshot is included.

## Validation

- 28 Python tests pass, including known-journey metric fixtures.
- New product dbt: three models, 17 data tests, no errors/warnings. Existing catalogue dbt: six models, 23 tests, no errors; one missingness-warning test flags two fields.
- Fresh reproduction without credentials or real data: make app-data test succeeds; exported synthetic app JSON matches byte-for-byte; 27 slice funnels reconcile.
- Browser interactions verified across all sections, including filters, missing maturity, retention cells, null experiment, catalogue segmentation, SQL selector and downloaded CSV. Desktop and mobile layouts inspected; no document overflow at 390 pixels.
- Portable payloads reconcile, but direct file-protocol navigation is blocked by the in-app browser policy, so direct-file browser QA is not claimed.

## Data handling

User authorised personal/private analysis and the private repo. Credentials came from a replacement/new app and remain in ignored .env. Real records, databases, real app payload and derived portable HTML are local and ignored; the repository includes code, documentation, a synthetic-only screenshot and labelled synthetic aggregates. No extra API collection occurred during the app revision. The agreement constraints and future publication questions remain in docs/data_feasibility.md. Include derived app copies in retention/deletion reviews.

## Repository

https://github.com/stephanieboyle/ravelry-discovery-portfolio — private. The revision includes the app, rewritten README, synthetic export and supporting models/tests. Secret/data scans passed; real derived payloads and credentials are excluded.

## Next product evidence

Review the real discovery flow, observe makers choosing projects, speak to designers, validate the recording proxy, and establish actual internal baselines. Simulated craft differences, funnels, retention and experiments do not establish Ravelry behaviour or feature effectiveness. These are proposed research/experiment steps, not missing software implementation.
