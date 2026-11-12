select user_id, activity_week from {{ ref('fct_discovery_weeks') }}
group by user_id, activity_week having count(*) > 1
