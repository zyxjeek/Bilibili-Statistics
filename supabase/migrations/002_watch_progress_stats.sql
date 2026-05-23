create or replace view public.daily_stats as
with normalized as (
  select
    *,
    case
      when raw->>'progress' ~ '^-?[0-9]+$' then (raw->>'progress')::integer
      else progress
    end as effective_progress,
    coalesce(business, raw #>> '{history,business}') as effective_business,
    coalesce(bvid, raw->>'bvid', raw #>> '{history,bvid}') as effective_bvid
  from public.watch_history
),
watched as (
  select
    view_at,
    author_mid,
    case
      when duration is null or duration <= 0 then 0
      when effective_business not in ('archive', 'pgc') and effective_bvid is null then 0
      when effective_progress = -1 then duration
      when effective_progress > 0 then least(effective_progress, duration)
      else 0
    end as watched_seconds
  from normalized
)
select
  date_trunc('day', view_at)::date as watched_date,
  count(*) filter (where watched_seconds > 0) as video_count,
  coalesce(sum(watched_seconds) filter (where watched_seconds > 0), 0)::bigint as watched_seconds,
  count(distinct author_mid) filter (where watched_seconds > 0 and author_mid is not null) as creator_count
from watched
group by 1
order by 1 desc;
