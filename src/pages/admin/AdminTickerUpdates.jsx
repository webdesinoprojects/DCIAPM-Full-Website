import React, { useCallback, useEffect, useState } from 'react';
import AdminShell from '../../components/admin/AdminShell';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import SEO from '../../components/SEO';
import { useAuth } from '../../hooks/useAuth';
import {
  createTickerUpdate,
  deleteTickerUpdate,
  listTickerUpdates,
  updateTickerUpdate,
} from '../../lib/ticker';
import {
  AdminStyles,
  Field,
  FormActions,
  StatusBlock,
} from '../../components/admin/ContentAdminPrimitives';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

const emptyForm = {
  title: '',
  link_url: '',
  is_active: true,
  sort_order: 0,
};

const AdminTickerUpdates = () => {
  const { user } = useAuth();
  const [updates, setUpdates] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });
  const [pendingDelete, setPendingDelete] = useState(null);

  const loadAll = useCallback(async () => {
    const rows = await listTickerUpdates({ admin: true });
    setUpdates(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll().catch((error) => {
      setStatus({ type: 'error', message: error.message || 'Unable to load updates.' });
      setLoading(false);
    });
  }, [loadAll]);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    const channel = supabase
      .channel('admin-ticker-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticker_updates' }, () => {
        loadAll().catch(() => {});
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAll]);

  const updateField = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const editRow = (row) => {
    setEditingId(row.id);
    setForm({
      title: row.title || '',
      link_url: row.link_url || '',
      is_active: row.is_active,
      sort_order: row.sort_order || 0,
    });
    setStatus({ type: null, message: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setStatus({ type: 'error', message: 'Please enter a message.' });
      return;
    }
    setSaving(true);
    setStatus({ type: null, message: '' });

    try {
      if (editingId) {
        await updateTickerUpdate(editingId, form);
        setStatus({ type: 'success', message: 'Update saved.' });
      } else {
        await createTickerUpdate(form, user?.id);
        setStatus({ type: 'success', message: 'Update added.' });
      }
      resetForm();
      await loadAll();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Could not save.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row) => {
    try {
      const updated = await updateTickerUpdate(row.id, { ...row, is_active: !row.is_active });
      setUpdates((current) => current.map((r) => (r.id === updated.id ? updated : r)));
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Could not update.' });
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteTickerUpdate(pendingDelete.id);
      setUpdates((current) => current.filter((r) => r.id !== pendingDelete.id));
      if (editingId === pendingDelete.id) resetForm();
      setPendingDelete(null);
      setStatus({ type: 'success', message: 'Update removed.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Could not delete.' });
    }
  };

  return (
    <AdminShell
      title="Latest Updates"
      description="Short messages that scroll across the homepage ticker."
      action={editingId && (
        <button type="button" onClick={resetForm} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-primary">
          New update
        </button>
      )}
    >
      <SEO title="Admin Latest Updates" description="Manage the homepage ticker." keywords="admin ticker latest updates" />
      <StatusBlock status={status} />

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <form onSubmit={save} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">{editingId ? 'Edit update' : 'Create update'}</p>
          <h2 className="mt-1 text-2xl font-bold text-primary">Ticker message</h2>

          <div className="mt-5 grid gap-4">
            <Field label="Message">
              <textarea
                name="title"
                value={form.title}
                onChange={updateField}
                required
                rows={3}
                maxLength={500}
                className="field-input"
                placeholder="e.g. Annual CME registration is now open."
              />
            </Field>
            <Field label="Link (optional)">
              <input
                name="link_url"
                type="text"
                value={form.link_url}
                onChange={updateField}
                maxLength={500}
                className="field-input"
                placeholder="/publications  or  https://docs.google.com/..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Starts with <code>/</code> &rarr; in-app page (e.g. <code>/publications</code>).
                Anything else &rarr; external link in a new tab (e.g. <code>example.com</code> or <code>https://docs.google.com/...</code> &mdash; <code>https://</code> is added automatically if missing).
                Leave blank to default to <code>/academics-events</code>.
              </p>
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Sort order">
                <input type="number" name="sort_order" value={form.sort_order} onChange={updateField} className="field-input" />
              </Field>
              <label className="mt-6 flex items-center gap-3 rounded-lg border border-gray-200 p-4 text-sm font-bold text-gray-700">
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={updateField} className="h-4 w-4" />
                Show on homepage ticker
              </label>
            </div>
            <FormActions editing={Boolean(editingId)} saving={saving} onClear={resetForm} createLabel="Add update" updateLabel="Save update" />
          </div>
        </form>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">All updates</p>
              <h2 className="mt-1 text-2xl font-bold text-primary">{updates.length} entries</h2>
            </div>
            <a href="/" className="text-sm font-bold text-primary hover:underline">Open homepage</a>
          </div>

          {loading ? (
            <p className="mt-6 text-center text-sm font-semibold text-gray-500">Loading...</p>
          ) : (
            <div className="mt-5 grid gap-3">
              {updates.map((row) => (
                <article key={row.id} className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${row.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {row.is_active ? 'Visible' : 'Hidden'}
                        </span>
                        <span className="text-xs font-semibold text-gray-500">Sort: {row.sort_order}</span>
                      </div>
                      <p className="mt-2 break-words text-sm font-semibold text-gray-800">{row.title}</p>
                      {row.link_url && (
                        <p className="mt-1 break-all text-xs text-gray-500">
                          <span className="font-bold">Links to:</span> {row.link_url}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => editRow(row)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary hover:bg-gray-50">Edit</button>
                      <button type="button" onClick={() => toggleActive(row)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary hover:bg-gray-50">{row.is_active ? 'Hide' : 'Show'}</button>
                      <button type="button" onClick={() => setPendingDelete({ id: row.id, label: row.title })} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50">Delete</button>
                    </div>
                  </div>
                </article>
              ))}
              {updates.length === 0 && <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center font-semibold text-gray-500">No updates yet — the ticker will show a default welcome message.</div>}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete update?"
        body={`"${pendingDelete?.label?.slice(0, 80)}${pendingDelete?.label && pendingDelete.label.length > 80 ? '...' : ''}" will be removed from the ticker.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <AdminStyles />
    </AdminShell>
  );
};

export default AdminTickerUpdates;
