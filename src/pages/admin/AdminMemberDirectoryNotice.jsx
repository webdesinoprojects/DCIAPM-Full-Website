import React, { useEffect, useState } from 'react';
import AdminShell from '../../components/admin/AdminShell';
import {
  AdminStyles,
  Field,
  StatusBlock,
} from '../../components/admin/ContentAdminPrimitives';
import SEO from '../../components/SEO';
import { useAuth } from '../../hooks/useAuth';
import {
  fallbackMemberDirectoryNotice,
  getAdminMemberDirectoryNotice,
  updateMemberDirectoryNotice,
} from '../../lib/memberDirectoryNotice';

const AdminMemberDirectoryNotice = () => {
  const { user } = useAuth();
  const [form, setForm] = useState(fallbackMemberDirectoryNotice);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });

  useEffect(() => {
    getAdminMemberDirectoryNotice()
      .then((row) => setForm(row))
      .catch((error) => setStatus({ type: 'error', message: friendlyNoticeError(error) }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!status.message) return undefined;
    const timer = window.setTimeout(() => setStatus({ type: null, message: '' }), 5000);
    return () => window.clearTimeout(timer);
  }, [status.message]);

  const updateField = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const saveNotice = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: null, message: '' });

    try {
      const saved = await updateMemberDirectoryNotice(form, user?.id);
      setForm(saved);
      setStatus({ type: 'success', message: 'Member directory notice saved.' });
    } catch (error) {
      setStatus({ type: 'error', message: friendlyNoticeError(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell title="Member Directory Notice" description="Control the notice shown on the public member directory page.">
      <SEO title="Admin Member Directory Notice" description="Manage member directory notice." keywords="admin member directory notice" />
      <StatusBlock status={status} />

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
          <span className="material-icons-outlined animate-spin text-4xl text-gold-DEFAULT">progress_activity</span>
          <p className="mt-3 font-bold text-primary">Loading member directory notice...</p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Public notice</p>
                <h2 className="mt-1 text-2xl font-bold text-primary">Directory update banner</h2>
              </div>
              <a href="/members-directory" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-primary hover:underline">
                Open public directory
              </a>
            </div>

            <form onSubmit={saveNotice} className="mt-5 grid gap-4">
              <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-[#fbfcfe] p-4 text-sm font-bold text-primary">
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={updateField} className="h-4 w-4" />
                Show notice on public member directory
              </label>

              <Field label="Notice title">
                <input name="title" value={form.title || ''} onChange={updateField} required maxLength="140" className="field-input" />
              </Field>

              <Field label="Notice message">
                <textarea name="message" value={form.message || ''} onChange={updateField} required rows={5} maxLength="500" className="field-input" />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Button label">
                  <input name="link_label" value={form.link_label || ''} onChange={updateField} maxLength="80" className="field-input" placeholder="Contact Us" />
                </Field>
                <Field label="Button URL">
                  <input name="link_url" value={form.link_url || ''} onChange={updateField} maxLength="300" className="field-input" placeholder="/contact-us" />
                </Field>
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={saving} className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save notice'}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Preview</p>
            <h2 className="mt-1 text-2xl font-bold text-primary">Public banner</h2>
            {form.is_active ? (
              <div className="mt-5 overflow-hidden rounded-xl border border-gold-DEFAULT/30 bg-primary text-white shadow-sm">
                <div className="p-5">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-gold-light">
                    <span className="material-symbols-outlined text-lg">campaign</span>
                    Member Directory Notice
                  </p>
                  <h3 className="mt-2 text-lg font-bold">{form.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-white/85">{form.message}</p>
                  {form.link_label && form.link_url && (
                    <span className="mt-4 inline-flex rounded-lg bg-gold-DEFAULT px-4 py-2 text-sm font-bold text-primary">
                      {form.link_label}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm font-semibold text-gray-500">
                Notice is off. Nothing will show on the public member directory.
              </div>
            )}
          </section>
        </div>
      )}

      <AdminStyles />
    </AdminShell>
  );
};

function friendlyNoticeError(error) {
  const message = typeof error === 'string' ? error : error?.message || '';
  if (message.toLowerCase().includes('permission') || message.toLowerCase().includes('row-level security')) {
    return 'You do not have permission to manage this notice.';
  }
  return message || 'Unable to save member directory notice.';
}

export default AdminMemberDirectoryNotice;
