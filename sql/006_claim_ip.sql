-- Store the submitter's IP on owner claims, shown in moderation for legitimacy checks.
-- (created_at already exists on the claims table.)
alter table claims add column if not exists ip text;
