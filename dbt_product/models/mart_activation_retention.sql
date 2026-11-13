-- Grain: one discovery account. Activation is fixed at day 14, before calendar week 4.
with week_four as (
    select user_id from {{ ref('fct_discovery_weeks') }}
    where weeks_since_discovery = 4
), eligibility as (
    select *, mature_14d
      and cohort_week + interval '5 weeks' <= date '2026-10-26'
      and first_discovery_at + interval '14 days' <= cohort_week + interval '4 weeks'
      as eligible_week4
    from {{ ref('dim_discovery_users') }}
)
select d.user_id, d.craft, d.experience, d.cohort_week,
       d.started_14d as activated_14d, d.eligible_week4,
       case when d.eligible_week4 then w.user_id is not null end as returned_week4
from eligibility d left join week_four w using (user_id)
