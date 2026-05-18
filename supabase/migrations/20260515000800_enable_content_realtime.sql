-- Enable Supabase Realtime notifications for admin/public content modules.

do $$
begin
  alter publication supabase_realtime add table public.monthly_cases;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.publications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.governing_body_members;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
