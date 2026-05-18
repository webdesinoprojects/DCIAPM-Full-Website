import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminShell from '../../components/admin/AdminShell';
import SEO from '../../components/SEO';
import ElectionStatusPill from '../../components/elections/ElectionStatusPill';
import { useAuth } from '../../hooks/useAuth';
import {
  createElection,
  electionStatuses,
  formatDateTime,
  getElectionWithCandidates,
  toDateTimeLocal,
  updateElection,
} from '../../lib/elections';

const blankForm = {
  title: '',
  description: '',
  status: 'draft',
  starts_at: '',
  ends_at: '',
};

const AdminElectionEditor = () => {
  const { electionSlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = !electionSlug;
  const [election, setElection] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });

  const loadElection = useCallback(async () => {
    if (isNew) return;
    const row = await getElectionWithCandidates(electionSlug);
    if (!row) {
      setStatus({ type: 'error', message: 'Election not found.' });
      setLoading(false);
      return;
    }

    setElection(row);
    setForm({
      title: row.title || '',
      description: row.description || '',
      status: row.status || 'draft',
      starts_at: toDateTimeLocal(row.starts_at),
      ends_at: toDateTimeLocal(row.ends_at),
    });
    setLoading(false);
  }, [electionSlug, isNew]);

  useEffect(() => {
    loadElection().catch((error) => {
      setStatus({ type: 'error', message: error.message || 'Unable to load election.' });
      setLoading(false);
    });
  }, [loadElection]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const saveElection = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: null, message: '' });

    if (form.starts_at && form.ends_at && new Date(form.starts_at) >= new Date(form.ends_at)) {
      setSaving(false);
      setStatus({ type: 'error', message: 'End time must be after start time.' });
      return;
    }

    try {
      const saved = isNew
        ? await createElection(form, user.id)
        : await updateElection(election.id, form);

      setStatus({ type: 'success', message: isNew ? 'Election created.' : 'Election updated.' });
      if (isNew) {
        navigate(`/admin/elections/${saved.slug}`, { replace: true });
      } else {
        const refreshed = await getElectionWithCandidates(saved.slug);
        setElection(refreshed);
      }
    } catch (error) {
      setStatus({ type: 'error', message: friendlyElectionError(error.message) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title={isNew ? 'Create Election' : 'Edit Election'}
      description="Set the title, voting window and publication status."
      action={!isNew && (
        <Link to={`/admin/elections/${electionSlug}/candidates`} className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900 sm:inline-flex">
          Nominees
        </Link>
      )}
    >
      <SEO title={isNew ? 'Create Election' : 'Edit Election'} description="Election editor." keywords="admin election editor" />

      {loading ? (
        <PanelState text="Loading election..." />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.45fr]">
          <form onSubmit={saveElection} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="grid gap-5">
              <label className="block">
                <span className="field-label">Election Title</span>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={updateField}
                  required
                  maxLength="160"
                  className="field-input"
                  placeholder="Example: DC-IAPM Executive Committee Election 2026"
                />
              </label>

              <label className="block">
                <span className="field-label">Description</span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  rows="4"
                  maxLength="1200"
                  className="field-input"
                  placeholder="Brief details shown to voters."
                />
              </label>

              <div className="grid gap-5 md:grid-cols-3">
                <label className="block">
                  <span className="field-label">Status</span>
                  <select name="status" value={form.status} onChange={updateField} className="field-input">
                    {electionStatuses.map((statusValue) => (
                      <option key={statusValue} value={statusValue}>
                        {statusValue.charAt(0).toUpperCase() + statusValue.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="field-label">Starts At</span>
                  <input type="datetime-local" name="starts_at" value={form.starts_at} onChange={updateField} className="field-input" />
                </label>

                <label className="block">
                  <span className="field-label">Ends At</span>
                  <input type="datetime-local" name="ends_at" value={form.ends_at} onChange={updateField} className="field-input" />
                </label>
              </div>

              <StatusMessage status={status} />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link to="/admin/elections" className="text-sm font-bold text-primary hover:underline">Back to elections</Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary px-5 py-3 font-bold text-white transition hover:bg-blue-900 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : isNew ? 'Create Election' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>

          <aside className="grid gap-5">
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Current Status</p>
              <div className="mt-3">{election ? <ElectionStatusPill election={election} /> : <ElectionStatusPill status={form.status} />}</div>
              <dl className="mt-5 grid gap-3 text-sm">
                <InfoRow label="Start" value={formatDateTime(election?.starts_at)} />
                <InfoRow label="End" value={formatDateTime(election?.ends_at)} />
                <InfoRow label="Nominees" value={election?.candidates?.length ?? 0} />
              </dl>
            </div>

            {!isNew && (
              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <p className="font-bold text-primary">Next steps</p>
                <div className="mt-4 grid gap-3">
                  <Link to={`/admin/elections/${electionSlug}/candidates`} className="rounded-lg border border-gray-200 px-4 py-3 font-bold text-primary hover:bg-gray-50">
                    Add or update nominees
                  </Link>
                  <Link to={`/admin/elections/${electionSlug}/votes`} className="rounded-lg border border-gray-200 px-4 py-3 font-bold text-primary hover:bg-gray-50">
                    Open vote monitor
                  </Link>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      <style>{`
        .field-label { display: block; margin-bottom: 0.4rem; font-size: 0.875rem; font-weight: 700; color: #334155; }
        .field-input { width: 100%; border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.75rem 1rem; color: #111827; background: #fff; }
        .field-input:focus { outline: none; border-color: #0A2342; box-shadow: 0 0 0 2px rgba(10, 35, 66, 0.12); }
      `}</style>
    </AdminShell>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-3">
    <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</dt>
    <dd className="mt-1 font-bold text-primary">{value}</dd>
  </div>
);

const StatusMessage = ({ status }) => {
  if (!status.message) return null;
  return (
    <div className={`rounded-lg border p-4 text-sm font-semibold ${
      status.type === 'success' ? 'border-green-100 bg-green-50 text-green-700' : 'border-red-100 bg-red-50 text-red-700'
    }`}>
      {status.message}
    </div>
  );
};

const PanelState = ({ text }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
    <span className="material-symbols-outlined animate-spin text-4xl text-gold-DEFAULT">progress_activity</span>
    <p className="mt-3 font-bold text-primary">{text}</p>
  </div>
);

function friendlyElectionError(message = '') {
  const normalized = message.toLowerCase();
  if (normalized.includes('duplicate') || normalized.includes('unique')) return 'An election with similar details already exists.';
  if (normalized.includes('row-level security')) return 'You do not have permission to save this election.';
  return 'Election could not be saved. Please check the form and try again.';
}

export default AdminElectionEditor;
