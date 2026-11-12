select * from {{ ref('mart_activation_retention') }}
where (eligible_week4 and returned_week4 is null)
   or (not eligible_week4 and returned_week4 is not null)
