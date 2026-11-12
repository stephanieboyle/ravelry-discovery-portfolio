# Proposed instrumentation — schema version 1

Hypothetical implementation; these are not existing Ravelry events.

Every event carries `event_id` (UUID), `schema_version`, UTC `occurred_at` and `received_at`, pseudonymous `account_id` (or anonymous ID outside this initial test), `session_id`, `surface`, and experiment ID, variant and assignment timestamp where assigned. Never include names, email, free-text searches, private project notes or raw stash contents. Use allowlisted filter codes and explicit unknown values.

| Event | Exact trigger | Additional required properties | Validation |
|---|---|---|---|
| discovery_viewed | Eligible results successfully rendered | view_id, result_count, supported craft code | Non-negative count; once per view, including empty results |
| discovery_filter_applied | Committed filter state leads to a results request | view_id, allowlisted filter_key and value codes | Exclude free text; record failed requests separately |
| pattern_impression | At least 50% of a card visible for at least one continuous second in foreground | view_id, pattern_id, rank, module_id, impression_id, designer IDs where available | Positive rank; no background-tab impressions |
| pattern_opened | Detail route successfully renders | pattern_id, navigation_id, origin view/impression ID when available | Pattern ID exists; origin nullable for direct entry |
| pattern_saved | Server confirms a new saved-pattern relation | pattern_id, save_id | Repeated save requests do not create new outcomes |
| project_started | Server confirms a newly recorded in-progress project | project_id, pattern_id, recording_type, initial_status | Recording type distinguishes current from historical backfill; no project text |

Add a server-side `experiment_assigned` record containing eligibility-rule version, stable allocation key, experiment ID, variant and assignment time. This is the authoritative denominator. Keep a separate feature-exposure record on first successful treatment module render (with module/version); assignment is not exposure. Analyse intention to treat; conditioning on exposure would select on post-assignment behaviour.

## Reliability and identity

Deduplicate all transport retries by event_id using idempotent ingestion. A new view_id is created for a meaningful result refresh; one impression per pattern/module/view, even if the user scrolls away and returns. Navigation and business-operation IDs also prevent repeated renders or server retries creating duplicate opens/saves/starts. Keep raw receipt diagnostics separately from deduplicated analytical events.

Use a stable server-side account assignment lookup and deterministic allocation; retain assignment on subsequent sessions/devices and app versions. Never re-randomise after exposure. Anonymous-to-account linkage needs consent and explicit merge rules; anonymous users are excluded from the first experiment to reduce cross-device ambiguity. Shared accounts still limit the account-as-person interpretation.

Server timestamps govern saves/starts and assignments. Client visibility timestamps need clock-skew checks; quarantine impossible sequences and report late events by arm. Use a predefined ingestion allowance (to be set from actual latency), not endless outcome updates. Enforce schema, enumerations, referential integrity, timestamp order, assignment consistency and event-volume/missingness checks. Do not infer absence of outcomes from a failed pipeline.

The purpose of rank/module is to understand position and rendering; designer IDs support exposure distribution; assignment metadata supports valid joining; event IDs support deduplication; timestamps support windows. Define access, retention and deletion policy with the implementer before collecting. No extra personal attributes are required for the initial test.
