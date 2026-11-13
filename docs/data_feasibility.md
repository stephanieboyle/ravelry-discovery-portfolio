# Data feasibility and permitted-use review

Reviewed 12 November 2026. Technical sources: user-supplied API reference dated 26 October 2026 and a further rendered copy, both identifying [ravelry.com/api](https://ravelry.com/api); user-supplied “Ravelry Application Developer and API License Agreement”, version 1.0, updated 6 November 2020; official API-group text identifying that agreement as the terms. The agreement's exact page URL was not included. The official API/developer pages redirect unauthenticated browsing to login. No access controls were bypassed.

## Access and documented endpoints

[Developer registration](https://www.ravelry.com/pro/developer) uses a **free Pro account**. Application-issued HTTP Basic Auth read-only credentials work over HTTPS at `api.ravelry.com`; methods marked authenticated are excluded. Personal-account Basic Auth grants full account access and is not used. The user confirms the local credentials are from a different new app than those shared earlier.

| Endpoint | Documentation | Live verification |
|---|---|---|
| `GET /patterns/search.json` | Unmarked as authenticated; query, page, page_size; patterns array and paginator | Five-pattern probe, then ten bounded pages of five |
| `GET /patterns.json` | Space-delimited ids; map of full patterns indexed by ID | Bulk detail call succeeded for both runs |
| `GET /patterns/{id}.json` | Full pattern detail; return wrapper named patterns in reference | Not called; bulk detail used instead |
| `GET /designers/{id}.json` | Marked authenticated | Excluded; embedded pattern-author identifiers used |

Initial probe: five search results and one bulk detail call, two successful requests. Only after inspecting types/nulls was the scope expanded to a separate 50-pattern run, eleven successful requests. The analysis uses only that latest complete run, not a fabricated historical series. Exact timestamps, paginator values, queries and request counts are in local collection_runs provenance.

## Fields verified in live read-only payloads

Minimised retained fields: `id`; `craft` ID/name; `pattern_categories` identifiers/names; `difficulty_average`/`difficulty_count`; `rating_average`/`rating_count`; `favorites_count`; `projects_count`; embedded `pattern_author.id` stored as designer_id; `published`; `generally_available`; `created_at`; `yardage`/`yardage_max`; `yarn_weight` ID/name. Exact source keys absent from a record remain absent in source-layer JSON, explicit null remains null, and numeric zero remains zero.

Rating/difficulty counts can be null even where an average is returned. The analytic average requires a positive known count. Documentation does not fully establish rating scales or how totals handle deleted/private records, so do not infer denominator semantics or set undocumented scale bounds. `published` is the displayed date, `generally_available` estimates first public availability, and `created_at` means database-record creation. Live publication strings use YYYY/MM/DD. No photos, notes, personal profiles, private attributes or user project records are retained.

## Pagination, limits and caching

Search accepts page and page_size; its paginator documents page_count, page, page_size, results and last_page. Default size is 100, but the collector uses at most five per page. Exact craft/category filter codes were not verified, so the study uses the documented cowl query and never describes it as a category census.

The reference describes 429, 500, 503 and 504 and per-method limits but supplies no global numerical quota for these endpoints or explicit Retry-After policy. The client uses one request per second as a conservative choice, not an official limit. It honours Retry-After when supplied, has connect/read timeouts, bounded transient retries, and stops for long requested delays, authentication errors, redirects, invalid JSON or incompatible response shapes. There is no response-body or credential logging; debug=1 is never enabled.

ETag/If-None-Match and 304 are documented technically; the snapshot collector does not perform persistent full-response caching. Endpoint-specific 24-hour taxonomy caching advice is not generalised to patterns. Existing local snapshots are reused unless a refresh is explicitly requested.

## Agreement constraints and private scope

The supplied agreement prohibits redistribution/syndication of API access or Ravelry data/content (Respect for Ravelry i), requires independent-provider disclosure (e), and requires ceasing use and destroying collected and derived material when requested by Ravelry or owners (Ravelry h; Users b). User data/content may be retained only as necessary for the application's service (Users c), with conspicuous collection/storage/use disclosure (Users a). The introduction limits display of user-owned content and invites contact about unrelated applications; commercial/competing-application restrictions also apply.

The user explicitly authorised proceeding for personal use and a private repository. We proceeded with a small, minimised local analysis. This is **not Ravelry permission** or a legal determination that the portfolio use is covered. Raw data, databases and real-data exports are excluded even from the private source repository. Public portfolio publication, redistribution of example records and aggregate-publication permission remain unresolved; private visibility does not change the agreement. No logo or pattern image is used. Attribution alone cannot create permission. A draft enquiry remains available if a future public release is planned.

Local provenance records a seven-day retention-review date as a project choice, not a provider policy. Follow the deletion instructions in data/README.md and honour requests for derived material as well. No API-derived outputs are approved for public release here.

## Recommended scope and limits

The implemented four questions describe sample activity concentration, publication-age/craft context, evidence-count coverage and whether qualitative opportunity review is justified. It is a convenience text-search sample with unspecified ordering, potential moving-pagination bias and no inclusion probabilities. It cannot estimate catalogue-wide distributions, visibility, conversion, confidence, actual making, experimental effects or network effects. Low activity is not low exposure. Project/favourite ratios are not conversion rates. The documented fields support catalogue diagnostics, not an objective achievable-pattern score. See methodology.md and the local reports/private/findings.md for analysis and limitations.


Publication scope update: Stephanie authorised a public source repository. Only code and synthetic aggregates are published. Real API records and derived outputs remain excluded; permission to publish those remains unresolved.
