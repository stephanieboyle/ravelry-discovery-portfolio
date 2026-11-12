# Collection protocol and executed scope

## Executed feasibility check

After reading the supplied documentation and the user's private-use instruction, collected one search page (`query=cowl`, `page=1`, `page_size=5`) plus one bulk details request for those IDs. Inspected actual keys, types, nulls, publication strings, embedded author IDs and paginator. No synthetic records substituted.

Then ran a separate bounded 50-pattern study: pages of five, one bulk details call, same query, API default order unspecified. The latest complete snapshot is modelled. No authenticated designer, people, library or user-project endpoint was called. No claim of random sampling or historical measurement is made.

## Reproduction and refresh rules

- Explicit `--private-use`; app-issued read-only credentials from local environment or ignored .env.
- Default limit five; hard maximum 100. The implemented study uses 50. Treat changing frame/query/order as a new analysis choice.
- Inspect five records before scaling a new scope. Query cowl is a documented example, not a verified category code. Text matching and API ordering create selection bias.
- Pagination uses documented page/page_size and paginator termination; deduplicate IDs, stop on entirely repeated pages, fail missing/mismatched details atomically.
- Respect Retry-After, use bounded transient retries and timeouts; stop on permission errors. One request per second is a local conservative setting, not a provider-confirmed quota.
- Store only allowlisted catalogue fields; include UTC timestamp, snapshot ID, safe parameters, paginator and request count. Distinguish absent, null and zero; never log auth headers or response bodies.
- Reuse a complete local snapshot by default. `--refresh` is explicit, creates a new run and changes potential results. Multiple present-day snapshots are not used to infer history.
- Do not interpret sample metrics as catalogue-wide statistics. Future collection should use a defined frame and documented filters/order and report exclusions, duplicates and missingness.

Publication permission remains unresolved; the private repository excludes real data and generated real-data reports. Honour the limited retention/deletion guidance in data/README.md.
