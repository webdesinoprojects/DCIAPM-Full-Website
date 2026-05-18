import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import CandidateAvatar from '../components/elections/CandidateAvatar';
import CountdownBadge from '../components/elections/CountdownBadge';
import ElectionStatusPill from '../components/elections/ElectionStatusPill';
import { useAuth } from '../hooks/useAuth';
import {
  canVoteInElection,
  formatDateTime,
  getElectionWithCandidates,
  getMyVotes,
  subscribeToElectionChanges,
} from '../lib/elections';

const ElectionDetail = () => {
  const { electionSlug } = useParams();
  const { user, profile } = useAuth();
  const [election, setElection] = useState(null);
  const [vote, setVote] = useState(null);
  const [viewMode, setViewMode] = useState('cards');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadElection = useCallback(async () => {
    const row = await getElectionWithCandidates(electionSlug);
    if (!row) {
      setError('This election is not available.');
      setLoading(false);
      return;
    }

    const voteMap = await getMyVotes([row.id]);
    setElection(row);
    setVote(voteMap[row.id] || null);
    setLoading(false);
  }, [electionSlug]);

  useEffect(() => {
    setLoading(true);
    setError('');
    loadElection().catch((loadError) => {
      setError(loadError.message || 'Unable to load election.');
      setLoading(false);
    });
  }, [loadElection]);

  useEffect(() => {
    if (!election || !user) return undefined;

    return subscribeToElectionChanges({
      electionId: election.id,
      voterId: user.id,
      onChange: () => {
        loadElection().catch((loadError) => setError(loadError.message || 'Unable to refresh election.'));
      },
    });
  }, [election, loadElection, user]);

  const voteState = useMemo(() => canVoteInElection(election, profile, vote), [election, profile, vote]);

  if (loading) return <PageState text="Loading nominees..." />;
  if (error) return <PageState icon="error" title="Election unavailable" text={error} />;

  return (
    <main className="min-h-screen bg-[#f7f9fc]">
      <SEO
        title={election.title}
        description={election.description || 'Election nominees and voting page.'}
        keywords="SGIHPBP election nominees"
      />

      <section className="border-b border-gray-200 bg-white py-10">
        <div className="container mx-auto px-4">
          <Link to="/account" className="inline-flex items-center text-sm font-bold text-primary hover:underline">
            <span className="material-icons-outlined mr-1 text-base">arrow_back</span>
            Back to dashboard
          </Link>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <ElectionStatusPill election={election} />
                <CountdownBadge election={election} />
              </div>
              <h1 className="mt-4 font-display text-3xl font-bold text-primary md:text-4xl">{election.title}</h1>
              {election.description && <p className="mt-3 max-w-3xl text-gray-600">{election.description}</p>}
              <p className="mt-3 text-sm font-semibold text-gray-500">
                {formatDateTime(election.starts_at)} to {formatDateTime(election.ends_at)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-[#fbfcfe] px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Your vote</p>
              <p className="mt-1 font-bold text-primary">{vote?.candidate?.full_name || 'Not recorded yet'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        {!voteState.allowed && voteState.reason && (
          <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4 text-blue-800">
            <p className="font-bold">Voting note</p>
            <p className="mt-1 text-sm">{voteState.reason}</p>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary">Nominees</h2>
            <p className="mt-1 text-sm text-gray-600">
              Select a nominee card or row to open the dedicated voting link.
            </p>
          </div>
          <div className="inline-flex w-fit rounded-lg bg-gray-100 p-1">
            <ToggleButton active={viewMode === 'cards'} onClick={() => setViewMode('cards')} icon="grid_view" label="Cards" />
            <ToggleButton active={viewMode === 'table'} onClick={() => setViewMode('table')} icon="table_rows" label="Table" />
          </div>
        </div>

        {viewMode === 'cards' ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {election.candidates.map((candidate) => (
              <NomineeCard
                key={candidate.id}
                election={election}
                candidate={candidate}
                selected={vote?.candidate_id === candidate.id}
                voteState={voteState}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Nominee</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Registration</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {election.candidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/elections/${election.slug}/candidates/${candidate.slug}`} className="flex items-center gap-3 font-bold text-primary hover:underline">
                        <CandidateAvatar candidate={candidate} size="sm" />
                        {candidate.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{candidate.position}</td>
                    <td className="px-4 py-3 text-gray-600">{candidate.registration_no}</td>
                    <td className="max-w-md px-4 py-3 text-gray-600">{candidate.message || 'No message added'}</td>
                    <td className="px-4 py-3">
                      <Link to={`/elections/${election.slug}/candidates/${candidate.slug}`} className="font-bold text-primary hover:underline">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};

const NomineeCard = ({ election, candidate, selected, voteState }) => (
  <Link
    to={`/elections/${election.slug}/candidates/${candidate.slug}`}
    className="group rounded-lg border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
  >
    <div className="flex items-start gap-4">
      <CandidateAvatar candidate={candidate} size="lg" />
      <div className="min-w-0">
        <h3 className="text-xl font-bold text-primary group-hover:underline">{candidate.full_name}</h3>
        <p className="mt-1 text-sm font-bold text-gold-DEFAULT">{candidate.position}</p>
        <p className="mt-1 text-xs font-semibold text-gray-500">Reg. {candidate.registration_no}</p>
      </div>
    </div>
    {candidate.message && (
      <p className="mt-5 text-sm leading-6 text-gray-600">{candidate.message}</p>
    )}
    <span className={`mt-5 inline-flex rounded-lg px-4 py-2 text-sm font-bold ${
      selected
        ? 'bg-green-50 text-green-700'
        : voteState.allowed
          ? 'bg-primary text-white'
          : 'bg-gray-100 text-gray-600'
    }`}>
      {selected ? 'Your vote' : voteState.allowed ? 'Open vote page' : 'View details'}
    </span>
  </Link>
);

const ToggleButton = ({ active, onClick, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-bold transition ${
      active ? 'bg-white text-primary shadow' : 'text-gray-600'
    }`}
  >
    <span className="material-icons-outlined mr-1 text-base">{icon}</span>
    {label}
  </button>
);

const PageState = ({ icon = 'progress_activity', title = 'Loading', text }) => (
  <main className="grid min-h-[60vh] place-items-center bg-[#f7f9fc] px-4">
    <div className="max-w-lg rounded-lg border border-gray-100 bg-white p-8 text-center shadow-sm">
      <span className={`material-symbols-outlined text-5xl text-gold-DEFAULT ${icon === 'progress_activity' ? 'animate-spin' : ''}`}>{icon}</span>
      <h1 className="mt-4 text-2xl font-bold text-primary">{title}</h1>
      <p className="mt-2 text-gray-600">{text}</p>
    </div>
  </main>
);

export default ElectionDetail;
