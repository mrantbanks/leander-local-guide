-- What a local knows that Google never will.
--
-- The spot page had TWO free-text boxes, stacked, asking the same person for the same thing: "post a
-- tip" and "post a review". Two forms halve the submissions, and there are four reviews on the whole
-- site. So they become ONE flow, and the practical tip rides along WITH the review instead of being
-- a separate act of goodwill.
--
-- WHY TRAITS ARE CHIPS AND NOT PROSE, and this is the whole point:
--   1. They need no moderation. A bounded choice cannot be abused, so it never queues up for Anthony.
--      Free text does, and that queue is why contributing is slow.
--   2. They AGGREGATE. "12 of 15 locals say it is quiet enough to talk" is an answer. Fifteen
--      paragraphs are not.
--   3. They are ten times easier to fill in, so people actually do it.
--
-- And they are the things Google structurally cannot tell you. Google will happily say a restaurant
-- has a free parking lot. Only somebody who went at 7pm on a Friday can tell you it is a nightmare.

alter table reviews add column if not exists traits text[] not null default '{}';

-- The practical note, e.g. "cash only after 8pm". This is what a "tip" was, now attached to the
-- visit it came from rather than floating alone.
alter table reviews add column if not exists tip text;

-- Aggregating traits across a spot is the single query the page runs on every load.
create index if not exists reviews_place_approved on reviews (place_id) where status = 'approved';
