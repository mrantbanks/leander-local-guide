-- Append-only log of Local Passport stamp interactions.
--
-- Why: this is the only thing that turns the Guide from "a nice free website about your
-- restaurant" into "here is proof I sent 63 people to your counter". We cannot backfill events we
-- never recorded, so this goes in BEFORE we drive any perk traffic.
--
-- Two event types:
--   pull   - someone opened the stamp on their device (intent)
--   redeem - the owner confirmed it at the counter (a body in the store)
-- 'redeem' is an INTERNAL name only. The word is on the brand ban list, so every user-facing
-- surface says "stamp it" / "stamped".
--
-- Append-only: never update a row, just insert. Counts are derived (count(*) for total pulls,
-- count(distinct visitor_token) for distinct people). A running counter we cannot audit is worth
-- less than the history, and the history is the thing we will put in front of an owner.

create table if not exists passport_stamp_events (
  id            bigserial primary key,
  -- Nullable: a first-party Guide perk has no owning business (see 009_guide_perks.sql).
  -- Denormalised from specials at insert time so a later perk edit cannot rewrite history.
  place_id      text        references restaurants(id),
  special_id    bigint      not null references specials(id),
  event_type    text        not null check (event_type in ('pull', 'redeem')),
  occurred_at   timestamptz not null default now(),
  -- The llg_anon cookie: a random UUID, httpOnly, never joined to email/name/IP/account.
  -- Lets us say "63 distinct locals" instead of "3 people pulling 21 times". Cleared cookies
  -- look like new people; we accept that undercount rather than collect PII over a taco deal.
  visitor_token uuid,
  source        text        check (source is null or source in ('listing', 'passport', 'map', 'direct')),
  redeemed_by   text        check (redeemed_by is null or redeemed_by in ('owner', 'staff', 'self'))
);

-- "How many people did the Guide send you last quarter" - the query we will actually run.
create index if not exists passport_events_place_idx
  on passport_stamp_events (place_id, event_type, occurred_at desc);

create index if not exists passport_events_special_idx
  on passport_stamp_events (special_id, event_type);
