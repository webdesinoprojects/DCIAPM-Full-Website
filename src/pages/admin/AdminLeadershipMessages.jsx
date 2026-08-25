import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminShell from '../../components/admin/AdminShell';
import {
  AdminStyles,
  Field,
  FileField,
  StatusBlock,
} from '../../components/admin/ContentAdminPrimitives';
import SEO from '../../components/SEO';
import { leadershipFallbacks, mergeLeadershipFallback } from '../../content/leadershipMessages';
import { useAuth } from '../../hooks/useAuth';
import {
  leadershipRoles,
  listLeadershipMessages,
  makeLeadershipExcerpt,
  upsertLeadershipMessage,
} from '../../lib/leadership';
import { friendlyContentError } from '../../lib/contentAdmin';
import { uploadContentFile } from '../../lib/contentUpload';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

function formFromRole(role, row) {
  const roleMeta = leadershipRoles.find((item) => item.value === role);
  const merged = mergeLeadershipFallback(role, row);

  return {
    name: merged.name || '',
    designation: merged.designation || '',
    organization: merged.organization || 'DC-IAPM',
    image_url: row?.image_url || '',
    image_path: row?.image_path || '',
    image_file_id: row?.image_file_id || '',
    image_provider: row?.image_provider || 'supabase',
    excerpt: merged.excerpt || '',
    message: merged.message || '',
    signature_name: row?.signature_name || merged.name || '',
    sort_order: row?.sort_order ?? roleMeta?.sortOrder ?? 0,
    is_active: true,
    imageFile: null,
  };
}

const AdminLeadershipMessages = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [selectedRole, setSelectedRole] = useState('president');
  const [form, setForm] = useState(() => formFromRole('president'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');

  const rowsByRole = useMemo(() => (
    rows.reduce((acc, row) => {
      acc[row.role] = row;
      return acc;
    }, {})
  ), [rows]);

  const selectedRoleMeta = leadershipRoles.find((role) => role.value === selectedRole);
  const preview = {
    ...mergeLeadershipFallback(selectedRole, rowsByRole[selectedRole]),
    ...form,
    image_url: imagePreviewUrl || form.image_url || leadershipFallbacks[selectedRole].image_url,
  };

  const loadAll = useCallback(async () => {
    const data = await listLeadershipMessages({ admin: true });
    setRows(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll().catch((error) => {
      setStatus({ type: 'error', message: error.message || 'Unable to load leadership messages.' });
      setLoading(false);
    });
  }, [loadAll]);

  useEffect(() => {
    setForm(formFromRole(selectedRole, rowsByRole[selectedRole]));
  }, [selectedRole, rowsByRole]);

  useEffect(() => {
    if (!status.message) return undefined;
    const timer = window.setTimeout(() => setStatus({ type: null, message: '' }), 5000);
    return () => window.clearTimeout(timer);
  }, [status.message]);

  useEffect(() => {
    if (!form.imageFile) {
      setImagePreviewUrl('');
      return undefined;
    }

    const url = URL.createObjectURL(form.imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.imageFile]);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    const channel = supabase
      .channel('admin-leadership-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leadership_messages' }, () => {
        loadAll().catch((error) => {
          setStatus({ type: 'error', message: error.message || 'Unable to refresh leadership messages.' });
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAll]);

  const updateField = (event) => {
    const { name, value, files } = event.target;
    setForm((current) => ({
      ...current,
      [name]: files ? files[0] || null : value,
      ...(name === 'message' && !current.excerpt ? { excerpt: makeLeadershipExcerpt(value) } : {}),
    }));
  };

  const resetRole = () => {
    setForm(formFromRole(selectedRole, rowsByRole[selectedRole]));
    setStatus({ type: null, message: '' });
  };

  const saveRole = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: null, message: '' });

    try {
      let imagePayload = {
        image_url: form.image_url || rowsByRole[selectedRole]?.image_url || null,
        image_path: form.image_path || rowsByRole[selectedRole]?.image_path || null,
        image_file_id: form.image_file_id || rowsByRole[selectedRole]?.image_file_id || null,
        image_provider: form.image_provider || rowsByRole[selectedRole]?.image_provider || 'supabase',
      };

      if (form.imageFile) {
        const uploaded = await uploadContentFile(form.imageFile, { folder: 'leadership/images' });
        imagePayload = {
          image_url: uploaded.url,
          image_path: uploaded.path,
          image_file_id: uploaded.fileId,
          image_provider: uploaded.provider,
        };
      }

      const saved = await upsertLeadershipMessage(selectedRole, {
        ...form,
        ...imagePayload,
        is_active: true,
        sort_order: selectedRoleMeta?.sortOrder || form.sort_order,
      }, user?.id);

      setRows((current) => {
        const withoutRole = current.filter((row) => row.role !== selectedRole);
        return [...withoutRole, saved].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      });
      setStatus({ type: 'success', message: `${selectedRoleMeta?.label || 'Leadership'} message saved.` });
      await loadAll();
    } catch (error) {
      setStatus({ type: 'error', message: friendlyContentError(error.message, 'leadership message') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="Leadership Messages"
      description="Update President, Vice President, and Secretary profile photos and public messages."
      action={(
        <a href={selectedRoleMeta?.publicPath || '/'} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-primary hover:bg-gray-50">
          Open public page
        </a>
      )}
    >
      <SEO title="Admin Leadership Messages" description="Manage leadership profile messages." keywords="admin leadership messages" />
      <StatusBlock status={status} />

      <div className="grid gap-6 xl:grid-cols-[0.48fr_1.52fr]">
        <aside className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Profiles</p>
          <h2 className="mt-1 text-2xl font-bold text-primary">Editable roles</h2>

          <div className="mt-5 grid gap-3">
            {leadershipRoles.map((role) => {
              const row = rowsByRole[role.value];
              const fallback = leadershipFallbacks[role.value];
              const active = selectedRole === role.value;
              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSelectedRole(role.value)}
                  className={`rounded-lg border p-4 text-left transition ${active ? 'border-primary bg-primary text-white shadow-sm' : 'border-gray-100 bg-[#fbfcfe] hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/10">
                      <img src={row?.image_url || fallback.image_url} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold ${active ? 'text-white' : 'text-primary'}`}>{role.label}</p>
                      <p className={`mt-1 truncate text-xs ${active ? 'text-white/75' : 'text-gray-500'}`}>
                        {row?.name || fallback.name}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
          <form onSubmit={saveRole} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Edit {selectedRoleMeta?.label}</p>
            <h2 className="mt-1 text-2xl font-bold text-primary">Profile and message</h2>

            {loading ? (
              <p className="mt-6 text-sm font-semibold text-gray-500">Loading...</p>
            ) : (
              <div className="mt-5 grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Name">
                    <input name="name" value={form.name} onChange={updateField} required maxLength="180" className="field-input" />
                  </Field>
                  <Field label="Designation">
                    <input name="designation" value={form.designation} onChange={updateField} required maxLength="180" className="field-input" />
                  </Field>
                </div>

                <Field label="Organization">
                  <input name="organization" value={form.organization} onChange={updateField} required maxLength="120" className="field-input" />
                </Field>

                <FileField label="Profile photo" name="imageFile" accept="image/png,image/jpeg,image/webp" onChange={updateField} current={form.image_url || rowsByRole[selectedRole]?.image_url} />

                <Field label="Home page short message">
                  <textarea name="excerpt" value={form.excerpt} onChange={updateField} rows="3" className="field-input resize-y" />
                </Field>

                <Field label="Full message">
                  <textarea name="message" value={form.message} onChange={updateField} required rows="16" className="field-input resize-y leading-7" />
                </Field>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <button type="button" onClick={resetRole} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
                    Reset
                  </button>
                  <button type="submit" disabled={saving} className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50">
                    {saving ? 'Saving...' : `Save ${selectedRoleMeta?.label}`}
                  </button>
                </div>
              </div>
            )}
          </form>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Preview</p>
            <h2 className="mt-1 text-2xl font-bold text-primary">{selectedRoleMeta?.label}</h2>

            <div className="mt-6 rounded-lg border border-gray-100 bg-[#fbfcfe] p-5">
              <img src={preview.image_url} alt={preview.name} className="mx-auto h-44 w-44 rounded-full border-4 border-gold object-contain shadow-lg" />
              <h3 className="mt-5 text-center font-display text-2xl font-bold text-primary">{preview.name}</h3>
              <p className="text-center font-semibold text-gold-DEFAULT">{preview.designation}</p>
              <p className="mt-1 text-center text-xs uppercase tracking-widest text-gray-500">{preview.organization}</p>
              <p className="mt-6 text-sm leading-6 text-gray-600">"{preview.excerpt}"</p>
            </div>
          </section>
        </div>
      </div>

      <AdminStyles />
    </AdminShell>
  );
};

export default AdminLeadershipMessages;
