select *,
  case when rating_count > 0 then rating_average_raw end as rating_average,
  case when difficulty_count > 0 then difficulty_average_raw end as difficulty_average,
  date_diff('day', published_date, extracted_at::date) as age_days,
  case when rating_count is null then 'unknown count'
       when rating_count = 0 then 'no ratings'
       when rating_count < 10 then 'fewer than 10 ratings'
       else '10 or more ratings' end as rating_evidence
from {{ ref('stg_patterns') }}
