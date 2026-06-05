import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import {
  electionRuntimeStatus,
  formatDateTime,
  listPublicElectionSummaries,
} from '../lib/elections';
import { logDevError } from '../lib/logger';

const statusStyles = {
  active: 'bg-green-50 text-green-700 border-green-100',
  scheduled: 'bg-blue-50 text-blue-700 border-blue-100',
  closed: 'bg-gray-100 text-gray-700 border-gray-200',
};

const DcIapmElection = () => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    listPublicElectionSummaries({ limit: 30 })
      .then((rows) => {
        if (!cancelled) setElections(rows);
      })
      .catch((loadError) => {
        logDevError('Public election list failed:', loadError);
        if (!cancelled) setError('Unable to load election details right now.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="bg-[#f7f9fc]">
      <SEO
        title="DC-IAPM Election"
        description="View DC-IAPM election notices, nominations and voting links."
        keywords="DC-IAPM election, voting, nominations"
      />

      <section className="bg-primary py-14 text-white">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-light">DC-IAPM Election</p>
          <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">Election Notices and Voting</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-gray-200 md:text-base">
            View election announcements, nomination pages and voting links. Voting requires a verified user login.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        {loading ? (
          <PageState text="Loading elections..." />
        ) : error ? (
          <PageState icon="error" title="Election details unavailable" text={error} />
        ) : elections.length === 0 ? (
          <PageState icon="ballot" title="No current election" text="No scheduled or active election is published yet." />
        ) : (
          <div className="mx-auto grid max-w-5xl gap-4">
            {elections.map((election) => (
              <ElectionCard key={election.id} election={election} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

const ElectionCard = ({ election }) => {
  const runtimeStatus = electionRuntimeStatus(election);
  const style = statusStyles[runtimeStatus] || statusStyles.scheduled;
  const buttonLabel = runtimeStatus === 'active' ? 'Vote Now' : 'View Nominations';

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${style}`}>
              {runtimeStatus}
            </span>
            <span className="text-xs font-semibold text-gray-500">
              {formatDateTime(election.starts_at)} to {formatDateTime(election.ends_at)}
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-bold text-primary">{election.title}</h2>
          {election.description && (
            <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-gray-600">
              {election.description}
            </p>
          )}
        </div>

        <Link
          to={`/elections/${election.slug}`}
          className={`inline-flex shrink-0 items-center justify-center rounded-lg px-4 py-3 text-sm font-bold transition ${
            runtimeStatus === 'active'
              ? 'bg-primary text-white hover:bg-blue-900'
              : 'border border-gray-200 bg-white text-primary hover:bg-gray-50'
          }`}
        >
          <span className="material-icons-outlined mr-2 text-base">
            {runtimeStatus === 'active' ? 'how_to_vote' : 'ballot'}
          </span>
          {buttonLabel}
        </Link>
      </div>
    </article>
  );
};

const PageState = ({ icon = 'progress_activity', title = 'Loading', text }) => (
  <div className="mx-auto max-w-xl rounded-lg border border-gray-100 bg-white p-8 text-center shadow-sm">
    <span className={`material-symbols-outlined text-5xl text-gold-DEFAULT ${icon === 'progress_activity' ? 'animate-spin' : ''}`}>{icon}</span>
    <h2 className="mt-4 text-2xl font-bold text-primary">{title}</h2>
    <p className="mt-2 text-gray-600">{text}</p>
  </div>
);

export default DcIapmElection;
