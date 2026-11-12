# Catalogue methodology and data model

## Scope and sample

A five-pattern feasibility probe succeeded before a separate bounded 50-pattern collection. Both used the documented `query=cowl`, pages of five and API default search ordering. Only the latest complete run is modelled. The second run is not treated as a historical panel. The default order is unspecified; results can shift between pages; pagination is not random sampling. The study concerns returned records, not the Ravelry population or all cowl patterns.

Collection ends at its configured limit or documented final page. Duplicate IDs across pages are not re-added; an entirely repeated page stops the run. A missing detail causes atomic failure instead of an incomplete successful snapshot. Each retained record includes extraction time and snapshot ID; collection_runs retains safe parameters, paginator, request counts and a local deletion-review date. No raw response bodies are cached: raw_patterns is a minimised source layer, despite its name. Existing stored runs are reused unless refresh is explicit. ETag behaviour is documented by Ravelry but not needed for these one-off snapshot requests; no indefinite automatic caching.

## Grains and joins

| Table | Grain | Purpose |
|---|---|---|
| raw_patterns | Snapshot × pattern ID | Minimized JSON plus provenance key; primary key prevents duplicate insertions |
| collection_runs | Snapshot ID | Complete-run manifest and provenance |
| stg_patterns | Pattern in latest complete snapshot | Typed fields, raw averages and date parsing |
| stg_designers / dim_designers | Observed embedded designer ID in latest snapshot | Identifier-only dimension; no authenticated profile access |
| dim_patterns | Latest-snapshot pattern ID | Evidence-aware averages and publication age |
| bridge_pattern_categories | Pattern × category ID | Multi-valued classification; non-additive category membership |
| pattern_discovery | Latest-snapshot pattern ID | Categories aggregated before join; pattern activity not multiplied |

Rating/difficulty averages retain their source values in raw columns. Analysis-ready averages require positive known counts. Missing fields and explicit nulls are not replaced with zero; count-field-presence indicators retain that distinction for the rating/difficulty fields. Publication parsing uses the observed `YYYY/MM/DD` format and retains the original string. Published, first-availability estimate and record creation are different concepts; only displayed publication date is used for the age plot. Future dates are omitted from age analyses and counted, not silently changed. Invalid non-null dates fail a test.

The API's embedded pattern-author object is singular in the observed payloads. The analysis uses that identifier, not a claim of exhaustive co-designer attribution. A broader scope would need to check co-designer representation. Full designer details require authenticated access and are not collected.

## Analytical choices

Four questions are implemented in analyse_catalogue.py: sample activity concentration; age/craft composition; rating evidence availability; and feasibility of qualitative opportunity review. Cumulative shares avoid treating projects as an exposure measure. Top-decile shares use ceiling of 10% of sample entities and rank within this snapshot only. Activity totals are not distinct users. Category membership counts can overlap and must not be summed as a disjoint partition.

The age scatter uses a symlog activity axis to retain zero counts and show large totals; it is not an adjusted causal model. Craft results are descriptive with no representative standard errors. Rating-count thresholds of 5/10/20 test sensitivity of evidence coverage, not an objective quality score. Without a verified scale/distribution, rating variance and a defensible prior, do not apply arbitrary shrinkage or create a score labelled truth. Absence of impressions prevents a low-exposure or conversion analysis. No project/favourite conversion rate or historical growth series is produced.

## Checks

Built-in dbt uniqueness, null and relationship checks plus custom checks cover count/material ranges, category grain, required activity/author coverage, date parsing and join integrity. Missing rating/difficulty counts above half the sample deliberately warn; the finding is preserved rather than imputed to force a green build. Undocumented rating-scale upper bounds are not asserted. This limits what a quality-ranking analysis can claim.

Charts and numerical prose are generated from the same model export and metrics.json. Refreshing the source can change outputs. Synthetic experiments are kept in a separate directory and never joined to catalogue records. See data/README.md for retention and publication constraints.
