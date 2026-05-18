import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import { formatContentDate, getMonthlyCaseBySlug } from '../lib/content';
import { withDownloadDisposition } from '../lib/contentUpload';

const CaseDetail = () => {
  const { slug } = useParams();
  const [caseItem, setCaseItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCase = useCallback(async () => {
    const row = await getMonthlyCaseBySlug(slug);
    if (!row) {
      setError('This case is not available.');
      setLoading(false);
      return;
    }
    setCaseItem(row);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    setError('');
    loadCase().catch((loadError) => {
      setError(loadError.message || 'Unable to load case.');
      setLoading(false);
    });
  }, [loadCase]);

  if (loading) return <PageState text="Loading case..." />;
  if (error || !caseItem) return <PageState icon="error" title="Case unavailable" text={error || 'Case not found.'} />;

  return (
    <motion.main
      className="min-h-screen bg-[#f7f9fc]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <SEO
        title={caseItem.title}
        description={caseItem.summary || `${caseItem.title} case discussion from DC-IAPM.`}
        keywords={`${caseItem.title}, pathology case, DC-IAPM case`}
      />

      {caseItem.hero_image_url && (
        <section className="mx-auto w-full max-w-5xl px-4 pt-6 lg:px-6">
          <div className="relative h-64 w-full overflow-hidden rounded-xl bg-gray-200 md:h-80 lg:h-96">
            <img src={caseItem.hero_image_url} alt={caseItem.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-transparent" />
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-3xl px-4 py-10 lg:px-6">
        <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1">
            <li><Link to="/" className="hover:text-primary hover:underline">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link to="/case-of-the-month" className="hover:text-primary hover:underline">Case of the Month</Link></li>
            <li aria-hidden="true">/</li>
            <li className="truncate font-semibold text-gray-700">{caseItem.title}</li>
          </ol>
        </nav>

        <header className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{caseItem.category || 'Case'}</span>
            <span className="text-sm font-semibold text-gray-500">{formatContentDate(caseItem.case_date)}</span>
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-primary md:text-4xl lg:text-5xl">
            {caseItem.title}
          </h1>
          {caseItem.author_name && (
            <p className="mt-4 text-sm font-semibold text-gray-600">Prepared by {caseItem.author_name}</p>
          )}
        </header>

        <article className="mt-10 text-base leading-7 text-gray-800">
          {caseItem.summary && <p className="text-lg font-semibold text-gray-700">{caseItem.summary}</p>}

          {caseItem.body && (
            <section className="mt-8">
              <h2 className="text-2xl font-bold text-primary">Case Summary</h2>
              <div className="mt-3 whitespace-pre-wrap text-gray-700">{caseItem.body}</div>
            </section>
          )}

          {caseItem.diagnosis && (
            <section className="mt-8 rounded-lg border border-blue-100 bg-blue-50 p-5">
              <h2 className="text-xl font-bold text-primary">Diagnosis</h2>
              <div className="mt-3 whitespace-pre-wrap text-gray-700">{caseItem.diagnosis}</div>
            </section>
          )}

          {caseItem.discussion && (
            <section className="mt-8">
              <h2 className="text-2xl font-bold text-primary">Discussion</h2>
              <div className="mt-3 whitespace-pre-wrap text-gray-700">{caseItem.discussion}</div>
            </section>
          )}
        </article>

        <div className="mt-10 flex flex-wrap gap-3">
          {caseItem.attachment_url && (
            <a
              href={caseItem.attachment_provider === 'imagekit' ? withDownloadDisposition(caseItem.attachment_url) : caseItem.attachment_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-900"
            >
              <span className="material-symbols-outlined mr-2 text-base">download</span>
              Download attachment
            </a>
          )}
          <Link to="/case-of-the-month" className="inline-flex items-center rounded-lg border border-primary px-5 py-3 text-sm font-bold text-primary transition hover:bg-primary/5">
            <span className="material-symbols-outlined mr-2 text-base">arrow_back</span>
            Back to cases
          </Link>
        </div>
      </section>
    </motion.main>
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

export default CaseDetail;
