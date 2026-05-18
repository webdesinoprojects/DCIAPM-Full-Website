import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import { formatEventDate, getEventBySlug } from '../lib/events';

const EventDetail = () => {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEvent = useCallback(async () => {
    const row = await getEventBySlug(slug);
    if (!row) {
      setError('This event is not available.');
      setLoading(false);
      return;
    }
    setEvent(row);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    setError('');
    loadEvent().catch((loadError) => {
      setError(loadError.message || 'Unable to load event.');
      setLoading(false);
    });
  }, [loadEvent]);

  if (loading) {
    return <PageState text="Loading event..." />;
  }
  if (error || !event) {
    return <PageState icon="error" title="Event unavailable" text={error || 'Event not found.'} />;
  }

  const startLabel = formatEventDate(event.starts_at);
  const endLabel = formatEventDate(event.ends_at);

  return (
    <motion.main
      className="min-h-screen bg-[#f7f9fc]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <SEO
        title={event.title}
        description={event.summary || `${event.title} on the DC-IAPM events calendar.`}
        keywords={`${event.title}, DC-IAPM event, pathology event`}
      />

      {event.hero_image_url && (
        <section className="mx-auto w-full max-w-5xl px-4 pt-6 lg:px-6">
          <div className="relative h-64 w-full overflow-hidden rounded-xl bg-gray-200 md:h-80 lg:h-96">
            <img
              src={event.hero_image_url}
              alt={event.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-transparent" />
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-3xl px-4 py-10 lg:px-6">
        <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1">
            <li><Link to="/" className="hover:text-primary hover:underline">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link to="/academics-events" className="hover:text-primary hover:underline">Events</Link></li>
            <li aria-hidden="true">/</li>
            <li className="truncate font-semibold text-gray-700">{event.title}</li>
          </ol>
        </nav>

        <header className="mt-6">
          <h1 className="font-display text-3xl font-bold leading-tight text-primary md:text-4xl lg:text-5xl">
            {event.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-600">
            {startLabel && (
              <span className="inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-gold-DEFAULT">calendar_month</span>
                {startLabel}{endLabel && endLabel !== startLabel ? ` - ${endLabel}` : ''}
              </span>
            )}
            {event.location && (
              <span className="inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-gold-DEFAULT">location_on</span>
                {event.location}
              </span>
            )}
          </div>

          {event.author_name && (
            <div className="mt-6 flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary text-sm font-bold text-white">
                {event.author_photo_url ? (
                  <img src={event.author_photo_url} alt={event.author_name} className="h-full w-full object-cover" />
                ) : (
                  authorInitials(event.author_name)
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Author</p>
                <p className="font-bold text-primary">{event.author_name}</p>
              </div>
            </div>
          )}
        </header>

        <article className="prose prose-slate mt-10 text-base leading-7 text-gray-800">
          {event.summary && (
            <p className="text-lg font-semibold text-gray-700">{event.summary}</p>
          )}
          {event.body ? (
            <div className="mt-6 whitespace-pre-wrap text-gray-700">{event.body}</div>
          ) : (
            !event.summary && (
              <p className="mt-6 italic text-gray-500">No additional details have been published yet.</p>
            )
          )}
        </article>

        <div className="mt-10 flex flex-wrap gap-3">
          {event.register_url && (
            <a
              href={event.register_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-900"
            >
              Register Now
            </a>
          )}
          {event.flyer_url && (
            <a
              href={event.flyer_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-primary px-5 py-3 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Download flyer
            </a>
          )}
          {event.abstract_guidelines_url && (
            <a
              href={event.abstract_guidelines_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-primary px-5 py-3 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Abstract guidelines
            </a>
          )}
        </div>

        <div className="mt-10">
          <Link to="/academics-events" className="inline-flex items-center text-sm font-bold text-primary hover:underline">
            <span className="material-symbols-outlined mr-1 text-base">arrow_back</span>
            Back to events
          </Link>
        </div>
      </section>
    </motion.main>
  );
};

function authorInitials(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'A';
}

const PageState = ({ icon = 'progress_activity', title = 'Loading', text }) => (
  <main className="grid min-h-[60vh] place-items-center bg-[#f7f9fc] px-4">
    <div className="max-w-lg rounded-lg border border-gray-100 bg-white p-8 text-center shadow-sm">
      <span className={`material-symbols-outlined text-5xl text-gold-DEFAULT ${icon === 'progress_activity' ? 'animate-spin' : ''}`}>{icon}</span>
      <h1 className="mt-4 text-2xl font-bold text-primary">{title}</h1>
      <p className="mt-2 text-gray-600">{text}</p>
    </div>
  </main>
);

export default EventDetail;
