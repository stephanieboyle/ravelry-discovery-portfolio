select * from {{ ref('fct_product_events') }}
where received_at < occurred_at or occurred_at >= timestamptz '2026-10-26 00:00:00+00'
   or schema_version != 1
