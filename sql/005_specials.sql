-- "Locals Only" owner-created deals (honor-based; printable Local's Ticket)
create table if not exists specials (
  id          bigserial primary key,
  place_id    text not null references restaurants(id),
  title       text not null,                 -- the deal, e.g. "$5 off any plate"
  details     text,                           -- fine print, optional
  recurring   boolean not null default false,
  days_of_week int[],                         -- 0=Mon..6=Sun when recurring
  starts_on   date,
  ends_on     date,                           -- null = ongoing
  status      text not null default 'active' check (status in ('active','removed')),
  created_by  text,                           -- owner email
  created_at  timestamptz default now()
);
create index if not exists specials_place on specials(place_id, status);
