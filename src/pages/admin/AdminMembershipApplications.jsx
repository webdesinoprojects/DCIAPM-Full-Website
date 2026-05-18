import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminShell from '../../components/admin/AdminShell';
import SEO from '../../components/SEO';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { StatusBlock } from '../../components/admin/ContentAdminPrimitives';
import {
  deleteMembershipApplication,
  emailStatusClass,
  emailStatusLabels,
  formatMembershipDate,
  listMembershipApplications,
  membershipStatusLabels,
  statusClass,
} from '../../lib/membership';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

const AdminMembershipApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: null, message: '' });
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('needs_review');
  const [typeFilter, setTypeFilter] = useState('all');
  const [deleting, setDeleting] = useState(null);

  const loadAll = useCallback(async () => {
    const rows = await listMembershipApplications();
    setApplications(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll().catch((error) => {
      setStatus({ type: 'error', message: error.message || 'Unable to load membership applications.' });
      setLoading(false);
    });
  }, [loadAll]);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    const channel = supabase
      .channel('admin-membership-applications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'membership_applications' }, () => {
        loadAll().catch((error) => {
          setStatus({ type: 'error', message: error.message || 'Unable to refresh membership applications.' });
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAll]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesQuery = !needle || [
        application.applicant_name,
        application.email,
        application.phone,
        application.membership_type_label,
        application.membership_number,
        application.bill_number,
      ].some((value) => String(value || '').toLowerCase().includes(needle));
      const matchesStatus = statusFilter === 'all'
        || application.status === statusFilter
        || (statusFilter === 'needs_review' && ['submitted', 'under_review'].includes(application.status));
      const matchesType = typeFilter === 'all' || application.membership_type_label?.toLowerCase().includes(typeFilter);
      return matchesQuery && matchesStatus && matchesType;
    });
  }, [applications, query, statusFilter, typeFilter]);

  const deleteApplication = async () => {
    if (!deleting) return;
    setStatus({ type: null, message: '' });
    try {
      await deleteMembershipApplication(deleting.id);
      setDeleting(null);
      setStatus({ type: 'success', message: 'Membership application deleted.' });
      await loadAll();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to delete application.' });
    }
  };

  return (
    <AdminShell title="Membership Applications" description="Review applications, verify payment and send membership documents.">
      <SEO title="Admin Membership Applications" description="Manage membership applications." keywords="admin membership" />
      <StatusBlock status={status} />

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Applications</p>
            <h2 className="mt-1 text-2xl font-bold text-primary">{filtered.length} shown / {applications.length} total</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">This is the application/audit queue. Approved records also sync into Members automatically.</p>
          </div>
          <div className="grid w-full max-w-full gap-3 md:grid-cols-[minmax(0,1fr)_minmax(150px,170px)_minmax(150px,180px)] lg:max-w-[680px]">
            <label className="relative block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="field-input membership-search-input"
                placeholder="Search name, email, phone, number..."
              />
            </label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="field-input">
              <option value="needs_review">Needs review</option>
              <option value="all">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="field-input">
              <option value="all">All types</option>
              <option value="life">Life</option>
              <option value="ad hoc">Ad Hoc</option>
              <option value="overseas">Overseas</option>
            </select>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Applicant</th>
                  <th className="px-4 py-3">Membership</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr><td colSpan="6" className="px-4 py-10 text-center font-semibold text-gray-500">Loading...</td></tr>
                ) : filtered.map((application) => (
                  <tr key={application.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-primary">{application.applicant_name}</p>
                      <p className="mt-1 text-xs text-gray-500">{application.email}</p>
                      <p className="mt-1 text-xs text-gray-500">{application.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{application.membership_type_label}</p>
                      <p className="mt-1 text-xs text-gray-500">{application.amount_label}</p>
                      {application.membership_number && <p className="mt-1 text-xs font-bold text-primary">{application.membership_number}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(application.status)}`}>
                        {membershipStatusLabels[application.status] || application.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${emailStatusClass(application.last_email_status)}`}>
                        {emailStatusLabels[application.last_email_status] || application.last_email_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatMembershipDate(application.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/admin/membership/${application.id}`} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary hover:bg-gray-50">
                          Review
                        </Link>
                        <button type="button" onClick={() => setDeleting(application)} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan="6" className="px-4 py-10 text-center font-semibold text-gray-500">No applications match the current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete membership application?"
        body={`This will delete ${deleting?.applicant_name || 'this application'} and remove any member-directory record created from it. Uploaded files may remain in storage history.`}
        confirmLabel="Delete"
        destructive
        onConfirm={deleteApplication}
        onCancel={() => setDeleting(null)}
      />

      <style>{`
        .field-input { width: 100%; border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.6rem 0.85rem; color: #111827; background: #fff; }
        .membership-search-input { padding-left: 2.5rem; }
        .field-input:focus { outline: none; border-color: #0A2342; box-shadow: 0 0 0 2px rgba(10, 35, 66, 0.12); }
      `}</style>
    </AdminShell>
  );
};

export default AdminMembershipApplications;
