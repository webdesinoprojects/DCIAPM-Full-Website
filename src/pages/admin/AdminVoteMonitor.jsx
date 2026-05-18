import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminShell from '../../components/admin/AdminShell';
import SEO from '../../components/SEO';
import CandidateAvatar from '../../components/elections/CandidateAvatar';
import ElectionStatusPill from '../../components/elections/ElectionStatusPill';
import {
  countActiveVoters,
  formatDateTime,
  getElectionWithCandidates,
  listElectionVotes,
  listElections,
  subscribeToElectionChanges,
  summarizeElectionVotes,
} from '../../lib/elections';

const AdminVoteMonitor = () => {
  const { electionSlug } = useParams();
  const [elections, setElections] = useState([]);
  const [election, setElection] = useState(null);
  const [votes, setVotes] = useState([]);
  const [activeVoters, setActiveVoters] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMonitor = useCallback(async () => {
    const rows = await listElections({ admin: true });
    const selected = electionSlug
      ? await getElectionWithCandidates(electionSlug)
      : rows.find((row) => row.status === 'active') || rows[0] || null;

    const voteRows = selected ? await listElectionVotes(selected.id) : [];
    const voters = await countActiveVoters();

    setElections(rows);
    setElection(selected);
    setVotes(voteRows);
    setActiveVoters(voters);
    setLoading(false);
  }, [electionSlug]);

  useEffect(() => {
    loadMonitor().catch((loadError) => {
      setError(loadError.message || 'Unable to load vote monitor.');
      setLoading(false);
    });
  }, [loadMonitor]);

  useEffect(() => {
    if (!election) return undefined;
    return subscribeToElectionChanges({
      electionId: election.id,
      onChange: () => {
        loadMonitor().catch((loadError) => setError(loadError.message || 'Unable to refresh monitor.'));
      },
    });
  }, [election, loadMonitor]);

  const summary = useMemo(
    () => summarizeElectionVotes(election, votes, activeVoters),
    [activeVoters, election, votes],
  );

  return (
    <AdminShell
      title="Vote Monitor"
      description="Realtime turnout, leading nominee and vote stream for administrators."
      action={election && (
        <Link to={`/admin/elections/${election.slug}/turnout`} className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900 sm:inline-flex">
          Turnout
        </Link>
      )}
    >
      <SEO title="Vote Monitor" description="Realtime admin vote monitor." keywords="vote monitor admin" />

      {loading && <PanelState text="Loading vote monitor..." />}
      {error && <ErrorPanel message={error} />}

      {!loading && !error && !election && (
        <EmptyPanel title="No election found" text="Create an election first, then the monitor will show vote activity." />
      )}

      {!loading && !error && election && (
        <div className="grid gap-6">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <ElectionStatusPill election={election} />
                  <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-500">
                    {formatDateTime(election.starts_at)} to {formatDateTime(election.ends_at)}
                  </span>
                </div>
                <h2 className="mt-3 text-2xl font-bold text-primary">{election.title}</h2>
              </div>
              <ElectionSelector elections={elections} activeSlug={election.slug} />
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Votes Recorded" value={summary.totalVotes} detail="Total submitted votes" />
            <MetricCard label="Eligible Voters" value={activeVoters} detail="Active user profiles" />
            <MetricCard label="Turnout" value={`${summary.turnoutPercent}%`} detail="Based on active voters" />
            <MetricCard label="Leading Margin" value={summary.margin} detail={summary.leader?.candidate.full_name || 'No leader yet'} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Current Leading</p>
              <h2 className="mt-1 text-2xl font-bold text-primary">Nominee standings</h2>
              <div className="mt-5 grid gap-4">
                {summary.candidateStats.map((stat, index) => (
                  <StandingRow key={stat.candidate.id} stat={stat} rank={index + 1} totalVotes={summary.totalVotes} />
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Vote Stream</p>
              <h2 className="mt-1 text-2xl font-bold text-primary">Recent records</h2>
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Voter</th>
                      <th className="px-4 py-3">Nominee</th>
                      <th className="px-4 py-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {votes.slice(0, 20).map((vote) => (
                      <tr key={vote.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-bold text-primary">{vote.voter?.full_name || 'Voter'}</p>
                          <p className="text-xs text-gray-500">{vote.voter_registration_no}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{vote.candidate?.full_name || 'Unknown nominee'}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDateTime(vote.created_at)}</td>
                      </tr>
                    ))}
                    {votes.length === 0 && (
                      <tr>
                        <td colSpan="3" className="px-4 py-10 text-center font-semibold text-gray-500">No votes recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  );
};

const ElectionSelector = ({ elections, activeSlug }) => (
  <div className="flex flex-wrap gap-2">
    {elections.slice(0, 6).map((election) => (
      <Link
        key={election.id}
        to={`/admin/elections/${election.slug}/votes`}
        className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
          activeSlug === election.slug ? 'bg-primary text-white' : 'border border-gray-200 bg-white text-primary hover:bg-gray-50'
        }`}
      >
        {election.title}
      </Link>
    ))}
  </div>
);

const StandingRow = ({ stat, rank, totalVotes }) => (
  <article className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-4">
    <div className="flex items-center gap-4">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">#{rank}</div>
      <CandidateAvatar candidate={stat.candidate} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold text-primary">{stat.candidate.full_name}</p>
          <p className="text-sm font-bold text-gray-700">{stat.voteCount} votes · {stat.percent}%</p>
        </div>
        <div className="mt-3 h-2 rounded-full bg-gray-200">
          <div className="h-2 rounded-full bg-primary" style={{ width: `${totalVotes ? stat.percent : 0}%` }} />
        </div>
      </div>
    </div>
  </article>
);

const MetricCard = ({ label, value, detail }) => (
  <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-3 text-3xl font-bold text-primary">{value}</p>
    <p className="mt-2 text-sm font-semibold text-gray-600">{detail}</p>
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

const EmptyPanel = ({ title, text }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
    <span className="material-icons-outlined text-5xl text-gold-DEFAULT">ballot</span>
    <h2 className="mt-4 text-2xl font-bold text-primary">{title}</h2>
    <p className="mt-2 text-gray-600">{text}</p>
  </div>
);

export default AdminVoteMonitor;
