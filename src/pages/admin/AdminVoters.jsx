import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminShell from '../../components/admin/AdminShell';
import SEO from '../../components/SEO';
import {
  listVoters,
  isVoterProfileComplete,
  formatVoterDate,
  resolveVoterPhotoUrl,
} from '../../lib/voters';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

const AdminVoters = () => {
  const [voters, setVoters] = useState([]);
  const [photoUrls, setPhotoUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [profileFilter, setProfileFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const rows = await listVoters();
      setVoters(rows);
      setError(null);

      const withPhotos = rows.filter((row) => row.photo_path || row.photo_url);
      const urlPairs = await Promise.all(
        withPhotos.map(async (row) => {
          const url = await resolveVoterPhotoUrl(row);
          return [row.id, url];
        }),
      );
      setPhotoUrls(Object.fromEntries(urlPairs.filter(([, url]) => Boolean(url))));
    } catch (err) {
      setError(err.message || 'Could not load voters.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    const channel = supabase
      .channel('admin-voters')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return voters.filter((v) => {
      if (statusFilter === 'active' && !v.is_active) return false;
      if (statusFilter === 'inactive' && v.is_active) return false;
      if (profileFilter === 'complete' && !isVoterProfileComplete(v)) return false;
      if (profileFilter === 'incomplete' && isVoterProfileComplete(v)) return false;
      if (!q) return true;
      return (
        (v.full_name || '').toLowerCase().includes(q)
        || (v.email || '').toLowerCase().includes(q)
        || (v.phone || '').toLowerCase().includes(q)
        || (v.registration_no || '').toLowerCase().includes(q)
      );
    });
  }, [voters, search, statusFilter, profileFilter]);

  const activeCount = voters.filter((v) => v.is_active).length;
  const completeCount = voters.filter(isVoterProfileComplete).length;

  return (
    <AdminShell
      title="Voter Details"
      description="Every registered voter (users with role 'user') and their profile data."
    >
      <SEO title="Admin Voters" description="Voter list" keywords="admin voters dc-iapm" />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatTile label="Total voters" value={voters.length} />
        <StatTile label="Active" value={activeCount} tone="green" />
        <StatTile label="Profile complete" value={completeCount} tone="green" />
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, email, phone, registration..."
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-gold-DEFAULT focus:outline-none sm:max-w-md"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm"
        >
          <option value="all">All status</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
        <select
          value={profileFilter}
          onChange={(event) => setProfileFilter(event.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm"
        >
          <option value="all">Any profile</option>
          <option value="complete">Profile complete</option>
          <option value="incomplete">Profile incomplete</option>
        </select>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f7f9fc] text-xs font-bold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Voter</th>
                <th className="px-4 py-3">Registration No.</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Profile</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm font-semibold text-gray-500">Loading voters...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm font-semibold text-gray-500">No voters match the current filters.</td></tr>
              ) : (
                filtered.map((voter) => {
                  const complete = isVoterProfileComplete(voter);
                  return (
                    <tr key={voter.id} className="hover:bg-[#fbfcfe]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary text-xs font-bold text-white">
                            {photoUrls[voter.id] ? (
                              <img
                                src={photoUrls[voter.id]}
                                alt={voter.full_name || 'Voter'}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              (voter.full_name || voter.email || '?').slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-primary">{voter.full_name || '(no name)'}</p>
                            <p className="truncate text-xs text-gray-500">ID: {voter.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-700">{voter.registration_no || '—'}</td>
                      <td className="px-4 py-3 text-gray-700 break-all">{voter.email || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{voter.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${complete ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                          {complete ? 'Complete' : 'Incomplete'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${voter.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {voter.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatVoterDate(voter.created_at)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          to={`/admin/voters/${voter.id}`}
                          className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary hover:bg-gray-50"
                        >
                          View
                          <span className="material-icons-outlined ml-1 text-sm">arrow_forward</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
};

const StatTile = ({ label, value, tone = 'primary' }) => {
  const toneClass = tone === 'green' ? 'text-green-700' : 'text-primary';
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
};

export default AdminVoters;
