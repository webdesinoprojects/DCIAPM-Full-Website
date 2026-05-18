import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import {
  dateFilters,
  formatContentDate,
  listMonthlyCases,
  matchesDateFilter,
  paginate,
} from '../lib/content';

const PAGE_SIZE = 6;

const CaseOfTheMonth = () => {
  const [cases, setCases] = useState([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [viewMode, setViewMode] = useState('cards');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listMonthlyCases()
      .then((rows) => setCases(rows))
      .catch((loadError) => setError(loadError.message || 'Unable to load cases.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, dateFilter, viewMode]);

  const filteredCases = useMemo(() => {
    const query = search.trim().toLowerCase();
    return cases.filter((item) => {
      const matchesSearch = !query || [
        item.title,
        item.summary,
        item.category,
        item.author_name,
        item.diagnosis,
      ].some((value) => String(value || '').toLowerCase().includes(query));
      return matchesSearch && matchesDateFilter(item.case_date, dateFilter);
    });
  }, [cases, dateFilter, search]);

  const paginated = useMemo(() => paginate(filteredCases, page, PAGE_SIZE), [filteredCases, page]);

  return (
    <motion.main
      className="min-h-screen bg-[#f7f9fc]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <SEO
        title="Case of the Month"
        description="Explore monthly clinical pathology cases with discussion and teaching points."
        keywords="pathology cases, clinical case study, medical education, DC-IAPM cases"
      />

      <section className="border-b border-gray-200 bg-white py-12">
        <div className="container mx-auto px-4">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-gold-DEFAULT">Academic Cases</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-4xl font-bold text-primary md:text-5xl">Case of the Month</h1>
              <p className="mt-3 max-w-3xl text-gray-600">
                Curated educational cases with diagnosis notes, discussion and downloadable references.
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
              placeholder="Search title, diagnosis, category..."
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

        {loading && <PageState text="Loading cases..." />}
        {error && <ErrorBlock message={error} />}

        {!loading && !error && filteredCases.length === 0 && (
          <EmptyState title="No cases found" text="Try a different search or date filter." />
        )}

        {!loading && !error && filteredCases.length > 0 && (
          <>
            {viewMode === 'cards' ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {paginated.items.map((item, index) => (
                  <motion.article
                    key={item.id}
                    className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <div className="aspect-[16/9] bg-gray-100">
                      {item.hero_image_url ? (
                        <img src={item.hero_image_url} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-primary">
                          <span className="material-symbols-outlined text-5xl">biotech</span>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{item.category || 'Case'}</span>
                        <span className="text-xs font-semibold text-gray-500">{formatContentDate(item.case_date)}</span>
                      </div>
                      <h2 className="mt-3 line-clamp-2 text-xl font-bold text-primary">{item.title}</h2>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">{item.summary || item.diagnosis || 'Case details available.'}</p>
                      <Link to={`/case-of-the-month/${item.slug}`} className="mt-5 inline-flex items-center text-sm font-bold text-primary hover:underline">
                        Open case
                        <span className="material-symbols-outlined ml-1 text-base">arrow_forward</span>
                      </Link>
                    </div>
                  </motion.article>
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Case</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginated.items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-bold text-primary">{item.title}</p>
                          <p className="mt-1 line-clamp-1 text-xs text-gray-500">{item.summary}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{item.category || 'Case'}</td>
                        <td className="px-4 py-3 text-gray-600">{formatContentDate(item.case_date)}</td>
                        <td className="px-4 py-3">
                          <Link to={`/case-of-the-month/${item.slug}`} className="font-bold text-primary hover:underline">Open</Link>
                        </td>
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
    <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-primary disabled:opacity-40">
      Previous
    </button>
    <span className="text-sm font-bold text-gray-600">Page {page} of {totalPages}</span>
    <button type="button" onClick={() => onPage(page + 1)} disabled={page >= totalPages} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-primary disabled:opacity-40">
      Next
    </button>
  </div>
);

const PageState = ({ text }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
    <span className="material-symbols-outlined animate-spin text-4xl text-gold-DEFAULT">progress_activity</span>
    <p className="mt-3 font-bold text-primary">{text}</p>
  </div>
);

const ErrorBlock = ({ message }) => (
  <div className="rounded-lg border border-red-100 bg-red-50 p-5 font-semibold text-red-700">{message}</div>
);

const EmptyState = ({ title, text }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
    <span className="material-symbols-outlined text-5xl text-gold-DEFAULT">biotech</span>
    <h2 className="mt-4 text-2xl font-bold text-primary">{title}</h2>
    <p className="mt-2 text-gray-600">{text}</p>
  </div>
);

export default CaseOfTheMonth;
