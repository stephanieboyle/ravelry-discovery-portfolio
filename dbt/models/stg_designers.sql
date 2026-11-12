-- Embedded identifiers only. No authenticated designer profile request.
select distinct designer_id from {{ ref('stg_patterns') }} where designer_id is not null
