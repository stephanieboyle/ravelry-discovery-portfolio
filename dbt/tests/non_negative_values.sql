-- Unknown stays unknown. No undocumented upper rating/difficulty bound asserted.
select * from {{ ref('dim_patterns') }}
where projects_count < 0 or favourites_count < 0 or rating_count < 0 or difficulty_count < 0
or rating_average_raw < 0 or difficulty_average_raw < 0 or yardage_min < 0 or yardage_max < 0
or (yardage_min is not null and yardage_max is not null and yardage_max < yardage_min)
