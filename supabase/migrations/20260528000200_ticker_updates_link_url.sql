-- Optional per-message click target for ticker updates.
-- Internal path ("/publications") or external URL ("https://docs.google.com/...").
-- Falls back to "/academics-events" on the frontend when null/blank.

alter table public.ticker_updates
  add column if not exists link_url text;
