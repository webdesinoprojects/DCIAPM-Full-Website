import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import CandidateAvatar from '../components/elections/CandidateAvatar';
import CountdownBadge from '../components/elections/CountdownBadge';
import ElectionStatusPill from '../components/elections/ElectionStatusPill';
import { useAuth } from '../hooks/useAuth';
import {
  canVoteInElection,
  formatDateTime,
  getMyVotes,
  listElections,
  subscribeToElectionChanges,
} from '../lib/elections';

const ElectionDashboard = () => {
  const { user, profile, profileComplete, signOut } = useAuth();
  const [elections, setElections] = useState([]);
  const [votes, setVotes] = useState({});
  const [viewMode, setViewMode] = useState('cards');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setError('');
    const rows = await listElections();
    const voteMap = await getMyVotes(rows.map((election) => election.id));
    setElections(rows);
    setVotes(voteMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard().catch((loadError) => {
      setError(loadError.message || 'Unable to load elections.');
      setLoading(false);
    });
  }, [loadDashboard]);

  useEffect(() => {
    if (!user || elections.length === 0) return undefined;

    const unsubscribers = elections.map((election) => subscribeToElectionChanges({
      electionId: election.id,
      voterId: user.id,
      onChange: () => {
        loadDashboard().catch((loadError) => setError(loadError.message || 'Unable to refresh elections.'));
      },
    }));

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [elections, loadDashboard, user]);

  const activeCount = useMemo(
    () => elections.filter((election) => election.status === 'active').length,
    [elections],
  );

  return (
    <main className="min-h-screen bg-[#f7f9fc]">
      <SEO
        title="Election Dashboard"
        description="View active SGIHPBP elections and cast verified votes."
        keywords="SGIHPBP election dashboard, voting portal"
      />

      <section className="border-b border-gray-200 bg-white py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-gold-DEFAULT">Member Voting Area</p>
              <h1 className="mt-3 font-display text-3xl font-bold text-primary md:text-4xl">Elections & Nominations</h1>
              <p className="mt-3 max-w-2xl text-gray-600">
                Review nominees, open a shareable voting link, and cast one verified vote per election.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard label="Active Elections" value={activeCount} />
              <StatCard label="Your Status" value={profileComplete ? 'Ready' : 'Incomplete'} />
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        {!profileComplete && (
          <div className="mb-6 flex flex-col gap-4 rounded-lg border border-amber-100 bg-amber-50 p-4 text-amber-800 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-bold">Profile required before voting</p>
              <p className="mt-1 text-sm">
                Your name, registration number and voter photo must be saved before a vote can be recorded.
              </p>
            </div>
            <Link
              to="/complete-profile"
              className="inline-flex items-center justify-center rounded-lg bg-amber-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-800"
            >
              <span className="material-icons-outlined mr-2 text-base">add_a_photo</span>
              Complete profile
            </Link>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Signed in</p>
            <p className="mt-1 font-bold text-primary">{profile?.full_name || user?.email}</p>
            <p className="text-sm text-gray-500">{profile?.registration_no || user?.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ViewToggle value={viewMode} onChange={setViewMode} />
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
            >
              Logout
            </button>
          </div>
        </div>

        {loading && <LoadingBlock text="Loading elections..." />}
        {error && <ErrorBlock message={error} />}

        {!loading && !error && elections.length === 0 && (
          <EmptyState
            icon="event_busy"
            title="No elections available"
            text="Active and scheduled elections will appear here once the admin publishes them."
          />
        )}

        <div className="grid gap-8">
          {elections.map((election) => (
            <section key={election.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ElectionStatusPill election={election} />
                    <CountdownBadge election={election} />
                  </div>
                  <h2 className="mt-4 text-2xl font-bold text-primary">{election.title}</h2>
                  {election.description && (
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">{election.description}</p>
                  )}
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {formatDateTime(election.starts_at)} to {formatDateTime(election.ends_at)}
                  </p>
                </div>
                <Link
                  to={`/elections/${election.slug}`}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-900"
                >
                  View all nominees
                  <span className="material-icons-outlined ml-2 text-base">arrow_forward</span>
                </Link>
              </div>

              {viewMode === 'cards' ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {election.candidates.slice(0, 6).map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      election={election}
                      candidate={candidate}
                      vote={votes[election.id]}
                      profile={profile}
                    />
                  ))}
                </div>
              ) : (
                <CandidateTable
                  election={election}
                  candidates={election.candidates.slice(0, 8)}
                  vote={votes[election.id]}
                  profile={profile}
                />
              )}
            </section>
          ))}
        </div>
      </section>
    </main>
  );
};

const CandidateCard = ({ election, candidate, vote, profile }) => {
  const voteState = canVoteInElection(election, profile, vote);
  const selected = vote?.candidate_id === candidate.id;

  return (
    <article className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-5">
      <div className="flex items-start gap-4">
        <CandidateAvatar candidate={candidate} />
        <div className="min-w-0">
          <h3 className="font-bold text-primary">{candidate.full_name}</h3>
          <p className="mt-1 text-sm font-semibold text-gray-600">{candidate.position}</p>
          <p className="mt-1 text-xs text-gray-500">Reg. {candidate.registration_no}</p>
        </div>
      </div>
      {candidate.message && (
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-600">{candidate.message}</p>
      )}
      <Link
        to={`/elections/${election.slug}/candidates/${candidate.slug}`}
        className={`mt-5 inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-bold transition ${
          selected
            ? 'bg-green-50 text-green-700 ring-1 ring-green-100'
            : voteState.allowed
              ? 'bg-primary text-white hover:bg-blue-900'
              : 'bg-gray-200 text-gray-600'
        }`}
      >
        {selected ? 'Your recorded vote' : voteState.allowed ? 'Open vote page' : 'View nominee'}
      </Link>
    </article>
  );
};

const CandidateTable = ({ election, candidates, vote, profile }) => (
  <div className="mt-6 overflow-x-auto rounded-lg border border-gray-100">
    <table className="min-w-full divide-y divide-gray-100 text-sm">
      <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
        <tr>
          <th className="px-4 py-3">Nominee</th>
          <th className="px-4 py-3">Position</th>
          <th className="px-4 py-3">Registration</th>
          <th className="px-4 py-3">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {candidates.map((candidate) => {
          const voteState = canVoteInElection(election, profile, vote);
          const selected = vote?.candidate_id === candidate.id;
          return (
            <tr key={candidate.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <Link to={`/elections/${election.slug}/candidates/${candidate.slug}`} className="flex items-center gap-3 font-bold text-primary hover:underline">
                  <CandidateAvatar candidate={candidate} size="sm" />
                  {candidate.full_name}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-600">{candidate.position}</td>
              <td className="px-4 py-3 text-gray-600">{candidate.registration_no}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${selected ? 'bg-green-50 text-green-700' : voteState.allowed ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                  {selected ? 'Voted' : voteState.allowed ? 'Open' : 'View only'}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const ViewToggle = ({ value, onChange }) => (
  <div className="inline-flex rounded-lg bg-gray-100 p-1">
    {[
      { value: 'cards', icon: 'grid_view', label: 'Cards' },
      { value: 'table', icon: 'table_rows', label: 'Table' },
    ].map((item) => (
      <button
        key={item.value}
        type="button"
        onClick={() => onChange(item.value)}
        className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-bold transition ${
          value === item.value
            ? 'bg-white text-primary shadow'
            : 'text-gray-600 hover:text-primary'
        }`}
      >
        <span className="material-icons-outlined mr-1 text-base">{item.icon}</span>
        {item.label}
      </button>
    ))}
  </div>
);

const StatCard = ({ label, value }) => (
  <div className="rounded-lg border border-gray-200 bg-[#fbfcfe] px-5 py-4">
    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
  </div>
);

const LoadingBlock = ({ text }) => (
  <div className="rounded-lg border border-gray-100 bg-white p-8 text-center shadow-sm">
    <span className="material-symbols-outlined animate-spin text-4xl text-gold-DEFAULT">progress_activity</span>
    <p className="mt-3 font-bold text-primary">{text}</p>
  </div>
);

const ErrorBlock = ({ message }) => (
  <div className="rounded-lg border border-red-100 bg-red-50 p-5 font-semibold text-red-700">
    {message}
  </div>
);

const EmptyState = ({ icon, title, text }) => (
  <div className="rounded-lg border border-gray-100 bg-white p-10 text-center shadow-sm">
    <span className="material-icons-outlined text-5xl text-gold-DEFAULT">{icon}</span>
    <h2 className="mt-4 text-2xl font-bold text-primary">{title}</h2>
    <p className="mt-2 text-gray-600">{text}</p>
  </div>
);

export default ElectionDashboard;
