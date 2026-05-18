import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import { listPublicMemberDirectory, MEMBER_DIRECTORY_PAGE_SIZE } from '../lib/memberDirectory';

const EMAIL_TABS = [
  { id: 'all', label: 'All Members' },
  { id: 'with_email', label: 'With Email' },
  { id: 'without_email', label: 'Without Email' },
];

const MembersDetails = () => {
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [emailTab, setEmailTab] = useState('all');
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, emailTab]);

  useEffect(() => {
    let active = true;

    const loadMembers = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await listPublicMemberDirectory({
          search: debouncedQuery,
          emailFilter: emailTab,
          page,
          pageSize: MEMBER_DIRECTORY_PAGE_SIZE,
        });
        if (!active) return;
        setMembers(result.rows);
        setTotal(result.count);
      } catch {
        if (!active) return;
        setError('Unable to load member directory right now. Please try again shortly.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadMembers();
    return () => {
      active = false;
    };
  }, [debouncedQuery, emailTab, page]);

  const totalPages = Math.max(1, Math.ceil(total / MEMBER_DIRECTORY_PAGE_SIZE));
  const startRow = total ? (page - 1) * MEMBER_DIRECTORY_PAGE_SIZE + 1 : 0;
  const endRow = Math.min(page * MEMBER_DIRECTORY_PAGE_SIZE, total);

  const pageRows = useMemo(() => members.map((member, index) => ({
    ...member,
    serialNo: (page - 1) * MEMBER_DIRECTORY_PAGE_SIZE + index + 1,
  })), [members, page]);

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50"
    >
      <SEO
        title="Member Directory"
        description="Search and view the member directory of DC-IAPM."
        keywords="DC-IAPM members, member directory, pathology members Delhi"
      />

      <section className="bg-primary pt-16 pb-12 text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-2 font-display text-3xl font-bold md:text-4xl">Member Directory</h1>
          <p className="mx-auto max-w-3xl text-sm opacity-90 md:text-base">
            Search verified DC-IAPM member records by name, email, hospital or registration number.
          </p>
        </div>
      </section>

      <section className="container relative z-10 mx-auto -mt-8 px-4 py-8">
        <div className="mb-8 rounded-xl border border-gray-100 bg-white p-6 shadow-xl md:p-8">
          <div className="grid items-end gap-4 md:grid-cols-12">
            <div className="md:col-span-8">
              <label className="ml-1 mb-2 block text-xs font-bold uppercase text-gray-500">
                Search by name, email, hospital, or registration number
              </label>
              <input
                type="text"
                placeholder="Type name, email, hospital, or registration number"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-[56px] w-full rounded-lg border border-gray-300 bg-gray-50 px-4 font-medium text-gray-700 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="md:col-span-4">
              <p className="ml-1 mb-2 block text-xs font-bold uppercase text-gray-500">Email Tab</p>
              <div className="grid grid-cols-3 gap-2">
                {EMAIL_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setEmailTab(tab.id)}
                    className={`h-[56px] rounded-lg border text-xs font-bold transition-colors ${
                      emailTab === tab.id
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing <span className="font-bold text-primary">{startRow}-{endRow}</span> of {total} members
            </p>
            {debouncedQuery && <p className="font-semibold text-gray-500">Search: {debouncedQuery}</p>}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h3 className="font-bold text-gray-700">Directory Records</h3>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              {loading ? 'Loading...' : `${total} Rows`}
            </span>
          </div>

          {error && (
            <div className="border-b border-red-200 bg-red-50 p-6 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="bg-gray-100 text-xs font-bold uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="border-b px-6 py-4">S.No</th>
                  <th className="border-b px-6 py-4">Member Name</th>
                  <th className="border-b px-6 py-4">Hospital</th>
                  <th className="border-b px-6 py-4">Registration Number</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <tr key={`skeleton-${index}`} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 w-10 rounded bg-gray-200" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-40 rounded bg-gray-200" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-36 rounded bg-gray-200" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-28 rounded bg-gray-200" /></td>
                    </tr>
                  ))
                ) : pageRows.length > 0 ? (
                  pageRows.map((member) => (
                    <tr key={member.id} className="transition-colors hover:bg-blue-50/50">
                      <td className="px-6 py-4 text-gray-600">{member.serialNo}</td>
                      <td className="px-6 py-4 font-semibold text-gray-800">{member.member_name}</td>
                      <td className="px-6 py-4 text-gray-700">{member.hospital || '-'}</td>
                      <td className="px-6 py-4 font-mono text-gray-700">{member.registration_number}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                      No matching members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-gray-100 md:hidden">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={`mobile-skeleton-${index}`} className="animate-pulse p-5">
                  <div className="mb-3 h-4 w-24 rounded bg-gray-200" />
                  <div className="mb-3 h-5 w-48 rounded bg-gray-200" />
                  <div className="h-4 w-36 rounded bg-gray-200" />
                </div>
              ))
            ) : pageRows.length > 0 ? (
              pageRows.map((member) => (
                <div key={`mobile-${member.id}`} className="p-5">
                  <p className="mb-1 font-mono text-xs text-gray-500">{member.registration_number}</p>
                  <h4 className="text-lg font-bold text-gray-900">{member.member_name}</h4>
                  <p className="mt-1 text-sm text-gray-600">Hospital: {member.hospital || '-'}</p>
                  {member.membership_status && (
                    <p className="mt-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                      {member.membership_status}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">No matching members found.</div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={page <= 1 || loading}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-primary hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                disabled={page >= totalPages || loading}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>
    </motion.main>
  );
};

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [delay, value]);

  return debounced;
}

export default MembersDetails;
