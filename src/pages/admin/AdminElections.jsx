import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminShell from '../../components/admin/AdminShell';
import SEO from '../../components/SEO';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import ElectionStatusPill from '../../components/elections/ElectionStatusPill';
import {
  archiveElection,
  deleteElection,
  electionRuntimeStatus,
  formatDateTime,
  listElectionVotes,
  listElections,
} from '../../lib/elections';

const AdminElections = () => {
  const [elections, setElections] = useState([]);
  const [voteCounts, setVoteCounts] = useState({});
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [actionStatus, setActionStatus] = useState({ type: null, message: '' });

  const loadElections = useCallback(async () => {
    const rows = await listElections({ admin: true });
    const pairs = await Promise.all(rows.map(async (election) => [election.id, (await listElectionVotes(election.id)).length]));
    setElections(rows);
    setVoteCounts(Object.fromEntries(pairs));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadElections().catch((loadError) => {
      setError(loadError.message || 'Unable to load elections.');
      setLoading(false);
    });
  }, [loadElections]);

  const filtered = useMemo(() => {
    if (filter === 'all') return elections;
    return elections.filter((election) => electionRuntimeStatus(election) === filter || election.status === filter);
  }, [elections, filter]);

  const runPendingAction = async () => {
    if (!pendingAction) return;
    try {
      if (pendingAction.kind === 'archive') {
        await archiveElection(pendingAction.election.id);
        setActionStatus({ type: 'success', message: 'Election archived. It is hidden from voters but kept for audit.' });
      } else if (pendingAction.kind === 'delete') {
        await deleteElection(pendingAction.election.id);
        setActionStatus({ type: 'success', message: 'Election deleted.' });
      }
      setPendingAction(null);
      await loadElections();
    } catch (actionError) {
      setActionStatus({ type: 'error', message: actionError.message || 'Action failed.' });
    }
  };

  const requestDelete = (election) => {
    const hasVotes = (voteCounts[election.id] || 0) > 0;
    setPendingAction({
      kind: hasVotes ? 'archive' : 'delete',
      election,
      hasVotes,
    });
  };

  return (
    <AdminShell
      title="Elections"
      description="Create election windows, publish nominees and open monitoring dashboards."
      action={(
        <Link to="/admin/elections/new" className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900">
          <span className="material-icons-outlined mr-1 text-base">add</span>
          New Election
        </Link>
      )}
    >
      <SEO title="Admin Elections" description="Manage governance elections." keywords="admin elections" />

      {actionStatus.message && (
        <div className={`mb-6 rounded-lg border p-4 text-sm font-semibold ${
          actionStatus.type === 'success' ? 'border-green-100 bg-green-50 text-green-700' : 'border-red-100 bg-red-50 text-red-700'
        }`}>
          {actionStatus.message}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.kind === 'archive' ? 'Archive election?' : 'Delete election?'}
        body={
          pendingAction?.kind === 'archive'
            ? `"${pendingAction?.election.title}" already has votes recorded. To keep the audit trail intact, it will be archived (hidden from voters) instead of deleted. Votes stay untouched.`
            : `"${pendingAction?.election.title}" has no recorded votes yet, so it can be deleted permanently. Nominees attached to it will also be removed. This cannot be undone.`
        }
        confirmLabel={pendingAction?.kind === 'archive' ? 'Archive' : 'Delete'}
        destructive={pendingAction?.kind === 'delete'}
        onConfirm={runPendingAction}
        onCancel={() => setPendingAction(null)}
      />

      <div className="grid gap-6">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Governance Control</p>
              <h2 className="mt-1 text-2xl font-bold text-primary">Election register</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {['all', 'draft', 'scheduled', 'active', 'closed', 'archived'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-lg px-3 py-2 text-sm font-bold capitalize transition ${
                    filter === item ? 'bg-primary text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        {loading && <PanelState text="Loading elections..." />}
        {error && <ErrorPanel message={error} />}

        {!loading && !error && (
          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Election</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Nominees</th>
                    <th className="px-4 py-3">Votes</th>
                    <th className="px-4 py-3">Window</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((election) => (
                    <tr key={election.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link to={`/admin/elections/${election.slug}`} className="font-bold text-primary hover:underline">
                          {election.title}
                        </Link>
                        {election.description && <p className="mt-1 max-w-md text-xs text-gray-500">{election.description}</p>}
                      </td>
                      <td className="px-4 py-3"><ElectionStatusPill election={election} /></td>
                      <td className="px-4 py-3 font-bold text-gray-900">{election.candidates.length}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{voteCounts[election.id] || 0}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDateTime(election.starts_at)} to {formatDateTime(election.ends_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <ActionLink to={`/admin/elections/${election.slug}`}>Edit</ActionLink>
                          <ActionLink to={`/admin/elections/${election.slug}/candidates`}>Nominees</ActionLink>
                          <ActionLink to={`/admin/elections/${election.slug}/votes`}>Votes</ActionLink>
                          <button
                            type="button"
                            onClick={() => requestDelete(election)}
                            className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
                          >
                            {(voteCounts[election.id] || 0) > 0 ? 'Archive' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-10 text-center font-semibold text-gray-500">
                        No elections match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AdminShell>
  );
};

const ActionLink = ({ to, children }) => (
  <Link to={to} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-gray-50">
    {children}
  </Link>
);

const PanelState = ({ text }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
    <span className="material-symbols-outlined animate-spin text-4xl text-gold-DEFAULT">progress_activity</span>
    <p className="mt-3 font-bold text-primary">{text}</p>
  </div>
);

const ErrorPanel = ({ message }) => (
  <div className="rounded-lg border border-red-100 bg-red-50 p-5 font-semibold text-red-700">{message}</div>
);

export default AdminElections;
