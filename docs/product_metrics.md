# Product metrics app: definitions and analytical choices

## Purpose and data boundary

The app is the main portfolio deliverable. The user chose a product metrics experience with clearly simulated funnels and retention, and supplied a writing sample to guide the first-person narrative. It demonstrates product reasoning through a working interface, backed by events, SQL and tests.

The behavioural generator is separate from the existing experiment generator and from the real catalogue database. It generates 12,000 fictional accounts with craft and pretreatment experience, and events between 6 July and 26 October 2026 (exclusive). Seed: 20261112. Signup is not the discovery cohort: accounts without discovery events are excluded from discovery metrics. Later realisation of an outcome never retrospectively changes cohort eligibility.

Generation assumptions are saved in demo_metadata and exposed in dashboard/data.json. Initial discovery probability, opens, optional saves, initial recorded starts, subsequent weekly returns and start probabilities are illustrative. A latent-intent variable creates selection and behavioural correlations. This makes the data useful for analytical demonstrations, not estimates of any Ravelry population. Some initial starts fall after the 14-day window; immature outcomes exist even when an early event has already been observed. Telemetry is complete by construction. Deliberate transport duplicates share event_id.

## Exact metrics

| Metric | Numerator | Denominator and window |
|---|---|---|
| Discovery accounts | Distinct account IDs with first discovery_viewed in selected cohorts | Count, not a rate. Filters use craft, experience and first-discovery calendar week. |
| Recorded-start rate | Mature accounts with a project_started after an open and before first discovery + 14 days | All selected discovery accounts whose full 14-day window ends by the fixed as-of date. Across sessions and any pattern. |
| Pattern-open step | Mature accounts with at least one detail open after first discovery and within 14 days | Same mature accounts as the start rate; repeated opens count once. |
| Optional save | Mature accounts with a save after an open within 14 days | Same denominator. Saving is not a prerequisite for a start. |
| Start without prior save | Starters whose first qualifying save is absent or later than first start | Starts within 14 days among mature accounts. |
| Median time to recorded start | Days from first discovery to first recorded start, among mature 14-day starters | Median conditional on starting; never a median for all accounts. |
| Weekly discovery activity | Selected discovery accounts with at least one qualifying event in a calendar week | Distinct account count; includes new and returning accounts. |
| Week-k retention | Selected accounts with a qualifying event in calendar week k after the cohort week | All accounts in selected cohorts whose full week k has elapsed. Monday–Sunday weeks. |

Qualifying return events are discovery_viewed, pattern_opened, pattern_saved and project_started. This is discovery retention, not a claim that people make a project each week or that a visit proves value. W0 is 100% because cohort entry is a discovery event. Incomplete cells have null numerator/rate, not zero. The week-four overview is weighted by account counts, not a mean of cohort percentages. An aggregate curve can have different eligible cohorts for each week; the heatmap exposes that composition.

The start window is [first discovery, first discovery + 14 days). As-of is 26 October 2026 00:00 UTC. Its maturity rule differs from calendar retention, where cohort Monday + (k + 1) complete weeks must be at or before as-of. The separate experiment uses assignment, not discovery, as its denominator/time origin and includes a one-day ingestion allowance. The product demonstration assumes events are available at the fixed cutoff; production would need its own latency allowance. Its filters do not change experiment results or the independently sampled catalogue.

## Models and lineage

`simulate_product.py` → separate `data/product_demo.duckdb` source tables → `dbt_product` → `export_dashboard.py` → 27 synthetic aggregate slices in dashboard/data.json → buildless local HTML/CSS/JavaScript app.

| Model | Grain and key choice |
|---|---|
| fct_product_events | One event_id. Earliest receipt wins for transport retries. |
| dim_discovery_users | One discovery account. First discovery anchors the cohort, later events establish ordered steps, maturity and outcomes. |
| fct_discovery_weeks | One discovery account × active calendar week. Repeated events cannot inflate retention. |

A small separate dbt project keeps behavioural demo sources and the real catalogue pipeline in different databases. This avoids accidentally treating simulated activity as real catalogue behaviour. SQL grain, relationship, timestamp, accepted-event and journey-order tests run on the synthetic project. A hand-constructed event fixture independently checks exact numerator/denominator behaviour, save-after-start, event deduplication, empty selections and immature windows.

## Interpretation and product decisions

Funnel exits are prompts for investigation. They can represent friction, a completed information search, a pause to check materials, or something else. Craft differences are exploratory associations under the generator, not causal effects. No confidence intervals around simulated subgroup rates are used to sell an empirical claim about Ravelry.

The experiment page uses the existing independent effect and null simulations, keeping fixed planning and guardrail criteria. It makes no prediction from the product-demo funnel baseline. Concentration, exposure quality and maker experience need further instrumentation/research before a real launch. The real catalogue page has its own scope and filters; it does not provide impressions or conversions.

## Interface and reproduction

The app has accessible navigation, native select filters, metric definitions, inspectable retention cells, downloadable aggregate CSV, experiment scenario selection, and actual model SQL. It uses local assets with no analytics trackers, external fonts or Ravelry credentials in the browser. Narrow layouts stack panels and keep the cohort table horizontally scrollable. Real catalogue payloads and portable HTML containing those payloads are ignored by Git.

`make app` previews the committed synthetic export. `make app-data` rebuilds the entire synthetic app pipeline and a portable local HTML deliverable. Its embedded datasets allow that HTML to work offline. A local real snapshot adds a separately labelled real section; it is not needed for a clone to demonstrate product metrics.

## Product-report presentation

The overview reports three primary measures: latest complete-week discovery activity, mature 14-day recorded-start rate, and observable week-four discovery retention. Latest-week activity compares the same selected cohort population with the preceding complete week; it is not Ravelry-wide active users. New versus returning accounts and median time among starters are supporting measures. The analysis summary reports the open-to-start progression and proposes follow-up research without a causal claim. App language uses product-report labels; personal narrative is kept in the README. The knitting visual identity uses local vector assets rather than Ravelry branding.

## Visualisations

Count Your Stitches uses funnel stage-boundary widths proportional to distinct mature-account counts, with labelled counts and shares of entrants; polygon area is not an additional metric. New/returning columns reconcile to weekly active discovery accounts. Craft bars divide recorded starts by the same mature-account denominators. The start-path bar divides recorded starters into save-before-start and no-prior-save groups. Retention checkpoint bars use complete-window numerators/denominators separately for weeks 1, 4 and 8. Missing horizons remain unobserved. No pie charts are used. The original overview analysis summary remains visible; supporting metric detail is collapsed.

## Activation, attention and product-decision extension

The `mart_activation_retention` model adds a day-14 landmark and a later week-four outcome. The app reports raw starter/non-starter return rates and a craft × experience standardisation with common-support coverage; see [activation_retention.md](activation_retention.md). This is an observational association and cannot establish that starting causes return.

The experiment now also loads a separate, explicitly fictional pre-period/exposure sensitivity on the existing experiment assignments. Its confidence interval resamples account clusters, not independent impressions. The concentration-stress case can put an otherwise positive primary result on hold. The original two-outcome result JSON remains unchanged; the extended review is explicitly separate. See [designer_attention.md](designer_attention.md).

The product-decision page uses a fixed new-to-craft planning cohort, twelve coverage/lift scenarios, and explicit criteria. It is not a traffic forecast, confidence interval or segment treatment estimate; see [product_decision.md](product_decision.md). The overview retains three headline metrics and the existing analysis summary. The decorative stitch row has been replaced by a self-contained knitting-needle divider.
