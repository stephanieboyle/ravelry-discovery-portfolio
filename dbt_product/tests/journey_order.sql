select * from {{ ref('dim_discovery_users') }}
where first_discovery_at < signed_up_at or first_open_at < first_discovery_at
   or first_start_at < first_open_at or (started_14d and not opened_14d)
   or (saved_14d and not opened_14d)
