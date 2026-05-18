import React, { useCallback, useEffect, useState } from 'react';
import AdminShell from '../../components/admin/AdminShell';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import SEO from '../../components/SEO';
import { useAuth } from '../../hooks/useAuth';
import {
  createPublication,
  deletePublication,
  formatContentDate,
  listPublications,
  toDateInput,
  updatePublication,
} from '../../lib/content';
import { uploadContentFile } from '../../lib/contentUpload';
import {
  AdminStyles,
  ContentList,
  Field,
  FileField,
  FormActions,
  RowActions,
  RowStatus,
  StatusBlock,
} from '../../components/admin/ContentAdminPrimitives';
import { friendlyContentError } from '../../lib/contentAdmin';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

const emptyForm = {
  title: '',
  slug: '',
  author: '',
  category: '',
  description: '',
  published_on: new Date().toISOString().slice(0, 10),
  document_url: '',
  document_path: '',
  document_file_id: '',
  document_provider: 'supabase',
  file_name: '',
  mime_type: '',
  file_size: '',
  is_published: false,
  sort_order: 0,
  documentFile: null,
};

const AdminPublications = () => {
  const { user } = useAuth();
  const [publications, setPublications] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });
  const [pendingDelete, setPendingDelete] = useState(null);

  const loadAll = useCallback(async () => {
    const rows = await listPublications({ admin: true });
    setPublications(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll().catch((error) => {
      setStatus({ type: 'error', message: error.message || 'Unable to load publications.' });
      setLoading(false);
    });
  }, [loadAll]);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    const channel = supabase
      .channel('admin-publications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'publications' }, () => {
        loadAll().catch((error) => {
          setStatus({ type: 'error', message: error.message || 'Unable to refresh publications.' });
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAll]);

  const updateField = (event) => {
    const { name, type, checked, value, files } = event.target;
    setForm((current) => ({
      ...current,
      [name]: files ? files[0] || null : type === 'checkbox' ? checked : value,
    }));
  };

  const editPublication = (row) => {
    setEditingId(row.id);
    setForm({
      ...emptyForm,
      title: row.title || '',
      slug: row.slug || '',
      author: row.author || '',
      category: row.category || '',
      description: row.description || '',
      published_on: toDateInput(row.published_on),
      document_url: row.document_url || '',
      document_path: row.document_path || '',
      document_file_id: row.document_file_id || '',
      document_provider: row.document_provider || 'supabase',
      file_name: row.file_name || '',
      mime_type: row.mime_type || '',
      file_size: row.file_size || '',
      is_published: row.is_published,
      sort_order: row.sort_order || 0,
    });
    setStatus({ type: null, message: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const savePublication = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: null, message: '' });

    try {
      let documentPayload = {
        document_url: form.document_url,
        document_path: form.document_path,
        document_file_id: form.document_file_id,
        document_provider: form.document_provider,
        file_name: form.file_name,
        mime_type: form.mime_type,
        file_size: form.file_size,
      };

      if (form.documentFile) {
        const uploaded = await uploadContentFile(form.documentFile, { folder: 'publications/documents' });
        documentPayload = {
          document_url: uploaded.url,
          document_path: uploaded.path,
          document_file_id: uploaded.fileId,
          document_provider: uploaded.provider,
          file_name: uploaded.fileName,
          mime_type: uploaded.mimeType,
          file_size: uploaded.fileSize,
        };
      }

      const payload = { ...form, ...documentPayload };
      if (editingId) {
        await updatePublication(editingId, payload);
        setStatus({ type: 'success', message: 'Publication updated.' });
      } else {
        await createPublication(payload, user.id);
        setStatus({ type: 'success', message: 'Publication created.' });
      }
      resetForm();
      await loadAll();
    } catch (error) {
      setStatus({ type: 'error', message: friendlyContentError(error.message, 'publication') });
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (row) => {
    try {
      const updated = await updatePublication(row.id, { ...row, is_published: !row.is_published });
      setPublications((current) => current.map((publication) => (publication.id === updated.id ? updated : publication)));
      loadAll().catch((error) => {
        setStatus({ type: 'error', message: error.message || 'Unable to refresh publications.' });
      });
    } catch (error) {
      setStatus({ type: 'error', message: friendlyContentError(error.message, 'publication') });
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      const deleted = await deletePublication(pendingDelete.id);
      setPublications((current) => current.filter((publication) => publication.id !== deleted.id));
      if (editingId === deleted.id) resetForm();
      setPendingDelete(null);
      setStatus({ type: 'success', message: 'Publication deleted.' });
      loadAll().catch((error) => {
        setStatus({ type: 'error', message: error.message || 'Unable to refresh publications.' });
      });
    } catch (error) {
      setStatus({ type: 'error', message: friendlyContentError(error.message, 'publication') });
    }
  };

  return (
    <AdminShell
      title="Publications"
      description="Upload PDFs, Word documents and society resources for public download."
      action={editingId && (
        <button type="button" onClick={resetForm} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-primary">
          New publication
        </button>
      )}
    >
      <SEO title="Admin Publications" description="Manage publications and document downloads." keywords="admin publications" />
      <StatusBlock status={status} />

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(360px,420px)_minmax(0,1fr)]">
        <form onSubmit={savePublication} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">{editingId ? 'Edit publication' : 'Create publication'}</p>
          <h2 className="mt-1 text-2xl font-bold text-primary">Publication details</h2>

          <div className="mt-5 grid gap-4">
            <Field label="Title"><input name="title" value={form.title} onChange={updateField} required maxLength="180" className="field-input" /></Field>
            <Field label="Slug (optional)"><input name="slug" value={form.slug} onChange={updateField} maxLength="180" className="field-input lowercase" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Author"><input name="author" value={form.author} onChange={updateField} maxLength="160" className="field-input" /></Field>
              <Field label="Category"><input name="category" value={form.category} onChange={updateField} maxLength="120" className="field-input" /></Field>
            </div>
            <Field label="Published on"><input type="date" name="published_on" value={form.published_on} onChange={updateField} required className="field-input" /></Field>
            <Field label="Description"><textarea name="description" value={form.description} onChange={updateField} rows="4" maxLength="700" className="field-input" /></Field>
            <FileField label="Document" name="documentFile" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={updateField} current={form.document_url} />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Sort order"><input type="number" name="sort_order" value={form.sort_order} onChange={updateField} className="field-input" /></Field>
              <label className="mt-6 flex items-center gap-3 rounded-lg border border-gray-200 p-4 text-sm font-bold text-gray-700">
                <input type="checkbox" name="is_published" checked={form.is_published} onChange={updateField} className="h-4 w-4" />
                Publish publication
              </label>
            </div>
            <FormActions editing={Boolean(editingId)} saving={saving} onClear={resetForm} createLabel="Create publication" updateLabel="Update publication" />
          </div>
        </form>

        <ContentList
          title="All publications"
          count={publications.length}
          loading={loading}
          emptyText="No publications yet."
          publicLink="/publications"
          rows={publications}
          renderRow={(row) => (
            <article key={row.id} className="min-w-0 overflow-hidden rounded-lg border border-gray-100 bg-[#fbfcfe] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <RowStatus published={row.is_published} />
                  <p className="mt-2 line-clamp-2 font-bold leading-snug text-primary">{row.title}</p>
                  <p className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-gray-500">
                    <span>{formatContentDate(row.published_on)}</span>
                    {row.category && <span>{row.category}</span>}
                    {row.file_name && (
                      <span className="max-w-full truncate md:max-w-[18rem]" title={row.file_name}>
                        {row.file_name}
                      </span>
                    )}
                  </p>
                </div>
                <RowActions onEdit={() => editPublication(row)} onToggle={() => togglePublished(row)} published={row.is_published} onDelete={() => setPendingDelete({ id: row.id, label: row.title })} />
              </div>
            </article>
          )}
        />
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete publication?"
        body={`Removing "${pendingDelete?.label}" cannot be undone. Use Unpublish if you only want to hide it.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <AdminStyles />
    </AdminShell>
  );
};

export default AdminPublications;
