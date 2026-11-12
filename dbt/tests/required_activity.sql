select * from {{ ref('dim_patterns') }}
where projects_count is null or favourites_count is null or designer_id is null
