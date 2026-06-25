-- Owner-claim MVP: print-token claim flow + owner-contributed content (separate from editorial).
create table if not exists owner_claim_tokens (
  id          bigserial primary key,
  place_id    text not null references restaurants(id),
  token_hash  text not null unique,        -- sha256(raw token); raw token lives only in the QR/URL
  code        text unique,                 -- short human-typable fallback, e.g. LLG-7QX4
  status      text not null default 'printed' check (status in ('printed','claimed','revoked')),
  created_by  text,                         -- admin email who printed it
  claimed_by  text,                         -- owner email who consumed it
  note        text,                         -- "handed to [name]" audit
  created_at  timestamptz default now(),
  claimed_at  timestamptz,
  expires_at  timestamptz default now() + interval '120 days'
);
create index if not exists owner_claim_tokens_place on owner_claim_tokens(place_id);

-- one live (printed, unclaimed, unexpired) token per place
create unique index if not exists owner_claim_tokens_one_live
  on owner_claim_tokens(place_id) where status = 'printed';

-- reuse claims as the ownership ledger; record how it was verified
alter table claims add column if not exists verified_via text;     -- 'token' | 'manual'
alter table claims add column if not exists token_id bigint references owner_claim_tokens(id);

-- owner-contributed content, namespaced AWAY from editorial (Anthony's) and attributes (admin's).
-- shape: { blurb, hours:[{open,close}|null x7 Mon-first], phone, website, menuUrl, orderUrl, happyHour, updatedBy, updatedAt }
alter table restaurants add column if not exists owner_content jsonb not null default '{}'::jsonb;
