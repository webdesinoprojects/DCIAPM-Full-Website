import { supabase, isSupabaseConfigured } from './supabase';
import { getVoterPhotoSignedUrl } from './elections';

const VOTER_COLUMNS = 'id, email, full_name, phone, registration_no, photo_path, photo_url, is_active, role, created_at, last_seen_at';

export async function listVoters() {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select(VOTER_COLUMNS)
    .eq('role', 'user')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getVoter(id) {
  if (!isSupabaseConfigured || !id) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select(VOTER_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function setVoterActive(id, isActive) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: Boolean(isActive) })
    .eq('id', id)
    .select(VOTER_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteVoter(id) {
  if (!id) throw new Error('Voter is required.');

  const { data, error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id)
    .eq('role', 'user')
    .select('id, full_name, email')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No voter profile was deleted.');
  return data;
}

export async function resolveVoterPhotoUrl(voter) {
  if (!voter) return null;
  if (voter.photo_url) return voter.photo_url;
  if (voter.photo_path) {
    try {
      return await getVoterPhotoSignedUrl(voter.photo_path);
    } catch {
      return null;
    }
  }
  return null;
}

export function isVoterProfileComplete(voter) {
  if (!voter) return false;
  return Boolean(voter.full_name && voter.registration_no && voter.phone && voter.photo_path);
}

export function formatVoterDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
