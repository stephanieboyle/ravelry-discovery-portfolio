-- Grain: one pattern in the latest complete collection run, not one row per category.
with latest as (
  select snapshot_id from {{ source('api', 'collection_runs') }}
  order by extracted_at desc, snapshot_id desc limit 1
)
select r.snapshot_id, r.pattern_id, r.extracted_at,
  try_cast(json_extract_string(payload, '$.designer_id') as bigint) as designer_id,
  json_extract_string(payload, '$.craft.name') as craft,
  json_extract_string(payload, '$.yarn_weight.name') as yarn_weight,
  json_extract(payload, '$.pattern_categories') as categories,
  try_cast(json_extract_string(payload, '$.projects_count') as bigint) as projects_count,
  try_cast(json_extract_string(payload, '$.favorites_count') as bigint) as favourites_count,
  try_cast(json_extract_string(payload, '$.rating_count') as bigint) as rating_count,
  try_cast(json_extract_string(payload, '$.rating_average') as double) as rating_average_raw,
  try_cast(json_extract_string(payload, '$.difficulty_count') as bigint) as difficulty_count,
  try_cast(json_extract_string(payload, '$.difficulty_average') as double) as difficulty_average_raw,
  json_exists(payload, '$.rating_count') as rating_count_field_present,
  json_exists(payload, '$.difficulty_count') as difficulty_count_field_present,
  try_cast(json_extract_string(payload, '$.yardage') as bigint) as yardage_min,
  try_cast(json_extract_string(payload, '$.yardage_max') as bigint) as yardage_max,
  json_extract_string(payload, '$.published') as published_raw,
  try_strptime(json_extract_string(payload, '$.published'), '%Y/%m/%d')::date as published_date,
  json_extract_string(payload, '$.generally_available') as generally_available_raw,
  json_extract_string(payload, '$.created_at') as record_created_raw
from {{ source('api', 'raw_patterns') }} r
join latest using (snapshot_id)
