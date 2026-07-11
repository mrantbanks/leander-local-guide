-- First-party Guide perks: perks the Guide itself offers and honors.
--
-- Why: /passport currently reads "No perks live right now. Check back soon, locals." An empty
-- perks page makes the whole feature look dead, and it is the page the NEXT prospective owner
-- lands on. The Guide owns a counter too (the site, the newsletter, Anthony), so we can seed the
-- page with something real today without waiting on any business to agree to anything.
--
-- The data-model consequence: a first-party perk has no owning business, so place_id must be
-- nullable and we need to know who is issuing.

alter table specials add column if not exists issuer_type text not null default 'business'
  check (issuer_type in ('business', 'guide'));

-- A Guide perk is not always handed over at a physical register:
--   counter - shown at a business register (every existing owner perk)
--   digital - fulfilled online (early digest access, a code)
--   mail    - something we physically post (the zine)
-- 'redeem_type' is an INTERNAL name; the word is on the brand ban list, so the UI never prints it.
alter table specials add column if not exists redeem_type text not null default 'counter'
  check (redeem_type in ('counter', 'digital', 'mail'));

-- Guide perks have no business behind them.
alter table specials alter column place_id drop not null;

-- Keep the two halves honest: a business perk must name its business, a Guide perk must not.
alter table specials drop constraint if exists specials_issuer_place_ck;
alter table specials add constraint specials_issuer_place_ck check (
  (issuer_type = 'business' and place_id is not null)
  or (issuer_type = 'guide' and place_id is null)
);
