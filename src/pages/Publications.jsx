import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import {
  dateFilters,
  formatContentDate,
  listPublications,
  matchesDateFilter,
  paginate,
} from '../lib/content';
import { withDownloadDisposition } from '../lib/contentUpload';

const PAGE_SIZE = 8;

const Publications = () => {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [viewMode, setViewMode] = useState('cards');
  const [page, setPage] = useState(1);
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listPublications()
      .then((rows) => setPublications(rows))
      .catch((loadError) => setError(loadError.message || 'Unable to load publications.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, dateFilter, viewMode]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return publications.filter((pub) => {
      const matchesSearch = !query || [
        pub.title,
        pub.author,
        pub.category,
        pub.description,
        pub.file_name,
      ].some((value) => String(value || '').toLowerCase().includes(query));
      return matchesSearch && matchesDateFilter(pub.published_on, dateFilter);
    });
  }, [dateFilter, publications, search]);

  const paginated = useMemo(() => paginate(filtered, page, PAGE_SIZE), [filtered, page]);

  return (
    <motion.main
      className="min-h-screen bg-[#f7f9fc]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <SEO
        title="Publications"
        description="Access society-endorsed guidelines, educational articles and downloadable resources."
        keywords="pathology publications, medical guidelines, research papers, DC-IAPM journal"
      />

      <section className="border-b border-gray-200 bg-white py-12">
        <div className="container mx-auto px-4">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-gold-DEFAULT">Resource Library</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-4xl font-bold text-primary md:text-5xl">Publications & Guidelines</h1>
              <p className="mt-3 max-w-3xl text-gray-600">
                Society-endorsed guidelines, articles, PDFs and document downloads.
              </p>
            </div>
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8">
        <div className="mb-6 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_220px]">
          <label className="relative block">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-gray-200 py-3 pl-12 pr-4 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="Search title, author, category..."
            />
          </label>
          <select
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-primary"
          >
            {dateFilters.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>

        {loading && <PageState text="Loading publications..." />}
        {error && <ErrorBlock message={error} />}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState title="No publications found" text="Try a different search or date filter." />
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            {viewMode === 'cards' ? (
              <div className="mx-auto grid max-w-5xl gap-5">
                {paginated.items.map((pub, index) => (
                  <motion.article
                    key={pub.id}
                    className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-blue-50 text-primary">
                        <span className="material-symbols-outlined">description</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{pub.category || 'Publication'}</span>
                          <span className="text-xs font-semibold text-gray-500">{formatContentDate(pub.published_on)}</span>
                        </div>
                        <h2 className="mt-3 text-xl font-bold leading-snug text-primary">{pub.title}</h2>
                        {pub.author && <p className="mt-1 text-sm font-semibold italic text-gray-500">{pub.author}</p>}
                        {pub.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-600">{pub.description}</p>}
                      </div>
                      <DownloadLink pub={pub} className="w-full justify-center md:mt-1 md:w-auto md:shrink-0" />
                    </div>
                  </motion.article>
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">File</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginated.items.map((pub) => (
                      <tr key={pub.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-bold text-primary">{pub.title}</p>
                          <p className="mt-1 line-clamp-1 text-xs text-gray-500">{pub.author || pub.description}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{pub.category || 'Publication'}</td>
                        <td className="px-4 py-3 text-gray-600">{formatContentDate(pub.published_on)}</td>
                        <td className="px-4 py-3"><DownloadLink pub={pub} compact /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination page={paginated.page} totalPages={paginated.totalPages} onPage={setPage} />
          </>
        )}
      </section>
    </motion.main>
  );
};

const DownloadLink = ({ pub, compact = false, className = '' }) => {
  if (!pub.document_url) {
    return <span className={`text-sm font-semibold text-gray-400 ${className}`}>No file</span>;
  }

  const href = pub.document_provider === 'imagekit' ? withDownloadDisposition(pub.document_url) : pub.document_url;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900 ${className}`}
    >
      <span className="material-symbols-outlined mr-2 text-base">download</span>
      {compact ? 'Download' : 'Download PDF'}
    </a>
  );
};

const ViewToggle = ({ value, onChange }) => (
  <div className="inline-flex w-fit rounded-lg bg-gray-100 p-1">
    <ToggleButton active={value === 'cards'} onClick={() => onChange('cards')} icon="grid_view" label="Cards" />
    <ToggleButton active={value === 'table'} onClick={() => onChange('table')} icon="table_rows" label="Table" />
  </div>
);

const ToggleButton = ({ active, icon, label, onClick }) => (
  <button type="button" onClick={onClick} className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-bold ${active ? 'bg-white text-primary shadow' : 'text-gray-600'}`}>
    <span className="material-icons-outlined mr-1 text-base">{icon}</span>
    {label}
  </button>
);

const Pagination = ({ page, totalPages, onPage }) => (
  <div className="mt-8 flex items-center justify-center gap-3">
    <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-primary disabled:opacity-40">Previous</button>
    <span className="text-sm font-bold text-gray-600">Page {page} of {totalPages}</span>
    <button type="button" onClick={() => onPage(page + 1)} disabled={page >= totalPages} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-primary disabled:opacity-40">Next</button>
  </div>
);

const PageState = ({ text }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
    <span className="material-symbols-outlined animate-spin text-4xl text-gold-DEFAULT">progress_activity</span>
    <p className="mt-3 font-bold text-primary">{text}</p>
  </div>
);

const ErrorBlock = ({ message }) => <div className="rounded-lg border border-red-100 bg-red-50 p-5 font-semibold text-red-700">{message}</div>;

const EmptyState = ({ title, text }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
    <span className="material-symbols-outlined text-5xl text-gold-DEFAULT">description</span>
    <h2 className="mt-4 text-2xl font-bold text-primary">{title}</h2>
    <p className="mt-2 text-gray-600">{text}</p>
  </div>
);

export default Publications;
