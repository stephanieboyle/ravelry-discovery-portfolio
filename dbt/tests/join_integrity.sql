select pattern_id from {{ ref('dim_patterns') }}
where pattern_id not in (select pattern_id from {{ ref('pattern_discovery') }})
union all
select pattern_id from {{ ref('pattern_discovery') }}
where pattern_id not in (select pattern_id from {{ ref('dim_patterns') }})
