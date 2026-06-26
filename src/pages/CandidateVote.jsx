import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import CandidateAvatar from '../components/elections/CandidateAvatar';
import CountdownBadge from '../components/elections/CountdownBadge';
import ElectionStatusPill from '../components/elections/ElectionStatusPill';
import { useAuth } from '../hooks/useAuth';
import {
  canVoteInElection,
  castElectionVote,
  formatDateTime,
  getCandidateForVote,
  getCandidateCvSignedUrl,
  getMyVotes,
  subscribeToElectionChanges,
  voteMessages,
} from '../lib/elections';
import { logDevError } from '../lib/logger';

const CandidateVote = () => {
  const { electionSlug, candidateSlug } = useParams();
  const { user, profile } = useAuth();
  const [election, setElection] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [candidateCvUrl, setCandidateCvUrl] = useState('');
  const [vote, setVote] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ type: null, message: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadVotePage = useCallback(async () => {
    const { election: loadedElection, candidate: loadedCandidate } = await getCandidateForVote(electionSlug, candidateSlug);

    if (!loadedElection || !loadedCandidate) {
      setError('This nominee link is not available.');
      setLoading(false);
      return;
    }

    const voteMap = await getMyVotes([loadedElection.id]);
    let cvUrl = '';
    if (loadedCandidate.cv_path) {
      try {
        cvUrl = await getCandidateCvSignedUrl(loadedCandidate.cv_path);
      } catch (cvError) {
        logDevError('Unable to create nominee CV link:', cvError);
      }
    }

    setElection(loadedElection);
    setCandidate(loadedCandidate);
    setCandidateCvUrl(cvUrl);
    setVote(voteMap[loadedElection.id] || null);
    setLoading(false);
  }, [candidateSlug, electionSlug]);

  useEffect(() => {
    setLoading(true);
    setError('');
    loadVotePage().catch((loadError) => {
      setError(loadError.message || 'Unable to load nominee.');
      setLoading(false);
    });
  }, [loadVotePage]);

  useEffect(() => {
    if (!election || !user) return undefined;

    return subscribeToElectionChanges({
      electionId: election.id,
      voterId: user.id,
      onChange: () => {
        loadVotePage().catch((loadError) => setToast({
          type: 'error',
          message: loadError.message || 'Unable to refresh vote status.',
        }));
      },
    });
  }, [election, loadVotePage, user]);

  const voteState = useMemo(() => canVoteInElection(election, profile, vote, candidate), [candidate, election, profile, vote]);
  const votedForThisCandidate = Boolean(voteState.candidateVote);

  const submitVote = async () => {
    if (!voteState.allowed || !confirmed || submitting) return;

    setSubmitting(true);
    setToast({ type: null, message: '' });

    try {
      const result = await castElectionVote(election.slug, candidate.slug);
      const voteMap = await getMyVotes([election.id]);
      setVote(voteMap[election.id] || null);
      setToast({
        type: result.ok ? 'success' : 'info',
        message: voteMessages[result.code] || 'Vote status updated.',
      });
    } catch (voteError) {
      setToast({
        type: 'error',
        message: voteError.message || 'Your vote could not be recorded. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard?.writeText(window.location.href);
    setToast({ type: 'success', message: 'Nominee link copied.' });
  };

  if (loading) return <PageState text="Loading voting page..." />;
  if (error) return <PageState icon="error" title="Nominee unavailable" text={error} />;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f9fc]">
      <SEO
        title={`Vote for ${candidate.full_name}`}
        description={`${candidate.full_name} nominee profile for ${election.title}.`}
        keywords="SGIHPBP vote nominee"
      />

      <section className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-8">
          <Link to={`/elections/${election.slug}`} className="inline-flex items-center text-sm font-bold text-primary hover:underline">
            <span className="material-icons-outlined mr-1 text-base">arrow_back</span>
            Back to nominees
          </Link>
          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <ElectionStatusPill election={election} />
                <CountdownBadge election={election} />
              </div>
              <h1 className="safe-wrap mt-4 font-display text-2xl font-bold leading-tight text-primary sm:text-3xl md:text-4xl">{election.title}</h1>
              <p className="safe-wrap mt-2 text-sm font-semibold text-gray-600">
                {formatDateTime(election.starts_at)} to {formatDateTime(election.ends_at)}
              </p>
            </div>
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-primary shadow-sm transition hover:bg-gray-50 sm:w-auto"
            >
              <span className="material-icons-outlined mr-2 text-base">ios_share</span>
              Share nominee link
            </button>
          </div>
        </div>
      </section>

      <section className="container mx-auto grid gap-6 px-4 py-10 lg:grid-cols-[1fr_0.45fr]">
        <article className="max-w-full overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <CandidateAvatar candidate={candidate} size="lg" className="h-28 w-28 flex-shrink-0 text-3xl" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-DEFAULT">Nominee Profile</p>
              <h2 className="safe-wrap mt-3 text-2xl font-bold leading-tight text-primary sm:text-3xl">{candidate.full_name}</h2>
              <p className="safe-wrap mt-2 text-lg font-bold text-gray-700">{candidate.position}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoTile label="Registration No." value={candidate.registration_no} />
                <InfoTile label="Election" value={election.title} />
                {candidate.current_designation && <InfoTile label="Designation" value={candidate.current_designation} />}
                {candidate.institution && <InfoTile label="Institution" value={candidate.institution} />}
                {candidate.qualification && <InfoTile label="Qualification" value={candidate.qualification} />}
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-gray-100 bg-[#fbfcfe] p-5">
            <h3 className="text-lg font-bold text-primary">Message to voters</h3>
            <p className="safe-wrap mt-3 whitespace-pre-wrap text-base leading-7 text-gray-700">
              {candidate.message || 'The admin has not added a nominee message yet.'}
            </p>
          </div>

          <ProfileSection title="Short CV / Profile Summary" value={candidate.profile_summary} />
          <ProfileSection title="Key Achievements" value={candidate.key_achievements} />
          <ProfileSection title="Vision / Agenda for Term" value={candidate.agenda} />

          {candidate.cv_path && (
            <div className="mt-5 rounded-lg border border-gray-100 bg-[#fbfcfe] p-5">
              <h3 className="text-lg font-bold text-primary">Uploaded CV</h3>
              <p className="mt-2 text-sm text-gray-600">
                {candidate.cv_file_name || 'Nominee CV document'}
              </p>
              {candidateCvUrl ? (
                <a
                  href={candidateCvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-blue-900 sm:w-auto"
                >
                  <span className="material-icons-outlined mr-2 text-base">description</span>
                  Open CV
                </a>
              ) : (
                <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                  CV link could not be prepared. Please refresh or contact admin.
                </p>
              )}
            </div>
          )}
        </article>

        <aside className="max-w-full overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-DEFAULT">Vote Confirmation</p>
          <h2 className="safe-wrap mt-3 text-2xl font-bold text-primary">
            {votedForThisCandidate ? 'Vote recorded' : voteState.positionLimitReached ? 'Post limit reached' : 'Cast your vote'}
          </h2>

          {(votedForThisCandidate || voteState.positionLimitReached) ? (
            <div className="mt-5 rounded-lg border border-green-100 bg-green-50 p-4 text-green-800">
              <p className="font-bold">
                {votedForThisCandidate
                  ? 'Your vote is recorded for this nominee.'
                  : voteState.reason}
              </p>
              <p className="mt-1 text-sm">
                {votedForThisCandidate
                  ? 'No further action is needed. You can safely leave this page.'
                  : 'Open another post if you still have voting rights there.'}
              </p>
            </div>
          ) : (
            <>
              <div className="mt-5 rounded-lg border border-gray-100 bg-[#fbfcfe] p-4">
                <p className="text-sm leading-6 text-gray-700">
                  This action follows the vote limit for this post. Please review the nominee details before confirming.
                </p>
              </div>

              {!voteState.allowed && voteState.reason && (
                <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                  {voteState.reason}
                </div>
              )}

              <label className="safe-wrap mt-5 flex items-start gap-3 rounded-lg border border-gray-200 p-4 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  disabled={!voteState.allowed}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary"
                />
                I confirm I want to vote for {candidate.full_name} in this election.
              </label>

              <button
                type="button"
                onClick={submitVote}
                disabled={!voteState.allowed || !confirmed || submitting}
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-primary px-5 py-4 font-bold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-icons-outlined mr-2">how_to_vote</span>
                {submitting ? 'Recording vote...' : 'Submit Vote'}
              </button>
            </>
          )}

          {toast.message && (
            <div className={`mt-5 rounded-lg border p-4 text-sm font-semibold ${
              toast.type === 'success'
                ? 'border-green-100 bg-green-50 text-green-700'
                : toast.type === 'error'
                  ? 'border-red-100 bg-red-50 text-red-700'
                  : 'border-blue-100 bg-blue-50 text-blue-700'
            }`}>
              {toast.message}
            </div>
          )}
        </aside>
      </section>
    </main>
  );
};

const InfoTile = ({ label, value }) => (
  <div className="rounded-lg border border-gray-100 bg-white p-4">
    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
    <p className="safe-wrap mt-2 font-bold text-gray-900">{value}</p>
  </div>
);

const ProfileSection = ({ title, value }) => {
  if (!value) return null;

  return (
    <div className="mt-5 rounded-lg border border-gray-100 bg-[#fbfcfe] p-5">
      <h3 className="text-lg font-bold text-primary">{title}</h3>
      <p className="safe-wrap mt-3 whitespace-pre-wrap text-base leading-7 text-gray-700">{value}</p>
    </div>
  );
};

const PageState = ({ icon = 'progress_activity', title = 'Loading', text }) => (
  <main className="grid min-h-[60vh] place-items-center bg-[#f7f9fc] px-4">
    <div className="max-w-lg rounded-lg border border-gray-100 bg-white p-8 text-center shadow-sm">
      <span className={`material-symbols-outlined text-5xl text-gold-DEFAULT ${icon === 'progress_activity' ? 'animate-spin' : ''}`}>{icon}</span>
      <h1 className="mt-4 text-2xl font-bold text-primary">{title}</h1>
      <p className="mt-2 text-gray-600">{text}</p>
    </div>
  </main>
);

export default CandidateVote;

