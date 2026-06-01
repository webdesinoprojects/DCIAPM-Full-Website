import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminShell from '../../components/admin/AdminShell';
import SEO from '../../components/SEO';
import {
  getVoter,
  resolveVoterPhotoUrl,
  setVoterActive,
  isVoterProfileComplete,
  formatVoterDate,
} from '../../lib/voters';

const AdminVoterDetail = () => {
  const { voterId } = useParams();
  const [voter, setVoter] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const row = await getVoter(voterId);
        if (cancelled) return;
        setVoter(row);
        if (row) {
          const url = await resolveVoterPhotoUrl(row);
          if (!cancelled) setPhotoUrl(url);
        }
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load voter.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [voterId]);

  const toggleActive = async () => {
    if (!voter) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await setVoterActive(voter.id, !voter.is_active);
      setVoter(updated);
    } catch (err) {
      setError(err.message || 'Could not update voter.');
    } finally {
      setSaving(false);
    }
  };

  const complete = isVoterProfileComplete(voter);

  return (
    <AdminShell
      title={voter?.full_name || 'Voter details'}
      description={voter ? voter.email : 'Loading voter profile...'}
      action={(
        <Link to="/admin/voters" className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-primary hover:bg-gray-50">
          <span className="material-icons-outlined mr-1 text-base">arrow_back</span>
          Back to list
        </Link>
      )}
    >
      <SEO
        title={voter?.full_name ? `Voter: ${voter.full_name}` : 'Voter detail'}
        description="Voter profile detail"
        keywords="admin voter detail"
      />

      {error && (
        <p className="mb-4 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="rounded-lg border border-gray-200 bg-white p-8 text-center font-semibold text-gray-500">Loading voter...</p>
      ) : !voter ? (
        <p className="rounded-lg border border-yellow-100 bg-yellow-50 p-8 text-center font-semibold text-yellow-700">
          Voter not found. The user may have been deleted, or the link is invalid.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <aside className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mx-auto grid h-40 w-40 place-items-center overflow-hidden rounded-full bg-primary text-3xl font-bold text-white">
              {photoUrl ? (
                <img src={photoUrl} alt={voter.full_name || 'Voter'} className="h-full w-full object-cover" />
              ) : (
                <span>{(voter.full_name || voter.email || '?').slice(0, 2).toUpperCase()}</span>
              )}
            </div>

            <div className="mt-4 text-center">
              <p className="text-xl font-bold text-primary">{voter.full_name || '(no name)'}</p>
              <p className="mt-1 break-all text-sm text-gray-500">{voter.email}</p>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <span className={`rounded-full px-3 py-1.5 text-center text-xs font-bold ${voter.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {voter.is_active ? 'Active voter' : 'Deactivated'}
              </span>
              <span className={`rounded-full px-3 py-1.5 text-center text-xs font-bold ${complete ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                {complete ? 'Profile complete' : 'Profile incomplete'}
              </span>
              <button
                type="button"
                onClick={toggleActive}
                disabled={saving}
                className="mt-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-primary transition hover:bg-gray-50 disabled:opacity-50"
              >
                {saving ? 'Saving...' : voter.is_active ? 'Deactivate voter' : 'Reactivate voter'}
              </button>
            </div>

            {!photoUrl && (
              <p className="mt-4 rounded-lg border border-dashed border-gray-200 p-3 text-center text-xs font-semibold text-gray-500">
                No voter photo on file.
              </p>
            )}
          </aside>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Profile details</p>
            <h2 className="mt-1 text-2xl font-bold text-primary">All saved fields</h2>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail label="Full Name" value={voter.full_name} />
              <Detail label="Registration No." value={voter.registration_no} mono />
              <Detail label="Email" value={voter.email} mono />
              <Detail label="Mobile Number" value={voter.phone} />
              <Detail label="Role" value={voter.role} />
              <Detail label="Joined" value={formatVoterDate(voter.created_at)} />
              <Detail label="Last Seen" value={formatVoterDate(voter.last_seen_at)} />
              <Detail label="Account ID" value={voter.id} mono className="sm:col-span-2" />
              <Detail label="Photo Path" value={voter.photo_path} mono className="sm:col-span-2" />
            </dl>
          </section>
        </div>
      )}
    </AdminShell>
  );
};

const Detail = ({ label, value, className = '', mono = false }) => (
  <div className={`rounded-lg border border-gray-100 bg-[#fbfcfe] p-4 ${className}`}>
    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
    <p className={`mt-2 break-all font-bold text-gray-900 ${mono ? 'font-mono text-sm' : ''}`}>{value || '—'}</p>
  </div>
);

export default AdminVoterDetail;
