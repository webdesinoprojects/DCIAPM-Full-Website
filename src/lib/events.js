import { isSupabaseConfigured, supabase } from './supabase';

const BUCKET = 'gallery-assets';

export function eventSlugify(value) {
  const slug = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `event-${Date.now()}`;
}

export function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function fromDateTimeLocal(value) {
  return value ? new Date(value).toISOString() : null;
}

export function formatEventDate(value) {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value));
}

export async function listEvents({ admin = false } = {}) {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('events')
    .select(`
      id, slug, title, summary, body, hero_image_url, hero_image_path,
      author_name, author_photo_url, author_photo_path,
      location, starts_at, ends_at, timer_date,
      register_url, flyer_url, abstract_guidelines_url,
      is_published, sort_order, created_at, updated_at
    `)
    .order('sort_order', { ascending: true })
    .order('starts_at', { ascending: false, nullsFirst: false });

  if (!admin) query = query.eq('is_published', true);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getEventBySlug(slug) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createEvent(input, userId) {
  const slug = await uniqueEventSlug(eventSlugify(input.slug || input.title));
  const payload = serializeEvent(input);
  payload.slug = slug;
  payload.created_by = userId;

  const { data, error } = await supabase
    .from('events')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEvent(id, input) {
  const payload = serializeEvent(input);

  const { data, error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEvent(id) {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadEventImage(file, { folder = 'events' } = {}) {
  if (!file) return null;

  const path = `${folder}/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path, fileId: null };
}

function safeFileName(name) {
  return String(name || `upload-${Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || `upload-${Date.now()}`;
}

function serializeEvent(input) {
  return {
    title: input.title?.trim() || '',
    summary: input.summary?.trim() || null,
    body: input.body?.trim() || null,
    hero_image_url: input.hero_image_url || null,
    hero_image_path: input.hero_image_path || null,
    author_name: input.author_name?.trim() || null,
    author_photo_url: input.author_photo_url || null,
    author_photo_path: input.author_photo_path || null,
    location: input.location?.trim() || null,
    starts_at: fromDateTimeLocal(input.starts_at),
    ends_at: fromDateTimeLocal(input.ends_at),
    timer_date: fromDateTimeLocal(input.timer_date),
    register_url: input.register_url?.trim() || null,
    flyer_url: input.flyer_url?.trim() || null,
    abstract_guidelines_url: input.abstract_guidelines_url?.trim() || null,
    is_published: Boolean(input.is_published),
    sort_order: Number(input.sort_order || 0),
  };
}

async function uniqueEventSlug(baseSlug) {
  const { data, error } = await supabase
    .from('events')
    .select('slug')
    .ilike('slug', `${baseSlug}%`);

  if (error) throw error;
  const existing = new Set((data || []).map((row) => row.slug));
  if (!existing.has(baseSlug)) return baseSlug;

  let counter = 2;
  while (existing.has(`${baseSlug}-${counter}`)) counter += 1;
  return `${baseSlug}-${counter}`;
}
