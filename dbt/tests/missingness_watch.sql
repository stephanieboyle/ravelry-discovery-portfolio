{{ config(severity='warn') }}
-- Deliberately warns rather than inventing precision from missing count denominators.
select 'rating_count' as field from {{ ref('dim_patterns') }}
having avg(case when rating_count is null then 1.0 else 0 end) > 0.5
union all
select 'difficulty_count' from {{ ref('dim_patterns') }}
having avg(case when difficulty_count is null then 1.0 else 0 end) > 0.5
