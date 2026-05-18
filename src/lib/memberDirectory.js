import { isSupabaseConfigured, supabase } from './supabase';

export const MEMBER_DIRECTORY_PAGE_SIZE = 50;

export const emptyMemberForm = {
  member_name: '',
  hospital: '',
  registration_number: '',
  email: '',
  mobile_number: '',
  address: '',
  membership_status: '',
  valid_from: '',
  valid_until: '',
  is_active: true,
};

export async function listPublicMemberDirectory({
  search = '',
  emailFilter = 'all',
  page = 1,
  pageSize = MEMBER_DIRECTORY_PAGE_SIZE,
} = {}) {
  return listMemberDirectory({
    admin: false,
    search,
    emailFilter,
    activeFilter: 'active',
    page,
    pageSize,
  });
}

export async function listAdminMemberDirectory({
  search = '',
  emailFilter = 'all',
  activeFilter = 'active',
  page = 1,
  pageSize = MEMBER_DIRECTORY_PAGE_SIZE,
} = {}) {
  return listMemberDirectory({
    admin: true,
    search,
    emailFilter,
    activeFilter,
    page,
    pageSize,
  });
}

export async function getMemberDirectory(id) {
  const { data, error } = await supabase
    .from('member_directory')
    .select('id,member_name,hospital,registration_number,email,mobile_number,address,membership_status,valid_from,valid_until,is_active,source,source_row,source_application_id,created_at,updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throwMemberDirectoryError(error);
  return data;
}

export async function createMemberDirectory(input, userId) {
  const payload = serializeMember(input, userId);
  const { data, error } = await supabase
    .from('member_directory')
    .insert(payload)
    .select()
    .single();
  if (error) throwMemberDirectoryError(error);
  return data;
}

export async function updateMemberDirectory(id, input, userId) {
  const payload = serializeMember(input, userId);
  delete payload.created_by;
  const { data, error } = await supabase
    .from('member_directory')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throwMemberDirectoryError(error);
  return data;
}

export async function setMemberDirectoryActive(id, isActive, userId) {
  const { data, error } = await supabase
    .from('member_directory')
    .update({ is_active: Boolean(isActive), updated_by: userId || null })
    .eq('id', id)
    .select()
    .single();
  if (error) throwMemberDirectoryError(error);
  return data;
}

export async function deleteMemberDirectory(id) {
  const { data, error } = await supabase
    .from('member_directory')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throwMemberDirectoryError(error);
  if (!data) throw new Error('No member was deleted. It may already be gone.');
  return data;
}

export function formatMemberDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

async function listMemberDirectory({
  admin,
  search,
  emailFilter,
  activeFilter,
  page,
  pageSize,
}) {
  if (!isSupabaseConfigured) return { rows: [], count: 0 };

  const safePage = Math.max(Number(page) || 1, 1);
  const safePageSize = Math.min(Math.max(Number(pageSize) || MEMBER_DIRECTORY_PAGE_SIZE, 10), 200);
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  let query = supabase
    .from('member_directory')
    .select('id,member_name,hospital,registration_number,email,mobile_number,address,membership_status,valid_from,valid_until,is_active,source,source_row,source_application_id,created_at,updated_at', { count: 'exact' });

  if (!admin) {
    query = query.eq('is_active', true);
  } else if (activeFilter === 'active') {
    query = query.eq('is_active', true);
  } else if (activeFilter === 'inactive') {
    query = query.eq('is_active', false);
  }

  if (emailFilter === 'with_email') {
    query = query.not('email', 'is', null).neq('email', '');
  } else if (emailFilter === 'without_email') {
    query = query.or('email.is.null,email.eq.');
  }

  const filter = buildSearchFilter(search);
  if (filter) query = query.or(filter);

  const { data, error, count } = await query
    .order('registration_number', { ascending: true })
    .range(from, to);

  if (error) throwMemberDirectoryError(error);
  return { rows: data || [], count: count || 0 };
}

function serializeMember(input, userId) {
  const memberName = String(input.member_name || '').trim();
  const registrationNumber = String(input.registration_number || '').trim().toUpperCase();
  if (!memberName) throw new Error('Member name is required.');
  if (!registrationNumber) throw new Error('Registration number is required.');

  return {
    member_name: memberName,
    hospital: emptyToNull(input.hospital),
    registration_number: registrationNumber,
    email: normalizeEmail(input.email),
    mobile_number: emptyToNull(input.mobile_number),
    address: emptyToNull(input.address),
    membership_status: emptyToNull(input.membership_status),
    valid_from: emptyToNull(input.valid_from),
    valid_until: emptyToNull(input.valid_until),
    is_active: input.is_active !== false,
    source: input.source || 'manual',
    updated_by: userId || null,
    created_by: input.created_by || userId || null,
  };
}

function buildSearchFilter(value) {
  const term = String(value || '')
    .trim()
    .replace(/[,%()]/g, ' ')
    .replace(/\s+/g, ' ');

  if (!term) return '';
  const pattern = `%${term}%`;
  return [
    `member_name.ilike.${pattern}`,
    `hospital.ilike.${pattern}`,
    `registration_number.ilike.${pattern}`,
    `email.ilike.${pattern}`,
    `mobile_number.ilike.${pattern}`,
    `address.ilike.${pattern}`,
    `membership_status.ilike.${pattern}`,
  ].join(',');
}

function emptyToNull(value) {
  const text = String(value || '').trim();
  return text || null;
}

function normalizeEmail(value) {
  const text = String(value || '').trim().toLowerCase();
  return text || null;
}

function throwMemberDirectoryError(error) {
  throw new Error(friendlyMemberDirectoryError(error));
}

function friendlyMemberDirectoryError(error = '') {
  const message = typeof error === 'string' ? error : error?.message || '';
  const code = typeof error === 'object' ? error?.code : '';
  const normalized = message.toLowerCase();

  if (code === '23505' || normalized.includes('duplicate key') || normalized.includes('unique constraint')) {
    if (normalized.includes('registration_number')) {
      return 'This registration number already exists in the member directory.';
    }
    return 'A member with the same unique details already exists.';
  }

  if (normalized.includes('row-level security')) {
    return 'The current account does not have permission to change member directory records.';
  }

  if (normalized.includes('email_lower')) {
    return 'Please use a valid lowercase email address.';
  }

  return message || 'Member directory action failed. Please try again.';
}
