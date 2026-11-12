# Private local data

The user authorised private analysis using replacement credentials from a new read-only app. The supplied developer agreement does not confer a blanket publication permission. `.env`, local databases, all data here and API-derived exports in reports/private are excluded from Git, including the private remote.

`ravelry.duckdb` contains minimised catalogue JSON, run provenance and dbt tables. No pattern images, notes, personal profiles or user project records are retained. `raw_patterns` means source-layer minimised JSON, not full API responses. Collection timestamps and a seven-day deletion-review date are recorded in collection_runs. Seven days is a project choice, not a Ravelry policy. Review/delete promptly; retain only as necessary for this private exercise and honour Ravelry/owner removal requests, including derived material.

Synthetic files live separately under data/synthetic and are regenerated from fixed assumptions. They contain no real Ravelry records. Real and synthetic tables are never joined.

To remove local source and derived real data, close any database connections and delete `data/ravelry.duckdb` (plus a .wal if present) and `reports/private/`. Use the file manager or carefully review paths before deleting. Also remove copied exports and backups under your control. Regeneration of the synthetic experiment does not require those files.

The tracked synthetic summaries/charts are explicitly labelled. No real-data aggregates are approved for public release by this project. A future public portfolio should get a separate use review and only include permitted outputs.
