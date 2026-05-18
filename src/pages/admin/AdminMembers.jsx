import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminShell from '../../components/admin/AdminShell';
import SEO from '../../components/SEO';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { Field, StatusBlock } from '../../components/admin/ContentAdminPrimitives';
import { useAuth } from '../../hooks/useAuth';
import {
  createMemberDirectory,
  deleteMemberDirectory,
  emptyMemberForm,
  formatMemberDate,
  listAdminMemberDirectory,
  MEMBER_DIRECTORY_PAGE_SIZE,
  setMemberDirectoryActive,
  updateMemberDirectory,
} from '../../lib/memberDirectory';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

const emailFilters = [
  { value: 'all', label: 'All emails' },
  { value: 'with_email', label: 'With email' },
  { value: 'without_email', label: 'Without email' },
];

const activeFilters = [
  { value: 'active', label: 'Active' },
  { value: 'all', label: 'All records' },
  { value: 'inactive', label: 'Inactive' },
];

const AdminMembers = () => {
  const { profile } = useAuth();
  const [members, setMembers] = useState([]);
  const [summary, setSummary] = useState({ all: 0, active: 0, inactive: 0, withEmail: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });
  const [query, setQuery] = useState('');
  const [emailFilter, setEmailFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('active');
  const [form, setForm] = useState(emptyMemberForm);
  const [editing, setEditing] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const debouncedQuery = useDebouncedValue(query, 300);

  const loadMembers = useCallback(async () => {
    const result = await listAdminMemberDirectory({
      search: debouncedQuery,
      emailFilter,
      activeFilter,
      page,
      pageSize: MEMBER_DIRECTORY_PAGE_SIZE,
    });
    setMembers(result.rows);
    setTotal(result.count);
    setLoading(false);
  }, [activeFilter, debouncedQuery, emailFilter, page]);

  const loadSummary = useCallback(async () => {
    const [all, active, inactive, withEmail] = await Promise.all([
      listAdminMemberDirectory({ activeFilter: 'all', pageSize: 10 }),
      listAdminMemberDirectory({ activeFilter: 'active', pageSize: 10 }),
      listAdminMemberDirectory({ activeFilter: 'inactive', pageSize: 10 }),
      listAdminMemberDirectory({ activeFilter: 'all', emailFilter: 'with_email', pageSize: 10 }),
    ]);
    setSummary({
      all: all.count,
      active: active.count,
      inactive: inactive.count,
      withEmail: withEmail.count,
    });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeFilter, debouncedQuery, emailFilter]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadMembers(), loadSummary()]).catch((error) => {
      setStatus({ type: 'error', message: error.message || 'Unable to load member directory.' });
      setLoading(false);
    });
  }, [loadMembers, loadSummary]);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    const channel = supabase
      .channel('admin-member-directory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_directory' }, () => {
        Promise.all([loadMembers(), loadSummary()]).catch((error) => {
          setStatus({ type: 'error', message: error.message || 'Unable to refresh member directory.' });
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMembers, loadSummary]);

  const totalPages = Math.max(1, Math.ceil(total / MEMBER_DIRECTORY_PAGE_SIZE));

  const visibleMembers = useMemo(() => members.map((member, index) => ({
    ...member,
    serialNo: (page - 1) * MEMBER_DIRECTORY_PAGE_SIZE + index + 1,
  })), [members, page]);

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyMemberForm);
    setDrawerOpen(true);
  };

  const openEdit = (member) => {
    setEditing(member);
    setForm({
      member_name: member.member_name || '',
      hospital: member.hospital || '',
      registration_number: member.registration_number || '',
      email: member.email || '',
      mobile_number: member.mobile_number || '',
      address: member.address || '',
      membership_status: member.membership_status || '',
      valid_from: member.valid_from || '',
      valid_until: member.valid_until || '',
      is_active: member.is_active !== false,
      source: member.source || 'manual',
      created_by: member.created_by || null,
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    setForm(emptyMemberForm);
  };

  const saveMember = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: null, message: '' });
    try {
      if (editing) {
        await updateMemberDirectory(editing.id, form, profile?.id);
        setStatus({ type: 'success', message: 'Member record updated.' });
      } else {
        await createMemberDirectory(form, profile?.id);
        setStatus({ type: 'success', message: 'Member record created.' });
      }
      closeDrawer();
      await Promise.all([loadMembers(), loadSummary()]);
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to save member record.' });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    setSaving(true);
    setStatus({ type: null, message: '' });
    try {
      if (confirm.mode === 'delete') {
        await deleteMemberDirectory(confirm.member.id);
        setStatus({ type: 'success', message: 'Member record deleted.' });
      } else {
        await setMemberDirectoryActive(confirm.member.id, confirm.mode === 'activate', profile?.id);
        setStatus({ type: 'success', message: confirm.mode === 'activate' ? 'Member record activated.' : 'Member record deactivated.' });
      }
      setConfirm(null);
      if (editing?.id === confirm.member.id) closeDrawer();
      await Promise.all([loadMembers(), loadSummary()]);
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Member action failed.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="Members"
      description="Real member directory for public search and admin operations."
      action={(
        <div className="flex items-center gap-2">
          <button type="button" onClick={openCreate} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-blue-900">
            Add Member
          </button>
          <Link to="/members-directory" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-primary hover:bg-gray-50">
            Public Directory
          </Link>
        </div>
      )}
    >
      <SEO title="Admin Members" description="Manage DC-IAPM member directory." keywords="admin members directory" />
      <StatusBlock status={status} />

      <div className="grid gap-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon="groups" label="Total Records" value={summary.all} detail="All imported and manual members" />
          <MetricCard icon="verified" label="Active Members" value={summary.active} detail="Visible on public directory" />
          <MetricCard icon="visibility_off" label="Inactive" value={summary.inactive} detail="Hidden from public search" />
          <MetricCard icon="alternate_email" label="With Email" value={summary.withEmail} detail="Email field populated" />
        </section>

        <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Directory Records</p>
              <h2 className="mt-1 text-2xl font-bold text-primary">{total} records</h2>
              <p className="mt-1 text-sm text-gray-600">Use View for full details. Edit opens in a right-side drawer.</p>
            </div>

            <div className="grid w-full max-w-full gap-3 md:grid-cols-[minmax(0,1fr)_minmax(150px,170px)_minmax(150px,170px)] xl:max-w-[760px]">
              <label className="relative block min-w-0">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="field-input member-search-input"
                  placeholder="Search name, email, hospital, reg no..."
                />
              </label>
              <select value={emailFilter} onChange={(event) => setEmailFilter(event.target.value)} className="field-input">
                {emailFilters.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
              </select>
              <select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value)} className="field-input">
                {activeFilters.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-gray-100">
            <div className="hidden overflow-x-auto xl:block">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">S.No</th>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Registration</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Validity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {loading ? (
                    <TableLoading />
                  ) : visibleMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500">{member.serialNo}</td>
                      <td className="max-w-[320px] px-4 py-3">
                        <p className="break-words font-bold text-primary">{member.member_name}</p>
                        <p className="mt-1 break-words text-xs text-gray-500">{member.hospital || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono font-bold text-gray-900">{member.registration_number}</p>
                        <p className="mt-1 text-xs text-gray-500">{sourceLabel(member.source)}</p>
                      </td>
                      <td className="max-w-[260px] px-4 py-3">
                        <p className="break-all text-xs font-semibold text-gray-700">{member.email || 'No email'}</p>
                        <p className="mt-1 text-xs text-gray-500">{member.mobile_number || 'No mobile'}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        <p>{member.valid_from || '-'}</p>
                        <p className="mt-1">to {member.valid_until || 'Lifetime'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${member.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {member.membership_status && <p className="mt-2 text-xs text-gray-500">{member.membership_status}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link to={`/admin/members/${member.id}`} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary hover:bg-gray-50">View</Link>
                          <button type="button" onClick={() => openEdit(member)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary hover:bg-gray-50">Edit</button>
                          <button type="button" onClick={() => setConfirm({ mode: member.is_active ? 'deactivate' : 'activate', member })} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary hover:bg-gray-50">
                            {member.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button type="button" onClick={() => setConfirm({ mode: 'delete', member })} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && visibleMembers.length === 0 && (
                    <tr><td colSpan="7" className="px-4 py-10 text-center font-semibold text-gray-500">No member records match the current filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-gray-100 xl:hidden">
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => <MobileSkeleton key={index} />)
              ) : visibleMembers.length > 0 ? (
                visibleMembers.map((member) => (
                  <article key={member.id} className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-bold text-primary">{member.member_name}</p>
                        <p className="mt-1 break-words text-sm text-gray-600">{member.hospital || '-'}</p>
                        <p className="mt-2 font-mono text-xs font-bold text-gray-700">{member.registration_number}</p>
                        <p className="mt-2 break-all text-xs text-gray-500">{member.email || 'No email'}</p>
                        <p className="mt-2 text-xs text-gray-500">{member.valid_from || '-'} to {member.valid_until || 'Lifetime'}</p>
                      </div>
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${member.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link to={`/admin/members/${member.id}`} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary">View</Link>
                      <button type="button" onClick={() => openEdit(member)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary">Edit</button>
                      <button type="button" onClick={() => setConfirm({ mode: member.is_active ? 'deactivate' : 'activate', member })} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary">
                        {member.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button type="button" onClick={() => setConfirm({ mode: 'delete', member })} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-bold text-red-700">Delete</button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="p-8 text-center font-semibold text-gray-500">No member records match the current filters.</div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPage((current) => Math.max(current - 1, 1))} disabled={page <= 1 || loading} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-primary hover:bg-gray-50 disabled:opacity-50">
                  Previous
                </button>
                <button type="button" onClick={() => setPage((current) => Math.min(current + 1, totalPages))} disabled={page >= totalPages || loading} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50">
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <MemberEditorDrawer
        open={drawerOpen}
        editing={editing}
        form={form}
        saving={saving}
        onChange={updateField}
        onClose={closeDrawer}
        onSubmit={saveMember}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirmTitle(confirm)}
        body={confirmBody(confirm)}
        confirmLabel={confirm?.mode === 'delete' ? 'Delete' : 'Confirm'}
        destructive={confirm?.mode === 'delete'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />

      <AdminMemberStyles />
    </AdminShell>
  );
};

const MemberEditorDrawer = ({ open, editing, form, saving, onChange, onClose, onSubmit }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[75]">
      <button type="button" aria-label="Close member editor" className="absolute inset-0 bg-primary/30" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Member Record</p>
            <h2 className="mt-1 text-2xl font-bold text-primary">{editing ? 'Edit member' : 'Add member'}</h2>
            {editing && <p className="mt-1 text-sm text-gray-500">Source: {sourceLabel(editing.source)} | Updated: {formatMemberDate(editing.updated_at)}</p>}
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-lg border border-gray-200 text-primary hover:bg-gray-50">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        <form onSubmit={onSubmit} className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="grid min-w-0 gap-4">
            <Field label="Member name">
              <input name="member_name" value={form.member_name} onChange={onChange} className="field-input" required />
            </Field>
            <Field label="Hospital">
              <input name="hospital" value={form.hospital} onChange={onChange} className="field-input" />
            </Field>
            <Field label="Registration number">
              <input name="registration_number" value={form.registration_number} onChange={onChange} className="field-input uppercase" required />
            </Field>
            <Field label="Email ID">
              <input name="email" type="email" value={form.email} onChange={onChange} className="field-input" />
            </Field>
            <Field label="Mobile number">
              <input name="mobile_number" value={form.mobile_number} onChange={onChange} className="field-input" />
            </Field>
            <Field label="Membership status">
              <input name="membership_status" value={form.membership_status} onChange={onChange} className="field-input" placeholder="Life, Active, Overseas..." />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Valid from">
                <input name="valid_from" type="date" value={form.valid_from} onChange={onChange} className="field-input" />
              </Field>
              <Field label="Valid until">
                <input name="valid_until" type="date" value={form.valid_until} onChange={onChange} className="field-input" />
              </Field>
            </div>
            <Field label="Address">
              <textarea name="address" value={form.address} onChange={onChange} rows="4" className="field-input" />
            </Field>
            <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm font-bold text-primary">
              <input type="checkbox" name="is_active" checked={form.is_active} onChange={onChange} className="h-4 w-4 accent-primary" />
              Show in public directory
            </label>
          </div>

          <div className="sticky bottom-0 -mx-6 mt-6 flex flex-col gap-2 border-t border-gray-100 bg-white p-6 sm:flex-row sm:justify-between">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50">
              {saving ? 'Saving...' : editing ? 'Update member' : 'Create member'}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
};

const MetricCard = ({ icon, label, value, detail }) => (
  <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-3 text-3xl font-bold text-primary">{value}</p>
      </div>
      <span className="grid h-11 w-11 place-items-center rounded-lg bg-gold-DEFAULT/15 text-primary">
        <span className="material-icons-outlined">{icon}</span>
      </span>
    </div>
    <p className="mt-4 text-sm font-semibold text-gray-600">{detail}</p>
  </article>
);

const TableLoading = () => (
  <>
    {Array.from({ length: 5 }).map((_, index) => (
      <tr key={index} className="animate-pulse">
        <td className="px-4 py-4"><div className="h-4 w-8 rounded bg-gray-100" /></td>
        <td className="px-4 py-4"><div className="h-4 w-52 rounded bg-gray-100" /></td>
        <td className="px-4 py-4"><div className="h-4 w-24 rounded bg-gray-100" /></td>
        <td className="px-4 py-4"><div className="h-4 w-36 rounded bg-gray-100" /></td>
        <td className="px-4 py-4"><div className="h-4 w-28 rounded bg-gray-100" /></td>
        <td className="px-4 py-4"><div className="h-4 w-20 rounded bg-gray-100" /></td>
        <td className="px-4 py-4"><div className="ml-auto h-4 w-32 rounded bg-gray-100" /></td>
      </tr>
    ))}
  </>
);

const MobileSkeleton = () => (
  <div className="animate-pulse p-4">
    <div className="h-4 w-44 rounded bg-gray-100" />
    <div className="mt-3 h-4 w-56 rounded bg-gray-100" />
    <div className="mt-3 h-4 w-28 rounded bg-gray-100" />
  </div>
);

const AdminMemberStyles = () => (
  <style>{`
    .field-label { display: block; margin-bottom: 0.4rem; font-size: 0.875rem; font-weight: 700; color: #334155; }
    .field-input { width: 100%; max-width: 100%; min-width: 0; border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.6rem 0.85rem; color: #111827; background: #fff; }
    .member-search-input { padding-left: 2.5rem; }
    .field-input:focus { outline: none; border-color: #0A2342; box-shadow: 0 0 0 2px rgba(10, 35, 66, 0.12); }
  `}</style>
);

function sourceLabel(source) {
  if (source === 'membership_application') return 'Application';
  if (source === 'sheet_import') return 'Sheet import';
  return 'Manual';
}

function confirmTitle(confirm) {
  if (!confirm) return '';
  if (confirm.mode === 'delete') return 'Delete member record?';
  if (confirm.mode === 'activate') return 'Activate member record?';
  return 'Deactivate member record?';
}

function confirmBody(confirm) {
  if (!confirm) return '';
  const name = confirm.member?.member_name || 'this member';
  if (confirm.mode === 'delete') return `This will permanently remove ${name} from the member directory.`;
  if (confirm.mode === 'activate') return `${name} will become visible in the public member directory.`;
  return `${name} will be hidden from the public member directory but kept in admin records.`;
}

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [delay, value]);

  return debounced;
}

export default AdminMembers;
