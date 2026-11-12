select * from {{ ref('dim_patterns') }}
where published_raw is not null and published_date is null
