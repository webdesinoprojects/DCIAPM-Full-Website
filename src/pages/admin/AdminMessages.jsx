import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminShell from '../../components/admin/AdminShell';
import SEO from '../../components/SEO';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { StatusBlock } from '../../components/admin/ContentAdminPrimitives';
import {
  deleteContactMessage,
  formatMessageDate,
  listContactMessages,
  messageStatusClass,
  messageStatusLabels,
} from '../../lib/messages';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

const AdminMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: null, message: '' });
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('unanswered');
  const [deleting, setDeleting] = useState(null);

  const loadAll = useCallback(async () => {
    const rows = await listContactMessages();
    setMessages(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll().catch((error) => {
      setStatus({ type: 'error', message: error.message || 'Unable to load messages.' });
      setLoading(false);
    });
  }, [loadAll]);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    const channel = supabase
      .channel('admin-contact-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, () => {
        loadAll().catch((error) => {
          setStatus({ type: 'error', message: error.message || 'Unable to refresh messages.' });
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAll]);

  const counts = useMemo(() => ({
    all: messages.length,
    new: messages.filter((row) => row.status === 'new').length,
    unanswered: messages.filter((row) => ['new', 'read'].includes(row.status)).length,
  }), [messages]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return messages.filter((row) => {
      const matchesQuery = !needle || [row.name, row.email, row.subject].some(
        (value) => String(value || '').toLowerCase().includes(needle),
      );
      const matchesStatus = statusFilter === 'all'
        || row.status === statusFilter
        || (statusFilter === 'unanswered' && ['new', 'read'].includes(row.status));
      return matchesQuery && matchesStatus;
    });
  }, [messages, query, statusFilter]);

  const removeMessage = async () => {
    if (!deleting) return;
    setStatus({ type: null, message: '' });
    try {
      await deleteContactMessage(deleting.id);
      setDeleting(null);
      setStatus({ type: 'success', message: 'Message deleted.' });
      await loadAll();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to delete message.' });
    }
  };

  return (
    <AdminShell title="Messages" description="Contact form enquiries and admin replies.">
      <SEO title="Admin Messages" description="Manage contact messages." keywords="admin messages" />
      <StatusBlock status={status} />

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Inbox</p>
            <h2 className="mt-1 text-2xl font-bold text-primary">{filtered.length} shown / {counts.all} total</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">
              {counts.new} new, {counts.unanswered} awaiting a reply. Open a message to read it and reply by email.
            </p>
          </div>
          <div className="grid w-full max-w-full gap-3 md:grid-cols-[minmax(0,1fr)_minmax(160px,190px)] lg:max-w-[560px]">
            <label className="relative block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="field-input messages-search-input"
                placeholder="Search name, email, subject..."
              />
            </label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="field-input">
              <option value="unanswered">Awaiting reply</option>
              <option value="all">All messages</option>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="replied">Replied</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Received</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr><td colSpan="5" className="px-4 py-10 text-center font-semibold text-gray-500">Loading...</td></tr>
                ) : filtered.map((row) => (
                  <tr key={row.id} className={`hover:bg-gray-50 ${row.status === 'new' ? 'bg-yellow-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-primary">{row.name}</p>
                      <p className="mt-1 text-xs text-gray-500">{row.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/messages/${row.id}`} className="font-semibold text-gray-800 hover:text-primary hover:underline">
                        {row.subject}
                      </Link>
                      {row.reply_count > 0 && (
                        <p className="mt-1 text-xs text-gray-500">{row.reply_count} repl{row.reply_count === 1 ? 'y' : 'ies'} logged</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${messageStatusClass(row.status)}`}>
                        {messageStatusLabels[row.status] || row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatMessageDate(row.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/admin/messages/${row.id}`} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary hover:bg-gray-50">
                          Open
                        </Link>
                        <button type="button" onClick={() => setDeleting(row)} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan="5" className="px-4 py-10 text-center font-semibold text-gray-500">No messages match the current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete message?"
        body={`This permanently removes the enquiry from ${deleting?.name || 'this sender'} and any replies recorded against it. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={removeMessage}
        onCancel={() => setDeleting(null)}
      />

      <style>{`
        .field-input { width: 100%; border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.6rem 0.85rem; color: #111827; background: #fff; }
        .messages-search-input { padding-left: 2.5rem; }
        .field-input:focus { outline: none; border-color: #0A2342; box-shadow: 0 0 0 2px rgba(10, 35, 66, 0.12); }
      `}</style>
    </AdminShell>
  );
};

export default AdminMessages;
