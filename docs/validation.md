# Validation

The finished project is checked using both the local private API snapshot and an independent source-only reproduction tree without credentials or real data. Exact final results are recorded in PROJECT_STATUS.md.

## Real pipeline

Two-stage collection: inspect five before expanding to a bounded 50-pattern snapshot. The final dbt build uses dbt-core 1.11.17 and dbt-duckdb 1.10.1, with six models and 23 tests. Blocking uniqueness, required-field, relationship, range, grain and date checks pass. One missingness warning reports unknown rating/difficulty counts; it is intentional and reflected in the analysis, not suppressed. Source and export grains reconcile. Figures were visually inspected for titles, axes, labels and real/synthetic distinctions.

## Synthetic workflow

Fixed seed and constants generate effect and null users/events separately from API data. Analysis validates eligibility, one assignment per user, event linkage/windows, binary outcomes, complete mature follow-up and stored-versus-event-derived agreement. It reports SRM, exploratory pretreatment balance, planning, absolute/relative effects, intervals, guardrail precision and locked illustrative decisions. A fixed 500-repetition A/A check verifies approximate false-positive behaviour/coverage. Results are generated rather than hand-entered; README numbers match results.json.

## Python and failure cases

Tests cover transient HTTP retries, Retry-After, long waits, terminal authentication/redirect errors, network retry budgets, endpoint allowlisting, field minimisation, null-versus-zero handling, multi-page collection, duplicate grains, explicit refresh, missing-detail atomic failure, deterministic generation, known statistical effects, interval symmetry, complete/immature windows, duplicate users, missing outcomes, invalid events, event/outcome discrepancies, repeated-event user counting, null calibration and sample-size scale.

A clean source-only reproduction uses requirements.lock, editable package installation and make offline. It does not require Ravelry credentials or a catalogue database. Hash comparisons verify synthetic CSV/results reproducibility. A live fresh collection can differ because the catalogue and default search order change; exact reproduction of the retained real results requires the private retained snapshot.

## Repository checks

Before commit: verify .env, local databases, data/synthetic event files, caches, dbt targets/logs and reports/private are ignored. Compare every staged file against locally configured secret values without printing them. Search staged text for credential formats and absolute editable-install paths. Only code, docs, placeholder configuration, tests and labelled synthetic aggregate outputs belong in the remote. Verify GitHub repository visibility remains private after creation.

These checks do not establish real-world telemetry correctness, API availability under all conditions, randomisation integrity on a deployed product, or legal permission to publish API-derived output. Existing UI audit, user research and real experiment remain proposed next work.

## Interactive app revision

The main deliverable is now the product metrics app, as requested by the user, with tone guided by their supplied article.

- Python: 28 tests pass, including hand-authored journeys that verify exact mature-denominator, optional-saving, week-four retention, deduplication, empty-slice and generator behaviour.
- New synthetic product dbt pipeline: three models and 17 tests, all pass with no warnings. The original catalogue pipeline retains its documented missingness warning.
- Fresh credential-free reproduction: make app-data test succeeds, with no catalogue DB or .env. The resulting 27-slice aggregate JSON is byte-for-byte identical to the main checkout. All funnel counts reconcile.
- Browser checks: all six sections, craft/experience/cohort filters, a retention-cell denominator, unobservable week-four outcomes, effect/null switching, real-catalogue craft filter, SQL model selector and CSV download. CSV schema and source labels match the export. Desktop and narrow-screen layouts checked; document width stays within a 390-pixel viewport, with the cohort table scrolling inside its panel.
- Portable HTML: embedded JSON matches the app export; CSS and scripts are self-contained. Direct file-protocol navigation cannot be tested in Codex's browser because its URL policy permits HTTP/HTTPS only. It is supplied as a local browser-openable deliverable, without claiming that direct-file browser QA passed.
- App overview screenshot contains only explicitly simulated data. Real catalogue payload and portable HTML embedding it remain ignored by Git. No additional live API requests were needed for this revision.
