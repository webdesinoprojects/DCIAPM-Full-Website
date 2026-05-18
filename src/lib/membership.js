import { isSupabaseConfigured, supabase } from './supabase';
import {
  createMembershipCertificateDocx,
  createMembershipReceiptDocx,
} from './docxMembershipDocuments';

export const MEMBERSHIP_BUCKET = 'membership-assets';

export const membershipPlans = [
  {
    value: 'life',
    label: 'Life Membership',
    amountLabel: '5,000 INR',
    amount: 5000,
    currency: 'INR',
  },
  {
    value: 'ad_hoc',
    label: 'Ad Hoc Membership (3 years)',
    amountLabel: '1,500 INR',
    amount: 1500,
    currency: 'INR',
  },
  {
    value: 'overseas',
    label: 'Overseas Membership (3 years)',
    amountLabel: '200 USD',
    amount: 200,
    currency: 'USD',
  },
];

export const membershipStatusLabels = {
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const emailStatusLabels = {
  not_sent: 'Not sent',
  sent: 'Sent',
  failed: 'Failed',
};

export function friendlyMembershipEmailError(message = '') {
  const normalized = String(message || '').toLowerCase();

  if (
    normalized.includes('testing emails')
    || normalized.includes('verify a domain')
    || normalized.includes('onboarding@resend.dev')
    || normalized.includes('resend failed (403)')
  ) {
    return 'Email was blocked because the Resend sender domain is not verified. Configure RESEND_FROM with a verified domain/email in Supabase before sending to applicants.';
  }

  if (normalized.includes('resend api key')) {
    return 'Email service is not configured. Add RESEND_API_KEY in Supabase function secrets.';
  }

  if (normalized.includes('rate limit') || normalized.includes('too many')) {
    return 'Email service rate limit was hit. Please retry later.';
  }

  if (normalized.includes('edge function returned')) {
    return 'Email service rejected the request. Check the Supabase function logs and Resend sender configuration.';
  }

  return message || 'Unable to send membership documents.';
}

export function getMembershipPlan(value) {
  return membershipPlans.find((plan) => plan.value === value) || membershipPlans[0];
}

export function normalizeMembershipType(labelOrValue) {
  const value = String(labelOrValue || '').toLowerCase();
  if (value.includes('overseas')) return 'overseas';
  if (value.includes('ad hoc') || value.includes('ad_hoc')) return 'ad_hoc';
  return 'life';
}

export function formatMembershipDate(value) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function statusClass(status) {
  if (status === 'approved') return 'bg-green-50 text-green-700';
  if (status === 'rejected') return 'bg-red-50 text-red-700';
  if (status === 'under_review') return 'bg-blue-50 text-blue-700';
  return 'bg-yellow-50 text-yellow-700';
}

export function emailStatusClass(status) {
  if (status === 'sent') return 'bg-green-50 text-green-700';
  if (status === 'failed') return 'bg-red-50 text-red-700';
  return 'bg-gray-100 text-gray-600';
}

export async function submitMembershipApplication(input) {
  if (!isSupabaseConfigured) {
    return { ok: false, message: 'Supabase is not configured yet.' };
  }

  const photoFile = input.photoFile;
  const paymentProofFile = input.paymentProofFile;
  if (!photoFile || !paymentProofFile) {
    return { ok: false, message: 'Photo and payment proof are required.' };
  }

  const applicationId = crypto.randomUUID();
  const plan = getMembershipPlan(input.membership_type);
  const photo = await uploadMembershipAsset(photoFile, `applications/${applicationId}/photo`);
  const proof = await uploadMembershipAsset(paymentProofFile, `applications/${applicationId}/payment-proof`);

  const payload = {
    id: applicationId,
    applicant_name: input.applicant_name.trim(),
    institution: input.institution.trim(),
    qualification: input.qualification.trim(),
    practicing_pathologist: input.practicing_pathologist === true || input.practicing_pathologist === 'Yes',
    student_status: input.student_status?.trim() || null,
    address: input.address.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    membership_type: plan.value,
    membership_type_label: plan.label,
    amount_paid: plan.amount,
    currency: plan.currency,
    amount_label: plan.amountLabel,
    transaction_details: input.transaction_details.trim(),
    interest_category: input.interest_category || null,
    photo_path: photo.path,
    photo_mime_type: photo.mimeType,
    photo_size: photo.size,
    payment_proof_path: proof.path,
    payment_proof_mime_type: proof.mimeType,
    payment_proof_size: proof.size,
    status: 'submitted',
  };

  const { data, error } = await supabase
    .from('membership_applications')
    .insert(payload)
    .select('id,applicant_name,email,status,created_at')
    .single();

  if (error) return { ok: false, message: friendlyMembershipError(error.message) };

  supabase.functions.invoke('membership-ack-email', {
    body: { applicationId: data.id },
  }).catch((error) => {
    console.warn('Membership acknowledgement email failed:', error);
  });

  return { ok: true, application: data };
}

export async function lookupMembershipStatus(email) {
  const { data, error } = await supabase.functions.invoke('membership-status', {
    body: { email: email.trim().toLowerCase() },
  });
  if (error) throwMembershipError(error);
  return data;
}

export async function listMembershipApplications() {
  const { data, error } = await supabase
    .from('membership_applications')
    .select('id,applicant_name,email,phone,membership_type_label,amount_label,status,membership_number,bill_number,last_email_status,created_at,approved_at')
    .order('created_at', { ascending: false });
  if (error) throwMembershipError(error);
  return data || [];
}

export async function listApprovedMembers() {
  const { data, error } = await supabase
    .from('membership_applications')
    .select('id,applicant_name,email,phone,institution,qualification,membership_type,membership_type_label,amount_label,membership_number,bill_number,approved_at,documents_sent_at,last_email_status,last_email_error')
    .eq('status', 'approved')
    .order('approved_at', { ascending: false, nullsFirst: false })
    .order('applicant_name', { ascending: true });
  if (error) throwMembershipError(error);
  return data || [];
}

export async function getMembershipApplication(id) {
  const { data, error } = await supabase
    .from('membership_applications')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throwMembershipError(error);
  return data;
}

export async function updateMembershipApplication(id, input) {
  await assertMembershipNumberAvailable(id, input.membership_number);
  const payload = {
    status: input.status,
    admin_notes: input.admin_notes || null,
    membership_number: input.membership_number || null,
    bill_number: input.bill_number || null,
  };
  const { data, error } = await supabase
    .from('membership_applications')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throwMembershipError(error);
  return data;
}

export async function approveMembershipApplication(id, { membershipNumber = '', billNumber = '' } = {}) {
  await assertMembershipNumberAvailable(id, membershipNumber);
  const { data, error } = await supabase.rpc('approve_membership_application', {
    p_application_id: id,
    p_membership_number: membershipNumber || null,
    p_bill_number: billNumber || null,
  });
  if (error) throwMembershipError(error);
  return data;
}

export async function generateMembershipDocuments(application) {
  if (!application?.id) throw new Error('Application is required to generate documents.');
  if (application.status !== 'approved') throw new Error('Approve the application before generating documents.');
  if (!application.membership_number) throw new Error('Membership number is required before generating documents.');

  const receiptFile = await createMembershipReceiptDocx(
    application,
    `receipt-${safeFileName(application.bill_number || application.membership_number)}.docx`,
  );
  const certificateFile = await createMembershipCertificateDocx(
    application,
    `certificate-${safeFileName(application.membership_number)}.docx`,
  );

  const [receipt, certificate] = await Promise.all([
    uploadMembershipAsset(receiptFile, `documents/${application.id}/generated/receipt`),
    uploadMembershipAsset(certificateFile, `documents/${application.id}/generated/certificate`),
  ]);

  const { data, error } = await supabase
    .from('membership_applications')
    .update({
      receipt_url: null,
      receipt_path: receipt.path,
      receipt_file_name: receipt.fileName,
      receipt_mime_type: receipt.mimeType,
      certificate_url: null,
      certificate_path: certificate.path,
      certificate_file_name: certificate.fileName,
      certificate_mime_type: certificate.mimeType,
    })
    .eq('id', application.id)
    .select()
    .single();

  if (error) throwMembershipError(error);
  return data;
}

export async function ensureMembershipDocuments(application) {
  if (application?.receipt_path && application?.certificate_path) return application;
  return generateMembershipDocuments(application);
}

export async function uploadMembershipAdminDocument(id, file, kind) {
  const safeKind = kind === 'certificate' ? 'certificate' : 'receipt';
  const uploaded = await uploadMembershipAsset(file, `documents/${id}/${safeKind}`);
  const payload = safeKind === 'certificate'
    ? {
        certificate_url: null,
        certificate_path: uploaded.path,
        certificate_file_name: uploaded.fileName,
        certificate_mime_type: uploaded.mimeType,
      }
    : {
        receipt_url: null,
        receipt_path: uploaded.path,
        receipt_file_name: uploaded.fileName,
        receipt_mime_type: uploaded.mimeType,
      };

  const { data, error } = await supabase
    .from('membership_applications')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throwMembershipError(error);
  return data;
}

export async function deleteMembershipApplication(id) {
  const memberDelete = await supabase
    .from('member_directory')
    .delete()
    .eq('source_application_id', id);
  if (memberDelete.error && memberDelete.error.code !== '42P01') throwMembershipError(memberDelete.error);

  const { data, error } = await supabase
    .from('membership_applications')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) throwMembershipError(error);
  if (!data) throw new Error('No membership application was deleted. It may already be gone.');
  return data;
}

export async function sendMembershipDocuments(id) {
  const { data, error } = await supabase.functions.invoke('membership-send-documents', {
    body: { applicationId: id },
  });
  if (error) throw new Error(friendlyMembershipEmailError(error.message));
  if (data?.ok === false) throw new Error(friendlyMembershipEmailError(data.message));
  return data;
}

export async function createSignedMembershipUrl(path, expiresIn = 300) {
  if (!path) return '';
  const { data, error } = await supabase.storage
    .from(MEMBERSHIP_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throwMembershipError(error);
  return data.signedUrl;
}

async function uploadMembershipAsset(file, folder) {
  const path = `${folder}/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from(MEMBERSHIP_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    });
  if (error) throwMembershipError(error);
  return {
    path,
    fileName: file.name,
    mimeType: file.type || null,
    size: file.size,
  };
}

function safeFileName(name) {
  return String(name || `upload-${Date.now()}`)
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    || `upload-${Date.now()}`;
}

async function assertMembershipNumberAvailable(applicationId, membershipNumber) {
  const normalizedNumber = String(membershipNumber || '').trim();
  if (!normalizedNumber) return;

  const { data, error } = await supabase
    .from('membership_applications')
    .select('id,applicant_name')
    .eq('membership_number', normalizedNumber)
    .neq('id', applicationId)
    .maybeSingle();

  if (error) throwMembershipError(error);
  if (data) {
    throw new Error(`Membership number ${normalizedNumber} is already assigned to ${data.applicant_name || 'another application'}. Use a different number, or clear the field and let the system generate one.`);
  }

  const { data: member, error: memberError } = await supabase
    .from('member_directory')
    .select('id,member_name,source_application_id')
    .eq('registration_number', normalizedNumber)
    .maybeSingle();

  if (memberError && memberError.code !== '42P01') throwMembershipError(memberError);
  if (member && member.source_application_id !== applicationId) {
    throw new Error(`Membership number ${normalizedNumber} already belongs to ${member.member_name || 'a member'} in the member directory. Use a different number, or clear the field and let the system generate one.`);
  }
}

function throwMembershipError(error) {
  throw new Error(friendlyMembershipError(error));
}

function friendlyMembershipError(error = '') {
  const message = typeof error === 'string' ? error : error?.message || '';
  const code = typeof error === 'object' ? error?.code : '';
  const normalized = message.toLowerCase();
  if (code === '23505' || normalized.includes('duplicate key') || normalized.includes('unique constraint')) {
    if (normalized.includes('membership_number')) {
      return 'This membership number is already assigned to another application. Use a different number, or clear the field and let the system generate one.';
    }
    return 'A record with the same unique value already exists. Please check the entered details and try again.';
  }
  if (normalized.includes('storage') || normalized.includes('bucket')) {
    return 'File upload failed. Please use JPG/PNG/WebP for photos and JPG/PNG/PDF for payment proof.';
  }
  if (normalized.includes('row-level security')) {
    return 'The application could not be saved with the current permissions.';
  }
  if (normalized.includes('already exists in the member directory')) {
    return 'This membership number already exists in the member directory. Clear the field and let the system generate the next available number.';
  }
  return message || 'Application could not be submitted. Please try again.';
}
