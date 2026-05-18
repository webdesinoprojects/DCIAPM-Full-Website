import { isSupabaseConfigured, supabase } from './supabase';

export const dateFilters = [
  { value: 'all', label: 'All dates' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
];

export function contentSlugify(value, fallbackPrefix = 'item') {
  const slug = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `${fallbackPrefix}-${Date.now()}`;
}

export function toDateInput(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

export function formatContentDate(value) {
  if (!value) return 'Not dated';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
}

export function matchesDateFilter(value, filter) {
  if (!value || filter === 'all') return true;

  const date = new Date(value);
  const now = new Date();
  const start = new Date(now);

  if (filter === 'week') {
    start.setDate(now.getDate() - 7);
  } else if (filter === 'month') {
    start.setMonth(now.getMonth() - 1);
  } else if (filter === 'year') {
    start.setFullYear(now.getFullYear() - 1);
  } else {
    return true;
  }

  start.setHours(0, 0, 0, 0);
  return date >= start;
}

export function paginate(items, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    totalPages,
    items: items.slice(start, start + pageSize),
  };
}

export async function listMonthlyCases({ admin = false } = {}) {
  if (!isSupabaseConfigured) return [];
  let query = supabase
    .from('monthly_cases')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('case_date', { ascending: false });
  if (!admin) query = query.eq('is_published', true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getMonthlyCaseBySlug(slug) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('monthly_cases')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createMonthlyCase(input, userId) {
  const payload = serializeMonthlyCase(input);
  payload.slug = await uniqueSlug('monthly_cases', contentSlugify(input.slug || input.title, 'case'));
  payload.created_by = userId;
  const { data, error } = await supabase.from('monthly_cases').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateMonthlyCase(id, input) {
  const payload = serializeMonthlyCase(input);
  if (input.slug) payload.slug = contentSlugify(input.slug, 'case');
  const { data, error } = await supabase.from('monthly_cases').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteMonthlyCase(id) {
  const { data, error } = await supabase.from('monthly_cases').delete().eq('id', id).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No case was deleted. It may already be gone, or the current account cannot delete it.');
  return data;
}

export async function listPublications({ admin = false } = {}) {
  if (!isSupabaseConfigured) return [];
  let query = supabase
    .from('publications')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('published_on', { ascending: false });
  if (!admin) query = query.eq('is_published', true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createPublication(input, userId) {
  const payload = serializePublication(input);
  payload.slug = await uniqueSlug('publications', contentSlugify(input.slug || input.title, 'publication'));
  payload.created_by = userId;
  const { data, error } = await supabase.from('publications').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updatePublication(id, input) {
  const payload = serializePublication(input);
  if (input.slug) payload.slug = contentSlugify(input.slug, 'publication');
  const { data, error } = await supabase.from('publications').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deletePublication(id) {
  const { data, error } = await supabase.from('publications').delete().eq('id', id).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No publication was deleted. It may already be gone, or the current account cannot delete it.');
  return data;
}

export async function listGoverningBodyMembers({ admin = false } = {}) {
  if (!isSupabaseConfigured) return [];
  let query = supabase
    .from('governing_body_members')
    .select('*')
    .order('section', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (!admin) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createGoverningBodyMember(input, userId) {
  const payload = serializeGoverningBodyMember(input);
  payload.created_by = userId;
  const { data, error } = await supabase.from('governing_body_members').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateGoverningBodyMember(id, input) {
  const payload = serializeGoverningBodyMember(input);
  const { data, error } = await supabase.from('governing_body_members').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteGoverningBodyMember(id) {
  const { data, error } = await supabase.from('governing_body_members').delete().eq('id', id).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No member was deleted. It may already be gone, or the current account cannot delete it.');
  return data;
}

function serializeMonthlyCase(input) {
  return {
    title: input.title?.trim() || '',
    summary: input.summary?.trim() || null,
    body: input.body?.trim() || null,
    diagnosis: input.diagnosis?.trim() || null,
    discussion: input.discussion?.trim() || null,
    category: input.category?.trim() || null,
    author_name: input.author_name?.trim() || null,
    case_date: input.case_date || new Date().toISOString().slice(0, 10),
    hero_image_url: input.hero_image_url || null,
    hero_image_path: input.hero_image_path || null,
    hero_image_file_id: input.hero_image_file_id || null,
    attachment_url: input.attachment_url || null,
    attachment_path: input.attachment_path || null,
    attachment_file_id: input.attachment_file_id || null,
    attachment_provider: input.attachment_provider || 'supabase',
    attachment_file_name: input.attachment_file_name || null,
    attachment_mime_type: input.attachment_mime_type || null,
    attachment_file_size: input.attachment_file_size || null,
    is_published: Boolean(input.is_published),
    sort_order: Number(input.sort_order || 0),
  };
}

function serializePublication(input) {
  return {
    title: input.title?.trim() || '',
    author: input.author?.trim() || null,
    category: input.category?.trim() || null,
    description: input.description?.trim() || null,
    published_on: input.published_on || new Date().toISOString().slice(0, 10),
    document_url: input.document_url || null,
    document_path: input.document_path || null,
    document_file_id: input.document_file_id || null,
    document_provider: input.document_provider || 'supabase',
    file_name: input.file_name || null,
    mime_type: input.mime_type || null,
    file_size: input.file_size || null,
    is_published: Boolean(input.is_published),
    sort_order: Number(input.sort_order || 0),
  };
}

function serializeGoverningBodyMember(input) {
  return {
    section: input.section || 'governing_member',
    name: input.name?.trim() || '',
    position: input.position?.trim() || null,
    registration_no: input.registration_no?.trim() || null,
    image_url: input.image_url || null,
    image_path: input.image_path || null,
    image_file_id: input.image_file_id || null,
    image_provider: input.image_provider || 'supabase',
    sort_order: Number(input.sort_order || 0),
    is_active: Boolean(input.is_active),
  };
}

async function uniqueSlug(table, baseSlug) {
  const { data, error } = await supabase
    .from(table)
    .select('slug')
    .ilike('slug', `${baseSlug}%`);
  if (error) throw error;

  const existing = new Set((data || []).map((row) => row.slug));
  if (!existing.has(baseSlug)) return baseSlug;

  let counter = 2;
  while (existing.has(`${baseSlug}-${counter}`)) counter += 1;
  return `${baseSlug}-${counter}`;
}
