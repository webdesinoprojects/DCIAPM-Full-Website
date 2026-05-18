import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminShell from '../../components/admin/AdminShell';
import SEO from '../../components/SEO';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import {
  createEvent,
  deleteEvent,
  formatEventDate,
  listEvents,
  toDateTimeLocal,
  updateEvent,
  uploadEventImage,
} from '../../lib/events';

const emptyForm = {
  title: '',
  slug: '',
  summary: '',
  body: '',
  location: '',
  starts_at: '',
  ends_at: '',
  timer_date: '',
  register_url: '',
  flyer_url: '',
  abstract_guidelines_url: '',
  is_published: false,
  sort_order: 0,
  author_name: '',
  author_photo_url: '',
  author_photo_path: '',
  hero_image_url: '',
  hero_image_path: '',
  heroFile: null,
  authorFile: null,
};

const AdminEvents = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });
  const [pendingDelete, setPendingDelete] = useState(null);

  const loadAll = useCallback(async () => {
    const rows = await listEvents({ admin: true });
    setEvents(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll().catch((error) => {
      setStatus({ type: 'error', message: error.message || 'Unable to load events.' });
      setLoading(false);
    });
  }, [loadAll]);

  const updateField = (event) => {
    const { name, type, checked, value, files } = event.target;
    setForm((current) => ({
      ...current,
      [name]: files ? files[0] || null : type === 'checkbox' ? checked : value,
    }));
  };

  const editEvent = (row) => {
    setEditingId(row.id);
    setForm({
      ...emptyForm,
      title: row.title || '',
      slug: row.slug || '',
      summary: row.summary || '',
      body: row.body || '',
      location: row.location || '',
      starts_at: toDateTimeLocal(row.starts_at),
      ends_at: toDateTimeLocal(row.ends_at),
      timer_date: toDateTimeLocal(row.timer_date),
      register_url: row.register_url || '',
      flyer_url: row.flyer_url || '',
      abstract_guidelines_url: row.abstract_guidelines_url || '',
      is_published: row.is_published,
      sort_order: row.sort_order || 0,
      author_name: row.author_name || '',
      author_photo_url: row.author_photo_url || '',
      author_photo_path: row.author_photo_path || '',
      hero_image_url: row.hero_image_url || '',
      hero_image_path: row.hero_image_path || '',
    });
    setStatus({ type: null, message: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const saveEvent = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: null, message: '' });

    try {
      if (form.starts_at && form.ends_at && new Date(form.starts_at) >= new Date(form.ends_at)) {
        throw new Error('END_BEFORE_START');
      }

      let heroPayload = {
        hero_image_url: form.hero_image_url,
        hero_image_path: form.hero_image_path,
      };
      if (form.heroFile) {
        const uploaded = await uploadEventImage(form.heroFile);
        heroPayload = {
          hero_image_url: uploaded.url,
          hero_image_path: uploaded.path,
        };
      }

      let authorPayload = {
        author_photo_url: form.author_photo_url,
        author_photo_path: form.author_photo_path,
      };
      if (form.authorFile) {
        const uploaded = await uploadEventImage(form.authorFile, { folder: 'events/authors' });
        authorPayload = {
          author_photo_url: uploaded.url,
          author_photo_path: uploaded.path,
        };
      }

      const payload = { ...form, ...heroPayload, ...authorPayload };

      if (editingId) {
        await updateEvent(editingId, payload);
        setStatus({ type: 'success', message: 'Event updated.' });
      } else {
        await createEvent(payload, user.id);
        setStatus({ type: 'success', message: 'Event created.' });
      }
      resetForm();
      await loadAll();
    } catch (error) {
      setStatus({ type: 'error', message: friendlyError(error.message) });
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (row) => {
    try {
      await updateEvent(row.id, {
        ...row,
        starts_at: toDateTimeLocal(row.starts_at),
        ends_at: toDateTimeLocal(row.ends_at),
        timer_date: toDateTimeLocal(row.timer_date),
        is_published: !row.is_published,
      });
      await loadAll();
    } catch (error) {
      setStatus({ type: 'error', message: friendlyError(error.message) });
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteEvent(pendingDelete.id);
      setPendingDelete(null);
      setStatus({ type: 'success', message: 'Event deleted.' });
      await loadAll();
    } catch (error) {
      setStatus({ type: 'error', message: friendlyError(error.message) });
    }
  };

  return (
    <AdminShell
      title="Events"
      description="Publish CMEs, conferences and workshops to the public events page."
      action={editingId && (
        <button type="button" onClick={resetForm} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-primary">
          New event
        </button>
      )}
    >
      <SEO title="Admin Events" description="Manage events." keywords="admin events" />

      {status.message && (
        <div className={`mb-6 rounded-lg border p-4 text-sm font-semibold ${
          status.type === 'success' ? 'border-green-100 bg-green-50 text-green-700' : 'border-red-100 bg-red-50 text-red-700'
        }`}>
          {status.message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <form onSubmit={saveEvent} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">{editingId ? 'Edit event' : 'Create event'}</p>
          <h2 className="mt-1 text-2xl font-bold text-primary">Event details</h2>

          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="field-label">Title</span>
              <input name="title" value={form.title} onChange={updateField} required maxLength="160" className="field-input" />
            </label>

            <label className="block">
              <span className="field-label">Slug <span className="font-normal text-gray-400">(optional)</span></span>
              <input name="slug" value={form.slug} onChange={updateField} maxLength="160" className="field-input lowercase" placeholder="auto-generated from title" />
            </label>

            <label className="block">
              <span className="field-label">Short summary (card subtitle)</span>
              <textarea name="summary" value={form.summary} onChange={updateField} rows="2" maxLength="400" className="field-input" />
            </label>

            <label className="block">
              <span className="field-label">Article body</span>
              <textarea name="body" value={form.body} onChange={updateField} rows="8" className="field-input" placeholder="Full article shown on the detail page." />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="field-label">Location</span>
                <input name="location" value={form.location} onChange={updateField} maxLength="160" className="field-input" />
              </label>
              <label className="block">
                <span className="field-label">Sort order</span>
                <input type="number" name="sort_order" value={form.sort_order} onChange={updateField} className="field-input" />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="field-label">Starts at</span>
                <input type="datetime-local" name="starts_at" value={form.starts_at} onChange={updateField} className="field-input" />
              </label>
              <label className="block">
                <span className="field-label">Ends at</span>
                <input type="datetime-local" name="ends_at" value={form.ends_at} onChange={updateField} className="field-input" />
              </label>
              <label className="block">
                <span className="field-label">Countdown target</span>
                <input type="datetime-local" name="timer_date" value={form.timer_date} onChange={updateField} className="field-input" />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="field-label">Register URL</span>
                <input name="register_url" value={form.register_url} onChange={updateField} maxLength="500" className="field-input" />
              </label>
              <label className="block">
                <span className="field-label">Flyer URL</span>
                <input name="flyer_url" value={form.flyer_url} onChange={updateField} maxLength="500" className="field-input" />
              </label>
              <label className="block">
                <span className="field-label">Abstract guidelines URL</span>
                <input name="abstract_guidelines_url" value={form.abstract_guidelines_url} onChange={updateField} maxLength="500" className="field-input" />
              </label>
            </div>

            <fieldset className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-4">
              <legend className="px-2 text-xs font-bold uppercase tracking-wide text-gray-500">Author byline</legend>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="field-label">Author name</span>
                  <input name="author_name" value={form.author_name} onChange={updateField} maxLength="160" className="field-input" />
                </label>
                <label className="block">
                  <span className="field-label">Author photo</span>
                  <input type="file" name="authorFile" accept="image/png,image/jpeg,image/webp" onChange={updateField} className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-blue-900" />
                  {form.author_photo_url && !form.authorFile && (
                    <p className="mt-2 truncate text-xs text-gray-500">Current: {form.author_photo_url}</p>
                  )}
                </label>
              </div>
            </fieldset>

            <fieldset className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-4">
              <legend className="px-2 text-xs font-bold uppercase tracking-wide text-gray-500">Hero image</legend>
              <label className="block">
                <span className="field-label">Upload hero image</span>
                <input type="file" name="heroFile" accept="image/png,image/jpeg,image/webp" onChange={updateField} className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-blue-900" />
                {form.hero_image_url && !form.heroFile && (
                  <p className="mt-2 truncate text-xs text-gray-500">Current: {form.hero_image_url}</p>
                )}
              </label>
            </fieldset>

            <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 text-sm font-bold text-gray-700">
              <input type="checkbox" name="is_published" checked={form.is_published} onChange={updateField} className="h-4 w-4" />
              Publish to public events page
            </label>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <button type="button" onClick={resetForm} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
                Clear
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50">
                {saving ? 'Saving...' : editingId ? 'Update event' : 'Create event'}
              </button>
            </div>
          </div>
        </form>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">All events</p>
              <h2 className="mt-1 text-2xl font-bold text-primary">{events.length} entries</h2>
            </div>
            <Link to="/academics-events" className="text-sm font-bold text-primary hover:underline">Open public page</Link>
          </div>

          {loading ? (
            <p className="mt-6 text-center text-sm font-semibold text-gray-500">Loading events...</p>
          ) : (
            <div className="mt-5 grid gap-3">
              {events.map((row) => (
                <article key={row.id} className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${row.is_published ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {row.is_published ? 'Published' : 'Draft'}
                        </span>
                        <span className="text-xs font-semibold text-gray-500">/events/{row.slug}</span>
                      </div>
                      <p className="mt-2 truncate font-bold text-primary">{row.title}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatEventDate(row.starts_at) || 'No start date'} {row.location ? `· ${row.location}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => editEvent(row)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary hover:bg-gray-50">
                        Edit
                      </button>
                      <button type="button" onClick={() => togglePublished(row)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary hover:bg-gray-50">
                        {row.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button type="button" onClick={() => setPendingDelete({ id: row.id, label: row.title })} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50">
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {events.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center font-semibold text-gray-500">
                  No events yet. Add the first one on the left.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete event?"
        body={`Removing "${pendingDelete?.label}" cannot be undone. The detail page link will return 404. If you only want to hide it, use Unpublish instead.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <style>{`
        .field-label { display: block; margin-bottom: 0.4rem; font-size: 0.875rem; font-weight: 700; color: #334155; }
        .field-input { width: 100%; border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.6rem 0.85rem; color: #111827; background: #fff; }
        .field-input:focus { outline: none; border-color: #0A2342; box-shadow: 0 0 0 2px rgba(10, 35, 66, 0.12); }
      `}</style>
    </AdminShell>
  );
};

function friendlyError(message = '') {
  const normalized = message.toLowerCase();
  if (normalized === 'end_before_start') return 'End time must be after start time.';
  if (normalized.includes('row-level security')) return 'You do not have permission to manage events.';
  if (normalized.includes('duplicate') || normalized.includes('unique')) return 'An event with that slug already exists.';
  if (normalized.includes('storage') || normalized.includes('bucket')) return 'Upload failed. Use JPG, PNG or WebP under the size limit (10 MB).';
  return 'Event could not be saved. Please check the form and try again.';
}

export default AdminEvents;
