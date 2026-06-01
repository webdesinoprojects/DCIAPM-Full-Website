import { isSupabaseConfigured, supabase } from './supabase';

export async function listTickerUpdates({ admin = false } = {}) {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('ticker_updates')
    .select('id, title, link_url, is_active, sort_order, created_at, updated_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (!admin) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createTickerUpdate(input, userId) {
  const payload = serialize(input);
  payload.created_by = userId || null;

  const { data, error } = await supabase
    .from('ticker_updates')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTickerUpdate(id, input) {
  const payload = serialize(input);

  const { data, error } = await supabase
    .from('ticker_updates')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTickerUpdate(id) {
  const { error } = await supabase.from('ticker_updates').delete().eq('id', id);
  if (error) throw error;
}

function serialize(input) {
  const linkUrl = input.link_url ? String(input.link_url).trim() : '';
  return {
    title: String(input.title || '').trim(),
    link_url: linkUrl || null,
    is_active: Boolean(input.is_active),
    sort_order: Number(input.sort_order || 0),
  };
}
