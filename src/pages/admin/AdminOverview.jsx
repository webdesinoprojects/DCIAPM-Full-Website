import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminShell from '../../components/admin/AdminShell';
import SEO from '../../components/SEO';
import ElectionStatusPill from '../../components/elections/ElectionStatusPill';
import {
  countActiveVoters,
  electionRuntimeStatus,
  formatDateTime,
  listElectionVotes,
  listElections,
  summarizeElectionVotes,
} from '../../lib/elections';

const AdminOverview = () => {
  const [elections, setElections] = useState([]);
  const [voteMap, setVoteMap] = useState({});
  const [activeVoters, setActiveVoters] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async () => {
    const rows = await listElections({ admin: true });
    const votePairs = await Promise.all(rows.map(async (election) => [election.id, await listElectionVotes(election.id)]));
    const voters = await countActiveVoters();

    setElections(rows);
    setVoteMap(Object.fromEntries(votePairs));
    setActiveVoters(voters);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOverview().catch((loadError) => {
      setError(loadError.message || 'Unable to load admin dashboard.');
      setLoading(false);
    });
  }, [loadOverview]);

  const totals = useMemo(() => {
    const totalVotes = Object.values(voteMap).reduce((sum, votes) => sum + votes.length, 0);
    const activeElectionCount = elections.filter((election) => electionRuntimeStatus(election) === 'active').length;
    const nomineeCount = elections.reduce((sum, election) => sum + election.candidates.length, 0);
    const publishedCount = elections.filter((election) => election.status !== 'draft').length;

    return {
      totalVotes,
      activeElectionCount,
      nomineeCount,
      publishedCount,
      turnout: activeVoters ? Math.round((totalVotes / activeVoters) * 100) : 0,
    };
  }, [activeVoters, elections, voteMap]);

  const electionSummaries = elections
    .filter((election) => election.status !== 'archived')
    .slice(0, 5)
    .map((election) => ({
      election,
      summary: summarizeElectionVotes(election, voteMap[election.id] || [], activeVoters),
    }));

  return (
    <AdminShell
      title="Operations Dashboard"
      description="Governance, member operations and upcoming admin modules."
      action={(
        <Link to="/admin/elections/new" className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900 sm:inline-flex">
          <span className="material-icons-outlined mr-1 text-base">add</span>
          New Election
        </Link>
      )}
    >
      <SEO title="Admin Dashboard" description="DC-IAPM administration dashboard." keywords="admin dashboard, election admin" />

      {loading && <PanelState text="Loading dashboard..." />}
      {error && <ErrorPanel message={error} />}

      {!loading && !error && (
        <div className="grid gap-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon="how_to_vote" label="Active Elections" value={totals.activeElectionCount} detail={`${totals.publishedCount} published`} />
            <MetricCard icon="groups" label="Eligible Voters" value={activeVoters} detail="Active user profiles" />
            <MetricCard icon="badge" label="Nominees" value={totals.nomineeCount} detail="Across all elections" />
            <MetricCard icon="task_alt" label="Votes Recorded" value={totals.totalVotes} detail={`${totals.turnout}% overall turnout`} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Live Governance</p>
                  <h2 className="mt-1 text-2xl font-bold text-primary">Election leadership</h2>
                </div>
                <Link to="/admin/elections" className="text-sm font-bold text-primary hover:underline">Manage elections</Link>
              </div>

              <div className="mt-5 grid gap-4">
                {electionSummaries.length === 0 ? (
                  <EmptyLine text="No elections created yet." />
                ) : (
                  electionSummaries.map(({ election, summary }) => (
                    <ElectionLeadershipRow key={election.id} election={election} summary={summary} />
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Admin Roadmap</p>
              <h2 className="mt-1 text-2xl font-bold text-primary">Operational areas</h2>
              <div className="mt-5 grid gap-3">
                {[
                  ['Member directory', 'Replace spreadsheet workflows with verified member records.'],
                  ['Membership applications', 'Review applications, verify payments and send receipt/certificate files.'],
                  ['Event registrations', 'Manage event forms, payments and attendance lists.'],
                  ['Publications', 'Publish guidelines, journals and resources.'],
                  ['Messages', 'Track contact requests and follow-ups.'],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-4">
                    <p className="font-bold text-primary">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-gray-600">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Recent Elections</p>
                <h2 className="mt-1 text-2xl font-bold text-primary">Control table</h2>
              </div>
              <Link to="/admin/monitor" className="inline-flex items-center text-sm font-bold text-primary hover:underline">
                Open vote monitor
                <span className="material-icons-outlined ml-1 text-base">arrow_forward</span>
              </Link>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Election</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Window</th>
                    <th className="px-4 py-3">Votes</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {elections.slice(0, 6).map((election) => (
                    <tr key={election.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-primary">{election.title}</td>
                      <td className="px-4 py-3"><ElectionStatusPill election={election} /></td>
                      <td className="px-4 py-3 text-gray-600">{formatDateTime(election.starts_at)} to {formatDateTime(election.ends_at)}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{voteMap[election.id]?.length || 0}</td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/elections/${election.slug}/votes`} className="font-bold text-primary hover:underline">Monitor</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  );
};

const ElectionLeadershipRow = ({ election, summary }) => {
  const leaderName = summary.leader?.candidate.full_name || 'No votes yet';
  const leaderVotes = summary.leader?.voteCount || 0;

  return (
    <div className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <ElectionStatusPill election={election} />
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{summary.totalVotes} votes</span>
          </div>
          <p className="mt-2 font-bold text-primary">{election.title}</p>
          <p className="mt-1 text-sm text-gray-600">
            Leading: <span className="font-bold">{leaderName}</span> with {leaderVotes} votes
          </p>
        </div>
        <div className="min-w-[160px] rounded-lg border border-gray-100 bg-white px-4 py-3 text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Margin</p>
          <p className="mt-1 text-2xl font-bold text-primary">{summary.margin}</p>
        </div>
      </div>
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

const PanelState = ({ text }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
    <span className="material-symbols-outlined animate-spin text-4xl text-gold-DEFAULT">progress_activity</span>
    <p className="mt-3 font-bold text-primary">{text}</p>
  </div>
);

const ErrorPanel = ({ message }) => (
  <div className="rounded-lg border border-red-100 bg-red-50 p-5 font-semibold text-red-700">{message}</div>
);

const EmptyLine = ({ text }) => (
  <div className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-5 text-sm font-semibold text-gray-600">{text}</div>
);

export default AdminOverview;
