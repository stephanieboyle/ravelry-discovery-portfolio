-- Grain: pattern/category pair; never sum pattern totals after a direct join here.
select distinct p.pattern_id,
  try_cast(json_extract_string(c.value, '$.id') as bigint) as category_id,
  json_extract_string(c.value, '$.name') as category_name
from {{ ref('stg_patterns') }} p, json_each(p.categories) c
