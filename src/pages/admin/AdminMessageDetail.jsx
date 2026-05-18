import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminShell from '../../components/admin/AdminShell';
import SEO from '../../components/SEO';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { StatusBlock } from '../../components/admin/ContentAdminPrimitives';
import {
  buildGmailCompose,
  buildOutlookCompose,
  buildReplyMailto,
  deleteContactMessage,
  deleteContactMessageReply,
  formatMessageDate,
  getContactMessage,
  listMessageReplies,
  messageStatusClass,
  messageStatusLabels,
  recordContactReply,
  updateMessageStatus,
} from '../../lib/messages';

function replyBadge(emailStatus) {
  if (emailStatus === 'sent') return { cls: 'bg-green-50 text-green-700', label: 'Sent' };
  if (emailStatus === 'failed') return { cls: 'bg-red-50 text-red-700', label: 'Failed' };
  return { cls: 'bg-blue-50 text-blue-700', label: 'Drafted' };
}

const AdminMessageDetail = () => {
  const { messageId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: null, message: '' });
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadAll = useCallback(async () => {
    const [row, replyRows] = await Promise.all([
      getContactMessage(messageId),
      listMessageReplies(messageId),
    ]);

    if (!row) {
      setStatus({ type: 'error', message: 'This message could not be found.' });
      setLoading(false);
      return;
    }

    setMessage(row);
    setReplies(replyRows);
    setReplySubject((current) => current || `Re: ${row.subject}`);
    setLoading(false);

    // Opening a new message marks it read so the inbox stays tidy.
    if (row.status === 'new') {
      try {
        const updated = await updateMessageStatus(row.id, 'read');
        setMessage(updated);
      } catch {
        // Non-fatal: keep showing the message even if the status bump fails.
      }
    }
  }, [messageId]);

  useEffect(() => {
    setLoading(true);
    loadAll().catch((error) => {
      setStatus({ type: 'error', message: error.message || 'Unable to load message.' });
      setLoading(false);
    });
  }, [loadAll]);

  const refresh = useCallback(async () => {
    const [row, replyRows] = await Promise.all([
      getContactMessage(messageId),
      listMessageReplies(messageId),
    ]);
    setMessage(row);
    setReplies(replyRows);
  }, [messageId]);

  const composeVia = async (kind) => {
    if (!replyBody.trim()) {
      setStatus({ type: 'error', message: 'Please write a reply first.' });
      return;
    }
    setSending(true);
    setStatus({ type: null, message: '' });

    const to = message.email;
    const subject = replySubject.trim();
    const body = replyBody.trim();

    if (kind === 'gmail') {
      window.open(buildGmailCompose(to, subject, body), '_blank', 'noopener');
    } else if (kind === 'outlook') {
      window.open(buildOutlookCompose(to, subject, body), '_blank', 'noopener');
    } else {
      window.location.href = buildReplyMailto(to, subject, body);
    }

    try {
      await recordContactReply(message.id, body, subject);
      setReplyBody('');
      setStatus({ type: 'success', message: 'Reply opened in your email and logged here. Send it from there to finish.' });
      await refresh();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Reply opened, but it could not be logged here.' });
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (nextStatus) => {
    setStatus({ type: null, message: '' });
    try {
      const updated = await updateMessageStatus(message.id, nextStatus);
      setMessage(updated);
      setStatus({ type: 'success', message: `Marked as ${messageStatusLabels[nextStatus] || nextStatus}.` });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to update status.' });
    }
  };

  const removeReply = async (replyId) => {
    setStatus({ type: null, message: '' });
    try {
      await deleteContactMessageReply(replyId, message.id);
      setStatus({ type: 'success', message: 'Reply entry removed.' });
      await refresh();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to remove reply.' });
    }
  };

  const removeMessage = async () => {
    try {
      await deleteContactMessage(message.id);
      navigate('/admin/messages', { replace: true });
    } catch (error) {
      setConfirmDelete(false);
      setStatus({ type: 'error', message: error.message || 'Unable to delete message.' });
    }
  };

  return (
    <AdminShell
      title="Message"
      description="Read the enquiry and reply by email."
      action={(
        <Link to="/admin/messages" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-primary hover:bg-gray-50">
          Back to inbox
        </Link>
      )}
    >
      <SEO title="Admin Message" description="Read and reply to a contact message." keywords="admin message reply" />
      <StatusBlock status={status} />

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center font-semibold text-gray-500 shadow-sm">Loading...</div>
      ) : !message ? (
        <div className="rounded-lg border border-red-100 bg-red-50 p-6 font-semibold text-red-700">
          This message could not be found. <Link to="/admin/messages" className="underline">Return to inbox</Link>.
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${messageStatusClass(message.status)}`}>
                {messageStatusLabels[message.status] || message.status}
              </span>
              <span className="text-xs font-semibold text-gray-500">{formatMessageDate(message.created_at)}</span>
            </div>

            <h2 className="mt-4 text-2xl font-bold text-primary">{message.subject}</h2>

            <div className="mt-4 grid gap-2 rounded-lg border border-gray-100 bg-[#fbfcfe] p-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="material-icons-outlined text-base text-gold-DEFAULT">person</span>
                <span className="font-bold text-primary">{message.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-icons-outlined text-base text-gold-DEFAULT">mail</span>
                <a href={`mailto:${message.email}`} className="font-semibold text-primary hover:underline">{message.email}</a>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Message</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{message.message}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-100 pt-5">
              {message.status !== 'read' && (
                <button type="button" onClick={() => changeStatus('read')} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary hover:bg-gray-50">
                  Mark as read
                </button>
              )}
              {message.status !== 'archived' ? (
                <button type="button" onClick={() => changeStatus('archived')} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary hover:bg-gray-50">
                  Archive
                </button>
              ) : (
                <button type="button" onClick={() => changeStatus('read')} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary hover:bg-gray-50">
                  Unarchive
                </button>
              )}
              <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50">
                Delete
              </button>
            </div>
          </section>

          <div className="grid gap-6">
            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Reply</p>
              <h2 className="mt-1 text-xl font-bold text-primary">Email {message.name}</h2>

              <div className="mt-4 grid gap-3">
                <label className="block">
                  <span className="field-label">Subject</span>
                  <input
                    value={replySubject}
                    onChange={(event) => setReplySubject(event.target.value)}
                    maxLength="200"
                    className="field-input"
                  />
                </label>
                <label className="block">
                  <span className="field-label">Reply</span>
                  <textarea
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    rows="8"
                    className="field-input"
                    placeholder={`Write your reply to ${message.name}...`}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => composeVia('gmail')}
                  disabled={sending}
                  className="block w-full rounded-lg bg-primary px-5 py-3 text-center text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50"
                >
                  {sending ? 'Opening...' : 'Compose in Gmail'}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => composeVia('outlook')}
                    disabled={sending}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-center text-sm font-bold text-primary hover:bg-gray-50 disabled:opacity-50"
                  >
                    Outlook
                  </button>
                  <button
                    type="button"
                    onClick={() => composeVia('mailto')}
                    disabled={sending}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-center text-sm font-bold text-primary hover:bg-gray-50 disabled:opacity-50"
                  >
                    Default mail app
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Reply history</p>
              <h2 className="mt-1 text-xl font-bold text-primary">{replies.length} logged</h2>

              <div className="mt-4 grid gap-3">
                {replies.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm font-semibold text-gray-500">
                    No replies logged yet.
                  </div>
                )}
                {replies.map((reply) => {
                  const badge = replyBadge(reply.email_status);
                  return (
                  <article key={reply.id} className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-primary">{reply.reply_subject}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{reply.reply_body}</p>
                    {reply.email_status === 'failed' && (
                      <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                        This older reply did not go out through the previous email service. You can remove it.
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-500">{formatMessageDate(reply.created_at)}</p>
                      <button
                        type="button"
                        onClick={() => removeReply(reply.id)}
                        className="text-xs font-bold text-red-700 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete message?"
        body={`This permanently removes the enquiry from ${message?.name || 'this sender'} and its reply history. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={removeMessage}
        onCancel={() => setConfirmDelete(false)}
      />

      <style>{`
        .field-label { display: block; margin-bottom: 0.4rem; font-size: 0.875rem; font-weight: 700; color: #334155; }
        .field-input { width: 100%; border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.6rem 0.85rem; color: #111827; background: #fff; }
        .field-input:focus { outline: none; border-color: #0A2342; box-shadow: 0 0 0 2px rgba(10, 35, 66, 0.12); }
      `}</style>
    </AdminShell>
  );
};

export default AdminMessageDetail;
