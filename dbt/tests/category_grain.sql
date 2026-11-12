select pattern_id, category_id from {{ ref('bridge_pattern_categories') }}
group by pattern_id, category_id having count(*) > 1
