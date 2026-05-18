import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import CountdownTimer from '../components/common/CountdownTimer';
import { formatEventDate, listEvents } from '../lib/events';

const AcademicsEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    listEvents()
      .then((rows) => {
        if (mounted) {
          setEvents(rows);
          setLoading(false);
        }
      })
      .catch((loadError) => {
        if (mounted) {
          setError(loadError.message || 'Unable to load events.');
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, []);

  const EventSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-6 md:p-8 flex flex-col md:flex-row gap-6 animate-pulse">
      <div className="flex-grow space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="flex gap-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        </div>
        <div className="space-y-2 mt-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-11/12"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
      <div className="flex flex-col items-center md:items-end gap-4 flex-shrink-0 w-full md:w-auto mt-4 md:mt-0">
        <div className="flex gap-3 w-full justify-center md:justify-end">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-full w-28"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-full w-32"></div>
        </div>
        <div className="w-full md:w-64 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    </div>
  );

  return (
    <motion.main
      className="container mx-auto px-6 py-12 md:py-20 min-h-screen"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <SEO
        title="Academics & Events"
        description="Stay updated with the latest academic events, conferences and workshops organized by DC-IAPM."
        keywords="pathology events, medical conferences, DC-IAPM academics, workshops"
      />
      <div className="text-center max-w-4xl mx-auto mb-16">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-primary dark:text-white mb-4">
          Academics & Events
        </h1>
        <div className="w-24 h-1 bg-yellow-500 mx-auto mb-6"></div>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Explore our calendar of CMEs, workshops and conferences.
        </p>
      </div>

      <div className="grid gap-6">
        {loading ? (
          <>
            <EventSkeleton />
            <EventSkeleton />
            <EventSkeleton />
          </>
        ) : error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-5 font-semibold text-red-700">{error}</div>
        ) : events.length > 0 ? (
          events.map((event, i) => {
            const startLabel = formatEventDate(event.starts_at);
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 md:p-8 flex flex-col md:flex-row gap-6 hover:shadow-lg transition-shadow"
              >
                {event.hero_image_url && (
                  <Link
                    to={`/events/${event.slug}`}
                    className="md:w-56 md:h-40 w-full h-48 shrink-0 overflow-hidden rounded-lg border border-gray-100"
                  >
                    <img src={event.hero_image_url} alt={event.title} className="h-full w-full object-cover" loading="lazy" />
                  </Link>
                )}

                <div className="flex-grow">
                  <Link to={`/events/${event.slug}`} className="block">
                    <h2 className="text-2xl font-bold text-primary dark:text-white mb-3 hover:underline">{event.title}</h2>
                  </Link>
                  <div className="flex flex-wrap gap-4 text-sm mb-4 text-gray-600 dark:text-gray-300">
                    {startLabel && (
                      <div className="flex items-center"><span className="material-symbols-outlined mr-2">calendar_month</span>{startLabel}</div>
                    )}
                    {event.location && (
                      <div className="flex items-center"><span className="material-symbols-outlined mr-2">location_on</span>{event.location}</div>
                    )}
                  </div>
                  {event.summary && (
                    <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-line">{event.summary}</p>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Link
                      to={`/events/${event.slug}`}
                      className="inline-flex items-center gap-2 text-base font-bold text-primary hover:text-[#b39020] transition-colors"
                    >
                      Read full details
                      <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </Link>

                    {event.abstract_guidelines_url && (
                      <a
                        href={event.abstract_guidelines_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-base font-bold text-primary hover:text-[#b39020] transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">download</span>
                        Abstract Guidelines
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center md:items-end gap-4 flex-shrink-0 self-start md:self-center w-full md:w-auto mt-4 md:mt-0">
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-wrap justify-center md:justify-end">
                    {event.flyer_url && (
                      <a href={event.flyer_url} target="_blank" rel="noreferrer" className="px-6 py-2 border-2 border-primary text-primary dark:text-white dark:border-white font-bold rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition text-center whitespace-nowrap">
                        Download
                      </a>
                    )}
                    {event.register_url && (
                      <a href={event.register_url} target="_blank" rel="noreferrer" className="px-6 py-2 bg-yellow-500 text-primary font-bold rounded-full hover:bg-yellow-400 transition text-center shadow-md whitespace-nowrap">
                        Register Now
                      </a>
                    )}
                  </div>

                  {(event.timer_date || event.starts_at) && (
                    <div className="mt-1">
                      <CountdownTimer targetDate={event.timer_date || event.starts_at} />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="text-center text-gray-500 py-12">No upcoming events scheduled.</div>
        )}
      </div>
    </motion.main>
  );
};

export default AcademicsEvents;
