-- fleet-worker migration: real 15-minute claim lease for event verification jobs.
-- Previously worker_checked_at doubled as the lease, so a worker crash mid-job froze
-- the event for 20 hours. Now: worker_lease_until is the lease (crash => retry in 15
-- min), worker_checked_at is stamped only when a verdict/failure actually arrives
-- (keeping the 20h re-check cadence).
alter table public.events add column if not exists worker_lease_until timestamp with time zone;

create index if not exists events_worker_claim on public.events (status, worker_checked_at)
  where status in ('pending', 'approved');
