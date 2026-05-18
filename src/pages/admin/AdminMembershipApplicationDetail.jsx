import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminShell from '../../components/admin/AdminShell';
import SEO from '../../components/SEO';
import { Field, FileField, StatusBlock } from '../../components/admin/ContentAdminPrimitives';
import {
  approveMembershipApplication,
  createSignedMembershipUrl,
  emailStatusClass,
  emailStatusLabels,
  ensureMembershipDocuments,
  friendlyMembershipEmailError,
  formatMembershipDate,
  generateMembershipDocuments,
  getMembershipApplication,
  membershipStatusLabels,
  sendMembershipDocuments,
  statusClass,
  updateMembershipApplication,
  uploadMembershipAdminDocument,
} from '../../lib/membership';

const AdminMembershipApplicationDetail = () => {
  const { applicationId } = useParams();
  const [application, setApplication] = useState(null);
  const [assets, setAssets] = useState({});
  const [form, setForm] = useState({
    status: 'submitted',
    membership_number: '',
    bill_number: '',
    admin_notes: '',
    receiptFile: null,
    certificateFile: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });

  const loadApplication = useCallback(async ({ reset = false } = {}) => {
    if (reset) {
      setLoading(true);
      setApplication(null);
      setAssets({});
    }
    const row = await getMembershipApplication(applicationId);
    setApplication(row);
    if (row) {
      setForm((current) => ({
        ...current,
        status: row.status || 'submitted',
        membership_number: row.membership_number || '',
        bill_number: row.bill_number || '',
        admin_notes: row.admin_notes || '',
        receiptFile: null,
        certificateFile: null,
      }));
      const [photoUrl, proofUrl, receiptUrl, certificateUrl] = await Promise.all([
        createSignedMembershipUrl(row.photo_path),
        createSignedMembershipUrl(row.payment_proof_path),
        createSignedMembershipUrl(row.receipt_path),
        createSignedMembershipUrl(row.certificate_path),
      ]);
      setAssets({ photoUrl, proofUrl, receiptUrl, certificateUrl });
    }
    setLoading(false);
  }, [applicationId]);

  useEffect(() => {
    loadApplication({ reset: true }).catch((error) => {
      setStatus({ type: 'error', message: error.message || 'Unable to load membership application.' });
      setLoading(false);
    });
  }, [loadApplication]);

  const updateField = (event) => {
    const { name, value, files } = event.target;
    setForm((current) => ({
      ...current,
      [name]: files ? files[0] || null : value,
    }));
  };

  const saveReview = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: null, message: '' });
    try {
      if (form.status === 'approved' && !application.membership_number) {
        throw new Error('Use "Approve / assign number" so the membership number and bill number are generated correctly.');
      }
      let next = await updateMembershipApplication(application.id, form);
      if (form.receiptFile) next = await uploadMembershipAdminDocument(application.id, form.receiptFile, 'receipt');
      if (form.certificateFile) next = await uploadMembershipAdminDocument(application.id, form.certificateFile, 'certificate');
      setApplication(next);
      setStatus({ type: 'success', message: 'Application review saved.' });
      await loadApplication();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to save application.' });
    } finally {
      setSaving(false);
    }
  };

  const approveApplication = async () => {
    setSaving(true);
    setStatus({ type: null, message: '' });
    try {
      const next = await approveMembershipApplication(application.id, {
        membershipNumber: form.membership_number,
        billNumber: form.bill_number,
      });
      try {
        await generateMembershipDocuments(next);
        setStatus({ type: 'success', message: `Application approved with membership number ${next.membership_number}. Receipt and certificate were generated.` });
      } catch (documentError) {
        setStatus({ type: 'error', message: `Application approved, but documents were not generated: ${documentError.message}` });
      }
      await loadApplication();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to approve application.' });
    } finally {
      setSaving(false);
    }
  };

  const generateDocuments = async () => {
    setGenerating(true);
    setStatus({ type: null, message: '' });
    try {
      await generateMembershipDocuments(application);
      setStatus({ type: 'success', message: 'Receipt and certificate generated.' });
      await loadApplication();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to generate documents.' });
    } finally {
      setGenerating(false);
    }
  };

  const sendDocuments = async () => {
    setSending(true);
    setStatus({ type: null, message: '' });
    try {
      let current = application;
      if (!current.receipt_path || !current.certificate_path) {
        current = await ensureMembershipDocuments(current);
      }
      const result = await sendMembershipDocuments(current.id);
      if (!result.ok) throw new Error(result.message || 'Email was not sent.');
      setStatus({ type: 'success', message: 'Documents sent to applicant.' });
      await loadApplication();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to send documents.' });
      await loadApplication().catch(() => {});
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <AdminShell title="Membership Review" description="Loading application...">
        <PanelState text="Loading application..." />
      </AdminShell>
    );
  }

  if (!application) {
    return (
      <AdminShell title="Membership Review" description="Application not found.">
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center font-semibold text-gray-500">Application not found.</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={application.applicant_name}
      description={`${application.membership_type_label} - ${application.amount_label}`}
      action={<Link to="/admin/membership" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-primary">Back</Link>}
    >
      <SEO title="Admin Membership Review" description="Review membership application." keywords="admin membership review" />
      <StatusBlock status={status} />

      <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,430px)]">
        <section className="grid min-w-0 gap-6">
          <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(application.status)}`}>
                {membershipStatusLabels[application.status] || application.status}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${emailStatusClass(application.last_email_status)}`}>
                Email {emailStatusLabels[application.last_email_status] || application.last_email_status}
              </span>
              {application.membership_number && <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">{application.membership_number}</span>}
            </div>

            <div className="mt-6 grid min-w-0 gap-4 md:grid-cols-2">
              <Info label="Name" value={application.applicant_name} />
              <Info label="Email" value={application.email} />
              <Info label="Phone" value={application.phone} />
              <Info label="Institution" value={application.institution} />
              <Info label="Qualification" value={application.qualification} />
              <Info label="Practicing Pathologist" value={application.practicing_pathologist ? 'Yes' : 'No'} />
              <Info label="Student/Fellow Details" value={application.student_status || 'Not provided'} />
              <Info label="Category" value={application.interest_category || 'Not provided'} />
              <Info label="Membership Type" value={application.membership_type_label} />
              <Info label="Amount" value={application.amount_label} />
              <Info label="Transaction" value={application.transaction_details} wide />
              <Info label="Address" value={application.address} wide />
              <Info label="Submitted" value={formatMembershipDate(application.created_at)} />
              <Info label="Approved" value={application.approved_at ? formatMembershipDate(application.approved_at) : 'Not approved'} />
            </div>
          </div>

          <div className="grid min-w-0 gap-6 lg:grid-cols-2">
            <AssetCard title="Applicant Photo" url={assets.photoUrl} mime={application.photo_mime_type} />
            <AssetCard title="Payment Proof" url={assets.proofUrl} mime={application.payment_proof_mime_type} />
            <AssetCard title="Receipt" url={assets.receiptUrl} mime={application.receipt_mime_type} />
            <AssetCard title="Certificate" url={assets.certificateUrl} mime={application.certificate_mime_type} />
          </div>
        </section>

        <form onSubmit={saveReview} className="min-w-0 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Admin Review</p>
          <h2 className="mt-1 text-2xl font-bold text-primary">Approval details</h2>

          <div className="mt-5 grid min-w-0 gap-4">
            <Field label="Status">
              <select name="status" value={form.status} onChange={updateField} className="field-input">
                <option value="submitted">Submitted</option>
                <option value="under_review">Under review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </Field>
            <Field label="Membership number">
              <input name="membership_number" value={form.membership_number} onChange={updateField} className="field-input uppercase" placeholder="Auto on approve" />
            </Field>
            <Field label="Bill number">
              <input name="bill_number" value={form.bill_number} onChange={updateField} className="field-input uppercase" placeholder="Defaults to membership number" />
            </Field>
            <Field label="Admin notes">
              <textarea name="admin_notes" value={form.admin_notes} onChange={updateField} rows="4" className="field-input" />
            </Field>
            <FileField label="Upload receipt" name="receiptFile" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={updateField} current={application.receipt_path} />
            <DocumentQuickLink label="Receipt" url={assets.receiptUrl} emptyText="No receipt generated or uploaded yet." />
            <FileField label="Upload certificate" name="certificateFile" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={updateField} current={application.certificate_path} />
            <DocumentQuickLink label="Certificate" url={assets.certificateUrl} emptyText="No certificate generated or uploaded yet." />

            {application.last_email_error && (
              <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-700">
                Last email error: {friendlyMembershipEmailError(application.last_email_error)}
              </div>
            )}

            <div className="grid gap-2">
              <p className="text-xs font-semibold leading-5 text-gray-500">
                Save stores notes, status changes, and manual uploads. Use Approve / assign number for first approval and auto-number generation.
              </p>
              <button type="submit" disabled={saving} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-primary hover:bg-gray-50 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save notes / uploads'}
              </button>
              <button type="button" onClick={approveApplication} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50">
                {saving ? 'Approving...' : 'Approve / assign number'}
              </button>
              <button type="button" onClick={generateDocuments} disabled={generating || application.status !== 'approved'} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-primary hover:bg-gray-50 disabled:opacity-50">
                {generating ? 'Generating...' : application.receipt_path && application.certificate_path ? 'Regenerate receipt & certificate' : 'Generate receipt & certificate'}
              </button>
              <button type="button" onClick={sendDocuments} disabled={sending || application.status !== 'approved'} className="rounded-lg bg-gold-DEFAULT px-4 py-2 text-sm font-bold text-primary hover:bg-yellow-500 disabled:opacity-50">
                {sending ? 'Sending...' : application.last_email_status === 'failed' ? 'Retry email' : 'Send receipt & certificate'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <style>{`
        .field-label { display: block; margin-bottom: 0.4rem; font-size: 0.875rem; font-weight: 700; color: #334155; }
        .field-input { width: 100%; max-width: 100%; min-width: 0; border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.6rem 0.85rem; color: #111827; background: #fff; }
        .field-input:focus { outline: none; border-color: #0A2342; box-shadow: 0 0 0 2px rgba(10, 35, 66, 0.12); }
      `}</style>
    </AdminShell>
  );
};

const Info = ({ label, value, wide = false }) => (
  <div className={`min-w-0 ${wide ? 'md:col-span-2' : ''}`}>
    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-1 break-words font-semibold text-gray-900">{value || '-'}</p>
  </div>
);

const AssetCard = ({ title, url, mime }) => (
  <article className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-bold text-primary">{title}</h3>
      {url && <a href={url} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline">Open</a>}
    </div>
    <div className="mt-3 overflow-hidden rounded-lg bg-gray-50">
      {url && mime?.startsWith('image/') ? (
        <img src={url} alt={title} className="max-h-72 w-full max-w-full object-contain" />
      ) : url ? (
        <div className="grid min-h-40 place-items-center p-6 text-center text-sm font-semibold text-gray-500">
          <span className="material-symbols-outlined mb-2 text-4xl text-gold-DEFAULT">description</span>
          Open document in a new tab
        </div>
      ) : (
        <div className="grid min-h-40 place-items-center p-6 text-center text-sm font-semibold text-gray-400">
          Not uploaded
        </div>
      )}
    </div>
  </article>
);

const DocumentQuickLink = ({ label, url, emptyText }) => (
  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-bold text-primary">{label} preview</p>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-900">
          View {label.toLowerCase()}
        </a>
      ) : (
        <span className="text-xs font-semibold text-gray-500">{emptyText}</span>
      )}
    </div>
  </div>
);

const PanelState = ({ text }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
    <span className="material-symbols-outlined animate-spin text-4xl text-gold-DEFAULT">progress_activity</span>
    <p className="mt-3 font-bold text-primary">{text}</p>
  </div>
);

export default AdminMembershipApplicationDetail;
