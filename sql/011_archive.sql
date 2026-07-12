-- Archiving a spot.
--
-- Three states, not two:
--   live      archived_at is null, hidden = false   on the site
--   hidden    archived_at is null, hidden = true    off the site, still in the working list
--   archived  archived_at is set                    out of the way entirely, and deletable
--
-- WHY: "hidden" is a temporary switch (a place is shut for a refit). "Archived" is for a spot that is
-- gone for good, or was never really a restaurant, or was a duplicate. Both keep the row, and neither
-- deletes anything, because the row carries reader photos, tips, reviews and votes that we cannot get
-- back. Deleting is a separate, deliberate act from the archive screen.
--
-- Archiving also sets hidden = true, which is what actually removes it from the public site: every
-- public query already filters `not hidden`, so archiving needs no changes to any of them.

alter table restaurants add column if not exists archived_at timestamptz;

-- The admin working list reads this on every load.
create index if not exists restaurants_archived on restaurants (archived_at) where archived_at is not null;
