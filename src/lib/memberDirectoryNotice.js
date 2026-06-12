import { isSupabaseConfigured, supabase } from './supabase';

export const fallbackMemberDirectoryNotice = {
  id: true,
  title: 'Update your member contact details',
  message: 'If your email or phone number is missing or incorrect in the member directory, please contact DC-IAPM so the admin team can update your record.',
  link_label: 'Contact Us',
  link_url: '/contact-us',
  is_active: true,
};

export async function getPublicMemberDirectoryNotice() {
  if (!isSupabaseConfigured) return fallbackMemberDirectoryNotice;

  const { data, error } = await supabase
    .from('member_directory_notice')
    .select('id,title,message,link_label,link_url,is_active')
    .eq('id', true)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throwNoticeError(error);
  return data || null;
}

export async function getAdminMemberDirectoryNotice() {
  if (!isSupabaseConfigured) return fallbackMemberDirectoryNotice;

  const { data, error } = await supabase
    .from('member_directory_notice')
    .select('*')
    .eq('id', true)
    .maybeSingle();

  if (error) throwNoticeError(error);
  return data || fallbackMemberDirectoryNotice;
}

export async function updateMemberDirectoryNotice(input, userId) {
  const payload = {
    id: true,
    title: String(input.title || '').trim() || fallbackMemberDirectoryNotice.title,
    message: String(input.message || '').trim() || fallbackMemberDirectoryNotice.message,
    link_label: String(input.link_label || '').trim() || '',
    link_url: normalizeNoticeUrl(input.link_url),
    is_active: Boolean(input.is_active),
    updated_by: userId || null,
  };

  const { data, error } = await supabase
    .from('member_directory_notice')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) throwNoticeError(error);
  return data;
}

export function normalizeNoticeUrl(value = '') {
  const url = String(value || '').trim();
  if (!url) return '';
  if (url.startsWith('/') || /^https?:\/\//i.test(url) || /^mailto:/i.test(url)) return url;
  return `https://${url}`;
}

function throwNoticeError(error) {
  const message = typeof error === 'string' ? error : error?.message || '';
  if (message.toLowerCase().includes('row-level security')) {
    throw new Error('You do not have permission to manage the member directory notice.');
  }
  throw new Error(message || 'Member directory notice could not be saved.');
}
