-- Grain: discovery account × calendar week with at least one qualifying event.
select distinct d.user_id, date_trunc('week', e.occurred_at)::date as activity_week,
    date_diff('week', d.cohort_week, date_trunc('week', e.occurred_at)::date) as weeks_since_discovery
from {{ ref('fct_product_events') }} e
join {{ ref('dim_discovery_users') }} d using (user_id)
where e.event_name in ('discovery_viewed', 'pattern_opened', 'pattern_saved', 'project_started')
  and e.occurred_at >= d.first_discovery_at
