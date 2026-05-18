import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminShell from '../../components/admin/AdminShell';
import SEO from '../../components/SEO';
import ElectionStatusPill from '../../components/elections/ElectionStatusPill';
import {
  countActiveVoters,
  formatDateTime,
  getElectionWithCandidates,
  listElectionVotes,
  listElections,
  summarizeElectionVotes,
} from '../../lib/elections';

const AdminTurnout = () => {
  const { electionSlug } = useParams();
  const [elections, setElections] = useState([]);
  const [election, setElection] = useState(null);
  const [votes, setVotes] = useState([]);
  const [activeVoters, setActiveVoters] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTurnout = useCallback(async () => {
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
    loadTurnout().catch((loadError) => {
      setError(loadError.message || 'Unable to load turnout.');
      setLoading(false);
    });
  }, [loadTurnout]);

  const summary = useMemo(
    () => summarizeElectionVotes(election, votes, activeVoters),
    [activeVoters, election, votes],
  );

  return (
    <AdminShell
      title="Turnout Dashboard"
      description="Participation overview for governance elections."
      action={election && (
        <Link to={`/admin/elections/${election.slug}/votes`} className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900 sm:inline-flex">
          Vote Monitor
        </Link>
      )}
    >
      <SEO title="Turnout Dashboard" description="Admin turnout dashboard." keywords="turnout dashboard" />

      {loading && <PanelState text="Loading turnout..." />}
      {error && <ErrorPanel message={error} />}

      {!loading && !error && !election && (
        <EmptyPanel title="No election found" text="Create an election first to view turnout." />
      )}

      {!loading && !error && election && (
        <div className="grid gap-6">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <ElectionStatusPill election={election} />
                <h2 className="mt-3 text-2xl font-bold text-primary">{election.title}</h2>
                <p className="mt-1 text-sm font-semibold text-gray-600">{formatDateTime(election.starts_at)} to {formatDateTime(election.ends_at)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {elections.slice(0, 6).map((row) => (
                  <Link
                    key={row.id}
                    to={`/admin/elections/${row.slug}/turnout`}
                    className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                      row.slug === election.slug ? 'bg-primary text-white' : 'border border-gray-200 bg-white text-primary hover:bg-gray-50'
                    }`}
                  >
                    {row.title}
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Participation</p>
              <div className="mt-6 grid place-items-center">
                <div className="relative grid h-52 w-52 place-items-center rounded-full border-[18px] border-gray-100">
                  <div
                    className="absolute inset-[-18px] rounded-full"
                    style={{
                      background: `conic-gradient(#0A2342 ${summary.turnoutPercent * 3.6}deg, transparent 0deg)`,
                      mask: 'radial-gradient(circle, transparent 56%, black 57%)',
                      WebkitMask: 'radial-gradient(circle, transparent 56%, black 57%)',
                    }}
                  />
                  <div className="text-center">
                    <p className="text-4xl font-bold text-primary">{summary.turnoutPercent}%</p>
                    <p className="mt-1 text-sm font-semibold text-gray-500">turnout</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 grid gap-3">
                <MiniStat label="Votes recorded" value={summary.totalVotes} />
                <MiniStat label="Eligible voters" value={activeVoters} />
                <MiniStat label="Pending voters" value={Math.max(activeVoters - summary.totalVotes, 0)} />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Nominee Split</p>
              <h2 className="mt-1 text-2xl font-bold text-primary">Vote distribution</h2>
              <div className="mt-5 grid gap-4">
                {summary.candidateStats.map((stat) => (
                  <div key={stat.candidate.id} className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-primary">{stat.candidate.full_name}</p>
                        <p className="mt-1 text-sm text-gray-600">{stat.candidate.position}</p>
                      </div>
                      <p className="text-right font-bold text-gray-900">{stat.voteCount} votes<br /><span className="text-sm text-gray-500">{stat.percent}%</span></p>
                    </div>
                    <div className="mt-3 h-3 rounded-full bg-gray-200">
                      <div className="h-3 rounded-full bg-primary" style={{ width: `${summary.totalVotes ? stat.percent : 0}%` }} />
                    </div>
                  </div>
                ))}
                {summary.candidateStats.length === 0 && (
                  <div className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-6 text-center font-semibold text-gray-500">
                    No nominees added yet.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  );
};

const MiniStat = ({ label, value }) => (
  <div className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-4">
    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
  </div>
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
    <span className="material-icons-outlined text-5xl text-gold-DEFAULT">donut_large</span>
    <h2 className="mt-4 text-2xl font-bold text-primary">{title}</h2>
    <p className="mt-2 text-gray-600">{text}</p>
  </div>
);

export default AdminTurnout;
