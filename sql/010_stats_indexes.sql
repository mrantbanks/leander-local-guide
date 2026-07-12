-- Indexes for the stats dashboards.
--
-- place_signals and passport_stamp_events are already complete, timestamped, place-tied event logs.
-- Nothing in the repo has ever read them as a time series, so neither has an index on its timestamp:
-- place_signals has only a primary key and the dedup unique. Every "this week" query is a filter on
-- time, and the per-spot owner view filters on (place, time). Add both before anyone queries them.
--
-- Cheap now (60 signal rows), and the alternative is discovering the seq scan at 100x.

create index if not exists place_signals_created
  on place_signals (created_at desc);

create index if not exists place_signals_place_created
  on place_signals (place_id, created_at desc);

create index if not exists passport_events_occurred
  on passport_stamp_events (occurred_at desc);
