-- Make a confirmed stamp actual evidence.
--
-- THE PROBLEM: recordStampRedeem inserted a row with no visitor_token, no link to any pull, and
-- source hardcoded to 'listing'. So "we sent you 63 customers" was, in fact, "the owner pressed a
-- button 63 times". That is a self-report, and we were about to sell it as causal proof. The pull/
-- confirm rate was two unrelated counters divided by each other.
--
-- THE FIX: the stamp carries a short code. The owner taps the code that is standing in front of them,
-- and the confirm JOINS to the pull it confirms: a real device, at a real time, from a real source.
-- An owner now cannot manufacture a walk-in without a real pull existing first.
--
-- The code is deliberately short (4 chars) and deliberately NOT a secret. It is not a password, it is
-- a way to tell two people at a counter apart. It only has to be unique among the handful of stamps
-- pulled for one perk in the last few hours.

alter table passport_stamp_events add column if not exists stamp_code text;

-- Which pull does this confirm? Null on a pull. Set on a confirm.
alter table passport_stamp_events add column if not exists pull_event_id bigint
  references passport_stamp_events(id);

-- Bot flag, so a crawler-inflated pull can be filtered rather than silently deleted. A silent drop
-- can never be proven correct.
alter table passport_stamp_events add column if not exists is_bot boolean not null default false;

-- The query the owner desk runs: "which stamps were pulled for this perk in the last four hours".
create index if not exists passport_events_recent_pulls
  on passport_stamp_events (special_id, occurred_at desc)
  where event_type = 'pull';
