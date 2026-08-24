import { isSupabaseConfigured, supabase } from './supabase';

export const leadershipRoles = [
  { value: 'president', label: 'President', publicPath: '/president-message', sortOrder: 1 },
  { value: 'vice_president', label: 'Vice President', publicPath: '/about-us#vice-president-message', sortOrder: 2 },
  { value: 'secretary', label: 'Secretary', publicPath: '/secretary-message', sortOrder: 3 },
];

export async function listLeadershipMessages({ admin = false } = {}) {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('leadership_messages')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('role', { ascending: true });

  if (!admin) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getLeadershipMessage(role, { admin = false } = {}) {
  if (!isSupabaseConfigured) return null;

  let query = supabase
    .from('leadership_messages')
    .select('*')
    .eq('role', role);

  if (!admin) query = query.eq('is_active', true);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertLeadershipMessage(role, input, userId) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

  const payload = serializeLeadershipMessage(input);
  payload.role = role;
  payload.updated_by = userId || null;

  const { data, error } = await supabase
    .from('leadership_messages')
    .upsert(payload, { onConflict: 'role' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function splitLeadershipParagraphs(message) {
  return String(message || '')
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function makeLeadershipExcerpt(message) {
  const [firstParagraph] = splitLeadershipParagraphs(message);
  return firstParagraph || '';
}

function serializeLeadershipMessage(input) {
  return {
    name: input.name?.trim() || '',
    designation: input.designation?.trim() || '',
    organization: input.organization?.trim() || 'DC-IAPM',
    image_url: input.image_url || null,
    image_path: input.image_path || null,
    image_file_id: input.image_file_id || null,
    image_provider: input.image_provider || 'supabase',
    excerpt: input.excerpt?.trim() || makeLeadershipExcerpt(input.message),
    message: input.message?.trim() || '',
    signature_name: input.signature_name?.trim() || input.name?.trim() || '',
    sort_order: Number(input.sort_order || 0),
    is_active: Boolean(input.is_active),
  };
}
