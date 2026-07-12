-- Moderation on the fleet: give reviews/tips a real claim lease.
--
-- Moderation is moving off the in-app Gemini path onto fleet-worker (llm jobs handed out by
-- /api/worker/claim). The claim needs a lease, or we reintroduce the exact bug sql/007 fixed
-- for events: worker_checked_at doubling as the lease means a worker that dies mid-job freezes
-- the submission for 20 HOURS.
--
-- Same contract as events: worker_lease_until is the lease (crash => retried in 15 min), and
-- worker_checked_at is stamped only when a verdict actually arrives (keeping the 20h cadence).
-- The requeue is implicit in the claim predicate — a lease in the past is simply claimable
-- again — so no reaper process is needed.

alter table public.reviews add column if not exists worker_lease_until timestamptz;
alter table public.tips    add column if not exists worker_lease_until timestamptz;

create index if not exists reviews_worker_claim on public.reviews (status, worker_checked_at)
  where status = 'pending';
create index if not exists tips_worker_claim on public.tips (status, worker_checked_at)
  where status = 'pending';
