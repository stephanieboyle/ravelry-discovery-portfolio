-- Grain: account entering discovery. No real users or Ravelry behavioural data.
with first_discovery as (
    select user_id, min(occurred_at) as first_discovery_at
    from {{ ref('fct_product_events') }}
    where event_name = 'discovery_viewed' group by user_id
), first_open as (
    select e.user_id, min(e.occurred_at) as first_open_at
    from {{ ref('fct_product_events') }} e join first_discovery d using (user_id)
    where e.event_name = 'pattern_opened' and e.occurred_at >= d.first_discovery_at
    group by e.user_id
), outcomes as (
    select d.user_id,
        min(e.occurred_at) filter (where e.event_name = 'project_started'
            and e.occurred_at >= o.first_open_at) as first_start_at,
        min(e.occurred_at) filter (where e.event_name = 'pattern_saved'
            and e.occurred_at >= o.first_open_at) as first_save_at
    from first_discovery d left join first_open o using (user_id)
    left join {{ ref('fct_product_events') }} e on e.user_id = d.user_id
        and e.occurred_at >= d.first_discovery_at
    group by d.user_id
)
select u.*, d.first_discovery_at,
    date_trunc('week', timezone('UTC', d.first_discovery_at))::date as cohort_week,
    o.first_open_at, x.first_save_at, x.first_start_at,
    d.first_discovery_at + interval '336 hours' <= timestamptz '2026-10-26 00:00:00+00' as mature_14d,
    coalesce(o.first_open_at < d.first_discovery_at + interval '336 hours', false) as opened_14d,
    coalesce(x.first_save_at < d.first_discovery_at + interval '336 hours', false) as saved_14d,
    coalesce(x.first_start_at < d.first_discovery_at + interval '336 hours', false) as started_14d,
    case when x.first_start_at is not null then
        epoch(x.first_start_at - d.first_discovery_at) / 86400.0 end as days_to_start
from {{ source('demo', 'synthetic_users') }} u
join first_discovery d using (user_id)
left join first_open o using (user_id)
left join outcomes x using (user_id)
