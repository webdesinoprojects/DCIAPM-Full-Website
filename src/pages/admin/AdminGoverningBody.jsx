import React, { useCallback, useEffect, useState } from 'react';
import AdminShell from '../../components/admin/AdminShell';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import SEO from '../../components/SEO';
import { useAuth } from '../../hooks/useAuth';
import {
  createGoverningBodyMember,
  deleteGoverningBodyMember,
  listGoverningBodyMembers,
  updateGoverningBodyMember,
} from '../../lib/content';
import { uploadContentFile } from '../../lib/contentUpload';
import {
  AdminStyles,
  Field,
  FileField,
  FormActions,
  StatusBlock,
} from '../../components/admin/ContentAdminPrimitives';
import { friendlyContentError } from '../../lib/contentAdmin';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

const emptyForm = {
  section: 'office_bearer',
  name: '',
  position: '',
  registration_no: '',
  image_url: '',
  image_path: '',
  image_file_id: '',
  image_provider: 'supabase',
  sort_order: 0,
  is_active: true,
  imageFile: null,
};

const AdminGoverningBody = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });
  const [pendingDelete, setPendingDelete] = useState(null);

  const loadAll = useCallback(async () => {
    const rows = await listGoverningBodyMembers({ admin: true });
    setMembers(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll().catch((error) => {
      setStatus({ type: 'error', message: error.message || 'Unable to load governing body.' });
      setLoading(false);
    });
  }, [loadAll]);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    const channel = supabase
      .channel('admin-governing-body-members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'governing_body_members' }, () => {
        loadAll().catch((error) => {
          setStatus({ type: 'error', message: error.message || 'Unable to refresh governing body.' });
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

  const editMember = (row) => {
    setEditingId(row.id);
    setForm({
      ...emptyForm,
      section: row.section || 'governing_member',
      name: row.name || '',
      position: row.position || '',
      registration_no: row.registration_no || '',
      image_url: row.image_url || '',
      image_path: row.image_path || '',
      image_file_id: row.image_file_id || '',
      image_provider: row.image_provider || 'supabase',
      sort_order: row.sort_order || 0,
      is_active: row.is_active,
    });
    setStatus({ type: null, message: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const saveMember = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: null, message: '' });

    try {
      let imagePayload = {
        image_url: form.image_url,
        image_path: form.image_path,
        image_file_id: form.image_file_id,
        image_provider: form.image_provider,
      };

      if (form.imageFile) {
        const uploaded = await uploadContentFile(form.imageFile, { folder: 'governing-body/images' });
        imagePayload = {
          image_url: uploaded.url,
          image_path: uploaded.path,
          image_file_id: uploaded.fileId,
          image_provider: uploaded.provider,
        };
      }

      const payload = { ...form, ...imagePayload };
      if (editingId) {
        await updateGoverningBodyMember(editingId, payload);
        setStatus({ type: 'success', message: 'Member updated.' });
      } else {
        await createGoverningBodyMember(payload, user.id);
        setStatus({ type: 'success', message: 'Member created.' });
      }
      resetForm();
      await loadAll();
    } catch (error) {
      setStatus({ type: 'error', message: friendlyContentError(error.message, 'member') });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row) => {
    try {
      const updated = await updateGoverningBodyMember(row.id, { ...row, is_active: !row.is_active });
      setMembers((current) => current.map((member) => (member.id === updated.id ? updated : member)));
      loadAll().catch((error) => {
        setStatus({ type: 'error', message: error.message || 'Unable to refresh governing body.' });
      });
    } catch (error) {
      setStatus({ type: 'error', message: friendlyContentError(error.message, 'member') });
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      const deleted = await deleteGoverningBodyMember(pendingDelete.id);
      setMembers((current) => current.filter((member) => member.id !== deleted.id));
      if (editingId === deleted.id) resetForm();
      setPendingDelete(null);
      setStatus({ type: 'success', message: 'Member deleted.' });
      loadAll().catch((error) => {
        setStatus({ type: 'error', message: error.message || 'Unable to refresh governing body.' });
      });
    } catch (error) {
      setStatus({ type: 'error', message: friendlyContentError(error.message, 'member') });
    }
  };

  return (
    <AdminShell
      title="Governing Body"
      description="Manage office bearers and governing body members shown on the public page."
      action={editingId && (
        <button type="button" onClick={resetForm} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-primary">
          New member
        </button>
      )}
    >
      <SEO title="Admin Governing Body" description="Manage governing body members." keywords="admin governing body" />
      <StatusBlock status={status} />

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <form onSubmit={saveMember} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">{editingId ? 'Edit member' : 'Create member'}</p>
          <h2 className="mt-1 text-2xl font-bold text-primary">Member details</h2>

          <div className="mt-5 grid gap-4">
            <Field label="Section">
              <select name="section" value={form.section} onChange={updateField} className="field-input">
                <option value="office_bearer">Office Bearer</option>
                <option value="governing_member">Governing Body Member</option>
              </select>
            </Field>
            <Field label="Name"><input name="name" value={form.name} onChange={updateField} required maxLength="180" className="field-input" /></Field>
            <Field label="Position"><input name="position" value={form.position} onChange={updateField} maxLength="160" className="field-input" /></Field>
            <Field label="Registration No. (optional)"><input name="registration_no" value={form.registration_no} onChange={updateField} maxLength="80" className="field-input uppercase" /></Field>
            <FileField label="Photo (optional)" name="imageFile" accept="image/png,image/jpeg,image/webp" onChange={updateField} current={form.image_url} />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Sort order"><input type="number" name="sort_order" value={form.sort_order} onChange={updateField} className="field-input" /></Field>
              <label className="mt-6 flex items-center gap-3 rounded-lg border border-gray-200 p-4 text-sm font-bold text-gray-700">
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={updateField} className="h-4 w-4" />
                Show on public page
              </label>
            </div>
            <FormActions editing={Boolean(editingId)} saving={saving} onClear={resetForm} createLabel="Create member" updateLabel="Update member" />
          </div>
        </form>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">All members</p>
              <h2 className="mt-1 text-2xl font-bold text-primary">{members.length} entries</h2>
            </div>
            <a href="/governing-body" className="text-sm font-bold text-primary hover:underline">Open public page</a>
          </div>

          {loading ? (
            <p className="mt-6 text-center text-sm font-semibold text-gray-500">Loading...</p>
          ) : (
            <div className="mt-5 grid gap-3">
              {members.map((row) => (
                <article key={row.id} className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary text-sm font-bold text-white">
                        {row.image_url ? <img src={row.image_url} alt={row.name} className="h-full w-full object-cover" /> : row.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${row.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {row.is_active ? 'Active' : 'Hidden'}
                          </span>
                          <span className="text-xs font-semibold text-gray-500">{row.section === 'office_bearer' ? 'Office Bearer' : 'Governing Member'}</span>
                        </div>
                        <p className="mt-2 truncate font-bold text-primary">{row.name}</p>
                        <p className="mt-1 text-xs text-gray-500">{row.position || 'No position'} {row.registration_no ? `- ${row.registration_no}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => editMember(row)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary hover:bg-gray-50">Edit</button>
                      <button type="button" onClick={() => toggleActive(row)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary hover:bg-gray-50">{row.is_active ? 'Hide' : 'Show'}</button>
                      <button type="button" onClick={() => setPendingDelete({ id: row.id, label: row.name })} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50">Delete</button>
                    </div>
                  </div>
                </article>
              ))}
              {members.length === 0 && <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center font-semibold text-gray-500">No members yet.</div>}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete member?"
        body={`Removing "${pendingDelete?.label}" cannot be undone. Use Hide if you only want to remove it from the public page.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <AdminStyles />
    </AdminShell>
  );
};

export default AdminGoverningBody;
