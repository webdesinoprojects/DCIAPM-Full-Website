import React, { useCallback, useEffect, useState } from 'react';
import AdminShell from '../../components/admin/AdminShell';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
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
import SEO from '../../components/SEO';
import { useAuth } from '../../hooks/useAuth';
import { friendlyContentError } from '../../lib/contentAdmin';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import {
  createMonthlyCase,
  deleteMonthlyCase,
  formatContentDate,
  listMonthlyCases,
  toDateInput,
  updateMonthlyCase,
} from '../../lib/content';
import { uploadContentFile } from '../../lib/contentUpload';

const emptyForm = {
  title: '',
  slug: '',
  summary: '',
  body: '',
  diagnosis: '',
  discussion: '',
  category: '',
  author_name: '',
  case_date: new Date().toISOString().slice(0, 10),
  hero_image_url: '',
  hero_image_path: '',
  hero_image_file_id: '',
  attachment_url: '',
  attachment_path: '',
  attachment_file_id: '',
  attachment_provider: 'supabase',
  attachment_file_name: '',
  attachment_mime_type: '',
  attachment_file_size: '',
  is_published: false,
  sort_order: 0,
  heroFile: null,
  attachmentFile: null,
};

const AdminCases = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });
  const [pendingDelete, setPendingDelete] = useState(null);

  const loadAll = useCallback(async () => {
    const rows = await listMonthlyCases({ admin: true });
    setCases(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll().catch((error) => {
      setStatus({ type: 'error', message: error.message || 'Unable to load cases.' });
      setLoading(false);
    });
  }, [loadAll]);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    const channel = supabase
      .channel('admin-monthly-cases')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_cases' }, () => {
        loadAll().catch((error) => {
          setStatus({ type: 'error', message: error.message || 'Unable to refresh cases.' });
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

  const editCase = (row) => {
    setEditingId(row.id);
    setForm({
      ...emptyForm,
      title: row.title || '',
      slug: row.slug || '',
      summary: row.summary || '',
      body: row.body || '',
      diagnosis: row.diagnosis || '',
      discussion: row.discussion || '',
      category: row.category || '',
      author_name: row.author_name || '',
      case_date: toDateInput(row.case_date),
      hero_image_url: row.hero_image_url || '',
      hero_image_path: row.hero_image_path || '',
      hero_image_file_id: row.hero_image_file_id || '',
      attachment_url: row.attachment_url || '',
      attachment_path: row.attachment_path || '',
      attachment_file_id: row.attachment_file_id || '',
      attachment_provider: row.attachment_provider || 'supabase',
      attachment_file_name: row.attachment_file_name || '',
      attachment_mime_type: row.attachment_mime_type || '',
      attachment_file_size: row.attachment_file_size || '',
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

  const saveCase = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: null, message: '' });

    try {
      let heroPayload = {
        hero_image_url: form.hero_image_url,
        hero_image_path: form.hero_image_path,
        hero_image_file_id: form.hero_image_file_id,
      };
      if (form.heroFile) {
        const uploaded = await uploadContentFile(form.heroFile, { folder: 'cases/images' });
        heroPayload = {
          hero_image_url: uploaded.url,
          hero_image_path: uploaded.path,
          hero_image_file_id: uploaded.fileId,
        };
      }

      let attachmentPayload = {
        attachment_url: form.attachment_url,
        attachment_path: form.attachment_path,
        attachment_file_id: form.attachment_file_id,
        attachment_provider: form.attachment_provider,
        attachment_file_name: form.attachment_file_name,
        attachment_mime_type: form.attachment_mime_type,
        attachment_file_size: form.attachment_file_size,
      };
      if (form.attachmentFile) {
        const uploaded = await uploadContentFile(form.attachmentFile, { folder: 'cases/attachments' });
        attachmentPayload = {
          attachment_url: uploaded.url,
          attachment_path: uploaded.path,
          attachment_file_id: uploaded.fileId,
          attachment_provider: uploaded.provider,
          attachment_file_name: uploaded.fileName,
          attachment_mime_type: uploaded.mimeType,
          attachment_file_size: uploaded.fileSize,
        };
      }

      const payload = { ...form, ...heroPayload, ...attachmentPayload };
      if (editingId) {
        await updateMonthlyCase(editingId, payload);
        setStatus({ type: 'success', message: 'Case updated.' });
      } else {
        await createMonthlyCase(payload, user.id);
        setStatus({ type: 'success', message: 'Case created.' });
      }
      resetForm();
      await loadAll();
    } catch (error) {
      setStatus({ type: 'error', message: friendlyContentError(error.message, 'case') });
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (row) => {
    try {
      const updated = await updateMonthlyCase(row.id, { ...row, is_published: !row.is_published });
      setCases((current) => current.map((caseItem) => (caseItem.id === updated.id ? updated : caseItem)));
      loadAll().catch((error) => {
        setStatus({ type: 'error', message: error.message || 'Unable to refresh cases.' });
      });
    } catch (error) {
      setStatus({ type: 'error', message: friendlyContentError(error.message, 'case') });
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      const deleted = await deleteMonthlyCase(pendingDelete.id);
      setCases((current) => current.filter((caseItem) => caseItem.id !== deleted.id));
      if (editingId === deleted.id) resetForm();
      setPendingDelete(null);
      setStatus({ type: 'success', message: 'Case deleted.' });
      loadAll().catch((error) => {
        setStatus({ type: 'error', message: error.message || 'Unable to refresh cases.' });
      });
    } catch (error) {
      setStatus({ type: 'error', message: friendlyContentError(error.message, 'case') });
    }
  };

  return (
    <AdminShell
      title="Cases"
      description="Create, publish and manage Case of the Month entries."
      action={editingId && (
        <button type="button" onClick={resetForm} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-primary">
          New case
        </button>
      )}
    >
      <SEO title="Admin Cases" description="Manage Case of the Month." keywords="admin cases" />
      <StatusBlock status={status} />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <form onSubmit={saveCase} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">{editingId ? 'Edit case' : 'Create case'}</p>
          <h2 className="mt-1 text-2xl font-bold text-primary">Case details</h2>

          <div className="mt-5 grid gap-4">
            <Field label="Title"><input name="title" value={form.title} onChange={updateField} required maxLength="180" className="field-input" /></Field>
            <Field label="Slug (optional)"><input name="slug" value={form.slug} onChange={updateField} maxLength="180" className="field-input lowercase" /></Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Category"><input name="category" value={form.category} onChange={updateField} maxLength="120" className="field-input" /></Field>
              <Field label="Author"><input name="author_name" value={form.author_name} onChange={updateField} maxLength="160" className="field-input" /></Field>
              <Field label="Case date"><input type="date" name="case_date" value={form.case_date} onChange={updateField} required className="field-input" /></Field>
            </div>
            <Field label="Summary"><textarea name="summary" value={form.summary} onChange={updateField} rows="2" maxLength="500" className="field-input" /></Field>
            <Field label="Case body"><textarea name="body" value={form.body} onChange={updateField} rows="5" className="field-input" /></Field>
            <Field label="Diagnosis"><textarea name="diagnosis" value={form.diagnosis} onChange={updateField} rows="3" className="field-input" /></Field>
            <Field label="Discussion"><textarea name="discussion" value={form.discussion} onChange={updateField} rows="5" className="field-input" /></Field>
            <div className="grid gap-4 md:grid-cols-2">
              <FileField label="Hero image" name="heroFile" accept="image/png,image/jpeg,image/webp" onChange={updateField} current={form.hero_image_url} />
              <FileField label="Attachment" name="attachmentFile" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={updateField} current={form.attachment_url} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Sort order"><input type="number" name="sort_order" value={form.sort_order} onChange={updateField} className="field-input" /></Field>
              <label className="mt-6 flex items-center gap-3 rounded-lg border border-gray-200 p-4 text-sm font-bold text-gray-700">
                <input type="checkbox" name="is_published" checked={form.is_published} onChange={updateField} className="h-4 w-4" />
                Publish case
              </label>
            </div>
            <FormActions editing={Boolean(editingId)} saving={saving} onClear={resetForm} createLabel="Create case" updateLabel="Update case" />
          </div>
        </form>

        <ContentList
          title="All cases"
          count={cases.length}
          loading={loading}
          emptyText="No cases yet."
          publicLink="/case-of-the-month"
          rows={cases}
          renderRow={(row) => (
            <article key={row.id} className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <RowStatus published={row.is_published} slug={`/case-of-the-month/${row.slug}`} />
                  <p className="mt-2 truncate font-bold text-primary">{row.title}</p>
                  <p className="mt-1 text-xs text-gray-500">{formatContentDate(row.case_date)} {row.category ? `- ${row.category}` : ''}</p>
                </div>
                <RowActions onEdit={() => editCase(row)} onToggle={() => togglePublished(row)} published={row.is_published} onDelete={() => setPendingDelete({ id: row.id, label: row.title })} />
              </div>
            </article>
          )}
        />
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete case?"
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

export default AdminCases;
