-- Grain: one observed embedded designer identifier in the latest sample.
select designer_id from {{ ref('stg_designers') }}
