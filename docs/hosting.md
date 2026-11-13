# Public app hosting

Live app: https://count-your-stitches.pages.dev

Cloudflare Pages serves six static assets on its free plan. No Functions, paid plan, custom domain, database or payment setup was added. The public app contains labelled synthetic aggregates only. It does not fetch the local private catalogue payload.

This project uses Direct Upload, so GitHub merges do not automatically update this host. To publish an update, rebuild with `make app-data test`, run `python scripts/audit_product_numbers.py`, then `python scripts/package_static_site.py /tmp/ravelry-public.zip`. Upload that ZIP to the existing Pages project as a production deployment. The allowlist excludes private catalogue records even when they exist in the local dashboard directory.

Numerical publication review: 38 Python tests, four product models and 23 dbt tests pass. Independent reconciliation checks all 27 slices and 2,268 retention cells. UTC week boundaries and 336 elapsed hours define cohorts and maturity consistently across daylight saving.
