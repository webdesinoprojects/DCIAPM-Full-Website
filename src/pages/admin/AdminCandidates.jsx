import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminShell from '../../components/admin/AdminShell';
import SEO from '../../components/SEO';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import CandidateAvatar from '../../components/elections/CandidateAvatar';
import { useAuth } from '../../hooks/useAuth';
import {
  countVotesForCandidate,
  createCandidate,
  deactivateCandidate,
  deleteCandidate,
  getElectionWithCandidates,
  normalizeRegistrationNo,
  updateCandidate,
  uploadCandidatePhoto,
} from '../../lib/elections';

const emptyForm = {
  full_name: '',
  registration_no: '',
  position: '',
  message: '',
  sort_order: 0,
  is_active: true,
  photoFile: null,
  photo_url: '',
  photo_path: '',
};

const AdminCandidates = () => {
  const { electionSlug } = useParams();
  const { user } = useAuth();
  const [election, setElection] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });
  const [pendingAction, setPendingAction] = useState(null);

  const loadElection = useCallback(async () => {
    const row = await getElectionWithCandidates(electionSlug);
    setElection(row);
    setLoading(false);
  }, [electionSlug]);

  useEffect(() => {
    loadElection().catch((error) => {
      setStatus({ type: 'error', message: error.message || 'Unable to load nominees.' });
      setLoading(false);
    });
  }, [loadElection]);

  const updateField = (event) => {
    const { name, type, checked, value, files } = event.target;
    setForm((current) => ({
      ...current,
      [name]: files ? files[0] || null : type === 'checkbox' ? checked : value,
    }));
  };

  const editCandidate = (candidate) => {
    setEditingId(candidate.id);
    setForm({
      full_name: candidate.full_name || '',
      registration_no: candidate.registration_no || '',
      position: candidate.position || '',
      message: candidate.message || '',
      sort_order: candidate.sort_order || 0,
      is_active: candidate.is_active,
      photoFile: null,
      photo_url: candidate.photo_url || '',
      photo_path: candidate.photo_path || '',
    });
    setStatus({ type: null, message: '' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const requestDelete = async (candidate) => {
    try {
      const votes = await countVotesForCandidate(candidate.id);
      setPendingAction({
        candidate,
        votes,
        kind: votes > 0 ? 'deactivate' : 'delete',
      });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to check nominee votes.' });
    }
  };

  const runPendingAction = async () => {
    if (!pendingAction) return;
    try {
      if (pendingAction.kind === 'deactivate') {
        await deactivateCandidate(pendingAction.candidate.id);
        setStatus({ type: 'success', message: 'Nominee deactivated. Votes stay on record.' });
      } else {
        await deleteCandidate(pendingAction.candidate.id);
        setStatus({ type: 'success', message: 'Nominee deleted.' });
      }
      setPendingAction(null);
      await loadElection();
    } catch (error) {
      setStatus({ type: 'error', message: friendlyCandidateError(error.message) });
    }
  };

  const saveCandidate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: null, message: '' });

    try {
      let photoPayload = {
        photo_url: form.photo_url || null,
        photo_path: form.photo_path || null,
      };

      if (form.photoFile) {
        const uploaded = await uploadCandidatePhoto(form.photoFile);
        photoPayload = {
          photo_url: uploaded.url,
          photo_path: uploaded.path,
        };
      }

      const payload = {
        ...form,
        ...photoPayload,
        election_id: election.id,
        registration_no: normalizeRegistrationNo(form.registration_no),
      };

      if (editingId) {
        await updateCandidate(editingId, payload);
        setStatus({ type: 'success', message: 'Nominee updated.' });
      } else {
        await createCandidate(payload, user.id);
        setStatus({ type: 'success', message: 'Nominee added.' });
      }

      resetForm();
      await loadElection();
    } catch (error) {
      setStatus({ type: 'error', message: friendlyCandidateError(error.message) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="Nominees"
      description={election ? election.title : 'Manage election nominee profiles.'}
      action={election && (
        <Link to={`/admin/elections/${election.slug}/votes`} className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900 sm:inline-flex">
          Vote Monitor
        </Link>
      )}
    >
      <SEO title="Admin Nominees" description="Manage election nominees." keywords="admin nominees" />

      {loading ? (
        <PanelState text="Loading nominees..." />
      ) : !election ? (
        <ErrorPanel message="Election not found." />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <form onSubmit={saveCandidate} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">{editingId ? 'Edit Nominee' : 'Add Nominee'}</p>
            <h2 className="mt-1 text-2xl font-bold text-primary">Candidate profile</h2>

            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="field-label">Full Name</span>
                <input name="full_name" value={form.full_name} onChange={updateField} required maxLength="140" className="field-input" />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="field-label">Registration No.</span>
                  <input name="registration_no" value={form.registration_no} onChange={updateField} required maxLength="40" className="field-input uppercase" />
                </label>
                <label className="block">
                  <span className="field-label">Position</span>
                  <input name="position" value={form.position} onChange={updateField} required maxLength="120" className="field-input" placeholder="President, Secretary, Member..." />
                </label>
              </div>

              <label className="block">
                <span className="field-label">Nominee Message</span>
                <textarea name="message" value={form.message} onChange={updateField} rows="4" maxLength="1000" className="field-input" />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="field-label">Sort Order</span>
                  <input type="number" name="sort_order" value={form.sort_order} onChange={updateField} className="field-input" />
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 text-sm font-bold text-gray-700">
                  <input type="checkbox" name="is_active" checked={form.is_active} onChange={updateField} className="h-4 w-4" />
                  Active nominee
                </label>
              </div>

              <label className="block">
                <span className="field-label">Photo</span>
                <input
                  type="file"
                  name="photoFile"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={updateField}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-blue-900"
                />
              </label>

              <StatusMessage status={status} />

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button type="button" onClick={resetForm} className="rounded-lg border border-gray-200 px-4 py-3 font-bold text-gray-700 hover:bg-gray-50">
                  Clear
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-primary px-5 py-3 font-bold text-white transition hover:bg-blue-900 disabled:opacity-50">
                  {saving ? 'Saving...' : editingId ? 'Update Nominee' : 'Add Nominee'}
                </button>
              </div>
            </div>
          </form>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Profiles</p>
                <h2 className="mt-1 text-2xl font-bold text-primary">{election.candidates.length} nominees</h2>
              </div>
              <Link to={`/elections/${election.slug}`} className="text-sm font-bold text-primary hover:underline">Open voter view</Link>
            </div>

            <div className="mt-5 grid gap-4">
              {election.candidates.length === 0 ? (
                <div className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-6 text-center font-semibold text-gray-500">
                  Add the first nominee for this election.
                </div>
              ) : (
                election.candidates.map((candidate) => (
                  <article key={candidate.id} className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-4">
                        <CandidateAvatar candidate={candidate} size="lg" />
                        <div>
                          <h3 className="text-lg font-bold text-primary">{candidate.full_name}</h3>
                          <p className="mt-1 text-sm font-bold text-gray-700">{candidate.position}</p>
                          <p className="mt-1 text-xs font-semibold text-gray-500">Reg. {candidate.registration_no}</p>
                          {candidate.message && <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">{candidate.message}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button type="button" onClick={() => editCandidate(candidate)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-primary hover:bg-gray-50">
                          Edit
                        </button>
                        <button type="button" onClick={() => requestDelete(candidate)} className="rounded-lg border border-red-100 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50">
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.kind === 'deactivate' ? 'Deactivate nominee?' : 'Delete nominee?'}
        body={
          pendingAction?.kind === 'deactivate'
            ? `"${pendingAction?.candidate.full_name}" has ${pendingAction?.votes} vote(s) recorded. To keep election results fair, this nominee will be hidden from voters but the votes stay on record. Use Edit to re-activate later.`
            : `"${pendingAction?.candidate.full_name}" has no votes yet, so removing them is safe. This cannot be undone.`
        }
        confirmLabel={pendingAction?.kind === 'deactivate' ? 'Deactivate' : 'Delete'}
        destructive={pendingAction?.kind === 'delete'}
        onConfirm={runPendingAction}
        onCancel={() => setPendingAction(null)}
      />

      <style>{`
        .field-label { display: block; margin-bottom: 0.4rem; font-size: 0.875rem; font-weight: 700; color: #334155; }
        .field-input { width: 100%; border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.75rem 1rem; color: #111827; background: #fff; }
        .field-input:focus { outline: none; border-color: #0A2342; box-shadow: 0 0 0 2px rgba(10, 35, 66, 0.12); }
      `}</style>
    </AdminShell>
  );
};

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

const ErrorPanel = ({ message }) => (
  <div className="rounded-lg border border-red-100 bg-red-50 p-5 font-semibold text-red-700">{message}</div>
);

function friendlyCandidateError(message = '') {
  const normalized = message.toLowerCase();
  if (normalized.includes('unique') || normalized.includes('duplicate')) return 'This nominee or registration number already exists in this election.';
  if (normalized.includes('row-level security')) return 'You do not have permission to save nominees.';
  if (normalized.includes('storage') || normalized.includes('file')) return 'Photo upload failed. Use JPG, PNG or WebP within the size limit.';
  return 'Nominee could not be saved. Please check the form and try again.';
}

export default AdminCandidates;
