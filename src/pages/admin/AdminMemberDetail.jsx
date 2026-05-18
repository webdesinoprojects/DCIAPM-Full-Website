import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminShell from '../../components/admin/AdminShell';
import SEO from '../../components/SEO';
import { StatusBlock } from '../../components/admin/ContentAdminPrimitives';
import {
  createSignedMembershipUrl,
  emailStatusClass,
  emailStatusLabels,
  formatMembershipDate,
  generateMembershipDocuments,
  getMembershipApplication,
  membershipStatusLabels,
  statusClass,
} from '../../lib/membership';
import { formatMemberDate, getMemberDirectory } from '../../lib/memberDirectory';

const AdminMemberDetail = () => {
  const { memberId } = useParams();
  const [member, setMember] = useState(null);
  const [application, setApplication] = useState(null);
  const [assets, setAssets] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });

  const loadMember = useCallback(async ({ reset = false } = {}) => {
    if (reset) {
      setLoading(true);
      setMember(null);
      setApplication(null);
      setAssets({});
    }

    const row = await getMemberDirectory(memberId);
    setMember(row);

    if (row?.source_application_id) {
      const app = await getMembershipApplication(row.source_application_id);
      setApplication(app);
      if (app) {
        const [receiptUrl, certificateUrl, photoUrl, proofUrl] = await Promise.all([
          createSignedMembershipUrl(app.receipt_path),
          createSignedMembershipUrl(app.certificate_path),
          createSignedMembershipUrl(app.photo_path),
          createSignedMembershipUrl(app.payment_proof_path),
        ]);
        setAssets({ receiptUrl, certificateUrl, photoUrl, proofUrl });
      }
    }

    setLoading(false);
  }, [memberId]);

  useEffect(() => {
    loadMember({ reset: true }).catch((error) => {
      setStatus({ type: 'error', message: error.message || 'Unable to load member.' });
      setLoading(false);
    });
  }, [loadMember]);

  const regenerateDocuments = async () => {
    if (!application) return;
    setGenerating(true);
    setStatus({ type: null, message: '' });
    try {
      await generateMembershipDocuments(application);
      setStatus({ type: 'success', message: 'Receipt and certificate regenerated.' });
      await loadMember();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to regenerate documents.' });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <AdminShell title="Member Detail" description="Loading member record...">
        <PanelState text="Loading member..." />
      </AdminShell>
    );
  }

  if (!member) {
    return (
      <AdminShell title="Member Detail" description="Member not found.">
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center font-semibold text-gray-500">Member not found.</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={member.member_name}
      description={`${member.registration_number || 'No registration number'} - ${sourceLabel(member.source)}`}
      action={<Link to="/admin/members" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-primary">Back to members</Link>}
    >
      <SEO title="Admin Member Detail" description="View DC-IAPM member record." keywords="admin member detail" />
      <StatusBlock status={status} />

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="grid min-w-0 gap-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${member.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {member.is_active ? 'Active' : 'Inactive'}
              </span>
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">{member.registration_number}</span>
              <span className="rounded-full bg-gold-DEFAULT/15 px-3 py-1 text-xs font-bold text-primary">{sourceLabel(member.source)}</span>
            </div>

            <div className="mt-6 grid min-w-0 gap-4 md:grid-cols-2">
              <Info label="Member name" value={member.member_name} />
              <Info label="Registration number" value={member.registration_number} />
              <Info label="Hospital / Institution" value={member.hospital} wide />
              <Info label="Email" value={member.email || 'No email'} />
              <Info label="Mobile" value={member.mobile_number || 'No mobile'} />
              <Info label="Membership status" value={member.membership_status || '-'} />
              <Info label="Source row" value={member.source_row || '-'} />
              <Info label="Valid from" value={member.valid_from || '-'} />
              <Info label="Valid until" value={member.valid_until || 'Lifetime / not set'} />
              <Info label="Address" value={member.address || '-'} wide />
              <Info label="Created" value={formatMemberDate(member.created_at)} />
              <Info label="Updated" value={formatMemberDate(member.updated_at)} />
            </div>
          </div>

          {application ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Linked Application</p>
                  <h2 className="mt-1 text-2xl font-bold text-primary">{application.membership_type_label}</h2>
                  <p className="mt-1 text-sm font-semibold text-gray-500">{application.amount_label} - submitted {formatMembershipDate(application.created_at)}</p>
                </div>
                <Link to={`/admin/membership/${application.id}`} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-blue-900">
                  Open full review
                </Link>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <Info label="Applicant email" value={application.email} />
                <Info label="Phone" value={application.phone} />
                <Info label="Qualification" value={application.qualification} />
                <Info label="Amount" value={application.amount_label} />
                <Info label="Transaction" value={application.transaction_details} wide />
                <Info label="Admin notes" value={application.admin_notes || '-'} wide />
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-sm font-semibold text-gray-500">
              This member came from the imported/manual directory, so there is no linked membership application or generated certificate record yet.
            </div>
          )}
        </section>

        <aside className="grid min-w-0 content-start gap-6">
          {application && (
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Application Status</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(application.status)}`}>
                  {membershipStatusLabels[application.status] || application.status}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${emailStatusClass(application.last_email_status)}`}>
                  Email {emailStatusLabels[application.last_email_status] || application.last_email_status}
                </span>
              </div>
              <Info className="mt-5" label="Approved" value={application.approved_at ? formatMembershipDate(application.approved_at) : 'Not approved'} />
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Documents</p>
            <div className="mt-4 grid gap-3">
              <DocumentAction label="Receipt" url={assets.receiptUrl} />
              <DocumentAction label="Certificate" url={assets.certificateUrl} />
              <DocumentAction label="Applicant photo" url={assets.photoUrl} />
              <DocumentAction label="Payment proof" url={assets.proofUrl} />
              {application && (
                <button type="button" onClick={regenerateDocuments} disabled={generating || application.status !== 'approved'} className="mt-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-primary hover:bg-gray-50 disabled:opacity-50">
                  {generating ? 'Generating...' : 'Regenerate receipt & certificate'}
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
};

const Info = ({ label, value, wide = false, className = '' }) => (
  <div className={`min-w-0 ${wide ? 'md:col-span-2' : ''} ${className}`}>
    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-1 break-words font-semibold text-gray-900">{value || '-'}</p>
  </div>
);

const DocumentAction = ({ label, url }) => (
  <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
    <span className="min-w-0 truncate text-sm font-bold text-primary">{label}</span>
    {url ? (
      <a href={url} target="_blank" rel="noreferrer" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-900">Open</a>
    ) : (
      <span className="text-xs font-semibold text-gray-500">Not available</span>
    )}
  </div>
);

const PanelState = ({ text }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
    <span className="material-symbols-outlined animate-spin text-4xl text-gold-DEFAULT">progress_activity</span>
    <p className="mt-3 font-bold text-primary">{text}</p>
  </div>
);

function sourceLabel(source) {
  if (source === 'membership_application') return 'Application';
  if (source === 'sheet_import') return 'Sheet import';
  return 'Manual';
}

export default AdminMemberDetail;
