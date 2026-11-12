-- Grain: one unique business event; transport retries retain the same event_id.
select event_id, user_id, event_name, occurred_at, received_at,
       session_id, pattern_id, schema_version
from {{ source('demo', 'synthetic_events') }}
qualify row_number() over (partition by event_id order by received_at) = 1
