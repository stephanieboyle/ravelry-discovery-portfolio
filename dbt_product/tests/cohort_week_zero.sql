select d.user_id from {{ ref('dim_discovery_users') }} d
left join {{ ref('fct_discovery_weeks') }} w on d.user_id = w.user_id and w.weeks_since_discovery = 0
where w.user_id is null
