-- Grain remains one pattern; aggregate multi-valued categories before joining.
with categories as (
 select pattern_id, string_agg(category_name, ', ' order by category_name) as category_names,
 count(*) as category_count from {{ ref('bridge_pattern_categories') }} group by pattern_id
)
select p.*, c.category_names, coalesce(c.category_count, 0) as category_count
from {{ ref('dim_patterns') }} p left join categories c using (pattern_id)
