-- Persistent byte cache for Google Place Photos served via /img.
-- Google bills the Place Photos API per request; without this, every visitor's
-- every image view re-hits Google. With it, each (photo, width) is fetched from
-- Google at most once, ever. Survives container rebuilds and is shared across
-- all app instances (unlike a disk cache on the ephemeral container fs).
create table if not exists photo_cache (
  resource_name text not null,          -- Google resource name: places/<id>/photos/<id>
  width         int  not null,          -- maxWidthPx we requested (== the served width)
  content_type  text not null,          -- e.g. image/webp
  bytes         bytea not null,         -- transcoded image bytes
  created_at    timestamptz not null default now(),
  primary key (resource_name, width)
);
