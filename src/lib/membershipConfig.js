import { isSupabaseConfigured, supabase } from './supabase';
import { logDevWarn } from './logger';

const MEMBERSHIP_BUCKET = 'membership-assets';

export const fallbackMembershipPlans = [
  {
    value: 'life',
    slug: 'life',
    label: 'Life Membership',
    description: 'One-time payment for lifetime membership and full access to society benefits.',
    amountLabel: '5,000 INR',
    amount: 5000,
    currency: 'INR',
    durationLabel: 'One-Time Payment',
    sort_order: 10,
    is_active: true,
  },
  {
    value: 'ad_hoc',
    slug: 'ad_hoc',
    label: 'Ad Hoc Membership (3 years)',
    description: 'Valid for 3 years and renewable on reapplication and repayment for another 3-year period.',
    amountLabel: '1,500 INR',
    amount: 1500,
    currency: 'INR',
    durationLabel: 'Per 3 Years',
    sort_order: 20,
    is_active: true,
  },
  {
    value: 'overseas',
    slug: 'overseas',
    label: 'Overseas Membership (3 years)',
    description: 'For overseas eligible or nominated members. Valid for 3 years and renewable in 3-year blocks.',
    amountLabel: '200 USD',
    amount: 200,
    currency: 'USD',
    durationLabel: 'Per 3 Years',
    sort_order: 30,
    is_active: true,
  },
];

export const fallbackMembershipCategories = [
  { slug: 'academic-pathologist', value: 'I am an academic pathologist', label: 'I am an academic pathologist', sort_order: 10, is_active: true },
  { slug: 'practicing-pathologist', value: 'I am a practicing pathologist', label: 'I am a practicing pathologist', sort_order: 20, is_active: true },
  { slug: 'post-graduate-student-fellow', value: 'I am a post graduate student/ fellow', label: 'I am a post graduate student/ fellow', sort_order: 30, is_active: true },
  { slug: 'pathologist-outside-india', value: 'I am a pathologist working outside India', label: 'I am a pathologist working outside India', sort_order: 40, is_active: true },
];

export const fallbackPortalSettings = {
  id: true,
  portal_title: 'Membership Portal',
  portal_subtitle: 'Join the Society or Manage your Membership',
  payment_title: 'Payment Information',
  payment_markdown: `## Bank Transfer

- **Account Name:** DELHI CH OF IAPM
- **Account No:** 1210463576
- **Bank Details:** CENTRAL BANK OF INDIA
- **Branch:** LADY HARDINGE MED COLL AND HOSPITAL BRANCH, OPP PANCHKUIAN ROAD
- **IFSC Code:** CBIN0283462`,
  qr_image_path: '',
  qr_caption: 'Accepts UPI, GPay, Paytm',
  registration_success_markdown: 'We have received your details. You can check your status in the **Check Status** tab.',
  status_intro_markdown: 'Enter the email address you used during registration to check your status and download documents.',
  promo_enabled: true,
  promo_title: 'Promotional Membership Drive',
  promo_markdown: `Pathologists can become members by paying only **Rs 1,500** until **Dec 31, 2026**.

## Membership numbering rule

Until 31 Dec 2026, Rs 1,500 promotional payments receive an L-series number.

From 1 Jan 2027, Rs 5,000 Life members receive L-series, Rs 1,500 Ad Hoc members receive AH-series, and USD 200 Overseas members receive OS-series numbers.

Please select the appropriate membership type in the application form and complete the payment before the deadline.`,
};

export async function loadMembershipPortalData({ admin = false } = {}) {
  const [settings, plans, categories] = await Promise.all([
    getMembershipPortalSettings({ admin }),
    listMembershipPlanOptions({ admin }),
    listMembershipInterestCategories({ admin }),
  ]);

  return {
    settings,
    plans: plans.length ? plans : fallbackMembershipPlans,
    categories: categories.length ? categories : fallbackMembershipCategories,
  };
}

export async function getMembershipPortalSettings() {
  if (!isSupabaseConfigured) return fallbackPortalSettings;

  try {
    const { data, error } = await supabase
      .from('membership_portal_settings')
      .select('*')
      .eq('id', true)
      .maybeSingle();

    if (error) throw error;
    return { ...fallbackPortalSettings, ...(data || {}) };
  } catch (error) {
    logDevWarn('Membership portal settings unavailable, using fallback:', error);
    return fallbackPortalSettings;
  }
}

export async function updateMembershipPortalSettings(input, userId) {
  const payload = {
    id: true,
    portal_title: input.portal_title?.trim() || fallbackPortalSettings.portal_title,
    portal_subtitle: input.portal_subtitle?.trim() || fallbackPortalSettings.portal_subtitle,
    payment_title: input.payment_title?.trim() || fallbackPortalSettings.payment_title,
    payment_markdown: input.payment_markdown || '',
    qr_image_path: input.qr_image_path || null,
    qr_caption: input.qr_caption?.trim() || '',
    registration_success_markdown: input.registration_success_markdown || '',
    status_intro_markdown: input.status_intro_markdown || '',
    promo_enabled: Boolean(input.promo_enabled),
    promo_title: input.promo_title?.trim() || '',
    promo_markdown: input.promo_markdown || '',
    updated_by: userId || null,
  };

  const { data, error } = await supabase
    .from('membership_portal_settings')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return { ...fallbackPortalSettings, ...data };
}

export async function listMembershipPlanOptions({ admin = false } = {}) {
  if (!isSupabaseConfigured) return fallbackMembershipPlans;

  try {
    let query = supabase
      .from('membership_plan_options')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true });

    if (!admin) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapPlanRow);
  } catch (error) {
    logDevWarn('Membership plans unavailable, using fallback:', error);
    return fallbackMembershipPlans;
  }
}

export async function getMembershipPortalPlan(slug) {
  const normalized = normalizeSlug(slug);
  if (!isSupabaseConfigured) return getFallbackPlan(normalized);

  const { data, error } = await supabase
    .from('membership_plan_options')
    .select('*')
    .eq('slug', normalized)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data ? mapPlanRow(data) : getFallbackPlan(normalized);
}

export async function createMembershipPlanOption(input, userId) {
  const payload = preparePlanPayload(input, userId);
  const { data, error } = await supabase
    .from('membership_plan_options')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return mapPlanRow(data);
}

export async function updateMembershipPlanOption(id, input, userId) {
  const payload = preparePlanPayload(input, userId);
  delete payload.created_by;
  const { data, error } = await supabase
    .from('membership_plan_options')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapPlanRow(data);
}

export async function deleteMembershipPlanOption(id) {
  const { error } = await supabase
    .from('membership_plan_options')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function listMembershipInterestCategories({ admin = false } = {}) {
  if (!isSupabaseConfigured) return fallbackMembershipCategories;

  try {
    let query = supabase
      .from('membership_interest_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true });

    if (!admin) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapCategoryRow);
  } catch (error) {
    logDevWarn('Membership categories unavailable, using fallback:', error);
    return fallbackMembershipCategories;
  }
}

export async function createMembershipInterestCategory(input, userId) {
  const payload = prepareCategoryPayload(input, userId);
  const { data, error } = await supabase
    .from('membership_interest_categories')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return mapCategoryRow(data);
}

export async function updateMembershipInterestCategory(id, input, userId) {
  const payload = prepareCategoryPayload(input, userId);
  delete payload.created_by;
  const { data, error } = await supabase
    .from('membership_interest_categories')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapCategoryRow(data);
}

export async function deleteMembershipInterestCategory(id) {
  const { error } = await supabase
    .from('membership_interest_categories')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function uploadMembershipPortalQr(file) {
  if (!file) throw new Error('Choose a QR image first.');
  if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Use a JPG, PNG, or WebP QR image.');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('QR image must be under 2 MB.');
  }

  const path = `membership-portal/qr/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from(MEMBERSHIP_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || 'image/png',
      upsert: false,
    });

  if (error) throw error;
  return path;
}

export async function getMembershipPortalAssetUrl(path, expiresIn = 3600) {
  if (!path || !isSupabaseConfigured) return '';

  const { data, error } = await supabase.storage
    .from(MEMBERSHIP_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data?.signedUrl || '';
}

function preparePlanPayload(input, userId) {
  const label = input.label?.trim();
  const slug = normalizeSlug(input.slug || label);
  const amount = Number(input.amount);

  if (!label) throw new Error('Plan name is required.');
  if (!slug) throw new Error('Plan slug is required.');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a valid amount.');

  const currency = input.currency === 'USD' ? 'USD' : 'INR';

  return {
    slug,
    label,
    description: input.description?.trim() || null,
    amount,
    currency,
    amount_label: input.amount_label?.trim() || formatAmountLabel(amount, currency),
    duration_label: input.duration_label?.trim() || null,
    is_active: Boolean(input.is_active),
    sort_order: Number(input.sort_order) || 0,
    updated_by: userId || null,
    created_by: userId || null,
  };
}

function prepareCategoryPayload(input, userId) {
  const label = input.label?.trim();
  const slug = normalizeSlug(input.slug || label);

  if (!label) throw new Error('Category label is required.');
  if (!slug) throw new Error('Category slug is required.');

  return {
    slug,
    label,
    description: input.description?.trim() || null,
    is_active: Boolean(input.is_active),
    sort_order: Number(input.sort_order) || 0,
    updated_by: userId || null,
    created_by: userId || null,
  };
}

function mapPlanRow(row) {
  return {
    ...row,
    value: row.slug,
    amount: Number(row.amount),
    amountLabel: row.amount_label,
    durationLabel: row.duration_label || '',
    is_active: row.is_active,
  };
}

function mapCategoryRow(row) {
  return {
    ...row,
    value: row.label,
    is_active: row.is_active,
  };
}

function getFallbackPlan(slug) {
  return fallbackMembershipPlans.find((plan) => plan.value === slug || plan.slug === slug) || fallbackMembershipPlans[0];
}

export function normalizeSlug(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

function formatAmountLabel(amount, currency) {
  return `${new Intl.NumberFormat('en-IN').format(amount)} ${currency}`;
}

function safeFileName(name) {
  return String(name || `upload-${Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || `upload-${Date.now()}`;
}
