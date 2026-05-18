import React, { useCallback, useEffect, useState } from 'react';
import AdminShell from '../../components/admin/AdminShell';
import SEO from '../../components/SEO';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { StatusBlock } from '../../components/admin/ContentAdminPrimitives';
import { useAuth } from '../../hooks/useAuth';
import {
  createGalleryCategory,
  createGalleryImage,
  deleteGalleryCategory,
  deleteGalleryImage,
  listGalleryCategories,
  listGalleryImages,
  updateGalleryCategory,
  updateGalleryImage,
  uploadGalleryImage,
} from '../../lib/gallery';

const emptyCategoryForm = {
  name: '',
  slug: '',
  description: '',
  sort_order: 0,
  is_active: true,
};

const emptyImageForm = {
  title: '',
  description: '',
  category_id: '',
  sort_order: 0,
  is_active: true,
  imageFile: null,
  image_url: '',
  image_path: '',
  width: null,
  height: null,
};

const AdminGallery = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [imageForm, setImageForm] = useState(emptyImageForm);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingImageId, setEditingImageId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });
  const [pendingDelete, setPendingDelete] = useState(null);

  const loadAll = useCallback(async () => {
    const [cats, imgs] = await Promise.all([
      listGalleryCategories({ admin: true }),
      listGalleryImages({ admin: true }),
    ]);
    setCategories(cats);
    setImages(imgs);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll().catch((error) => {
      setStatus({ type: 'error', message: error.message || 'Unable to load gallery.' });
      setLoading(false);
    });
  }, [loadAll]);

  const updateCategoryField = (event) => {
    const { name, type, checked, value } = event.target;
    setCategoryForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const updateImageField = (event) => {
    const { name, type, checked, value, files } = event.target;
    setImageForm((current) => ({
      ...current,
      [name]: files ? files[0] || null : type === 'checkbox' ? checked : value,
    }));
  };

  const editCategory = (category) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      sort_order: category.sort_order || 0,
      is_active: category.is_active,
    });
    setStatus({ type: null, message: '' });
  };

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryForm(emptyCategoryForm);
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    setSavingCategory(true);
    setStatus({ type: null, message: '' });

    try {
      if (editingCategoryId) {
        await updateGalleryCategory(editingCategoryId, categoryForm);
        setStatus({ type: 'success', message: 'Category updated.' });
      } else {
        await createGalleryCategory(categoryForm, user.id);
        setStatus({ type: 'success', message: 'Category created.' });
      }
      resetCategoryForm();
      await loadAll();
    } catch (error) {
      setStatus({ type: 'error', message: friendlyError(error.message, 'category') });
    } finally {
      setSavingCategory(false);
    }
  };

  const editImage = (image) => {
    setEditingImageId(image.id);
    setImageForm({
      title: image.title,
      description: image.description || '',
      category_id: image.category_id || '',
      sort_order: image.sort_order || 0,
      is_active: image.is_active,
      imageFile: null,
      image_url: image.image_url || '',
      image_path: image.image_path || '',
      width: image.width,
      height: image.height,
    });
    setStatus({ type: null, message: '' });
  };

  const resetImageForm = () => {
    setEditingImageId(null);
    setImageForm(emptyImageForm);
  };

  const saveImage = async (event) => {
    event.preventDefault();
    setSavingImage(true);
    setStatus({ type: null, message: '' });

    try {
      let imagePayload = {
        image_url: imageForm.image_url,
        image_path: imageForm.image_path,
        width: imageForm.width,
        height: imageForm.height,
      };

      if (imageForm.imageFile) {
        const uploaded = await uploadGalleryImage(imageForm.imageFile);
        imagePayload = {
          image_url: uploaded.url,
          image_path: uploaded.path,
          width: uploaded.width,
          height: uploaded.height,
        };
      }

      if (!editingImageId && !imagePayload.image_url) {
        throw new Error('Please choose an image file.');
      }

      const payload = { ...imageForm, ...imagePayload };

      if (editingImageId) {
        await updateGalleryImage(editingImageId, payload);
        setStatus({ type: 'success', message: 'Image updated.' });
      } else {
        await createGalleryImage(payload, user.id);
        setStatus({ type: 'success', message: 'Image added.' });
      }
      resetImageForm();
      await loadAll();
    } catch (error) {
      setStatus({ type: 'error', message: friendlyError(error.message, 'image') });
    } finally {
      setSavingImage(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!pendingDelete) return;
    try {
      if (pendingDelete.kind === 'category') {
        await deleteGalleryCategory(pendingDelete.id);
        setStatus({ type: 'success', message: 'Category deleted. Linked images are now uncategorised.' });
      } else {
        await deleteGalleryImage(pendingDelete.id);
        setStatus({ type: 'success', message: 'Image deleted.' });
      }
      setPendingDelete(null);
      await loadAll();
    } catch (error) {
      setStatus({ type: 'error', message: friendlyError(error.message, pendingDelete.kind) });
    }
  };

  return (
    <AdminShell title="Gallery" description="Manage gallery categories and images.">
      <SEO title="Admin Gallery" description="Manage gallery." keywords="admin gallery" />

      <StatusBlock status={status} />

      {loading ? (
        <PanelState text="Loading gallery..." />
      ) : (
        <div className="grid gap-6">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Categories</p>
                <h2 className="mt-1 text-2xl font-bold text-primary">{categories.length} albums</h2>
              </div>
              <p className="text-sm text-gray-500">Used for the filter tabs on the public gallery.</p>
            </div>

            <div className="mt-5 grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
              <form onSubmit={saveCategory} className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-5">
                <p className="font-bold text-primary">{editingCategoryId ? 'Edit category' : 'New category'}</p>
                <div className="mt-4 grid gap-3">
                  <label className="block">
                    <span className="field-label">Name</span>
                    <input name="name" value={categoryForm.name} onChange={updateCategoryField} required maxLength="80" className="field-input" />
                  </label>
                  <label className="block">
                    <span className="field-label">Slug <span className="text-gray-400 font-normal">(optional)</span></span>
                    <input name="slug" value={categoryForm.slug} onChange={updateCategoryField} maxLength="80" className="field-input lowercase" placeholder="auto-generated from name" />
                  </label>
                  <label className="block">
                    <span className="field-label">Description</span>
                    <textarea name="description" value={categoryForm.description} onChange={updateCategoryField} rows="2" maxLength="280" className="field-input" />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="field-label">Sort order</span>
                      <input type="number" name="sort_order" value={categoryForm.sort_order} onChange={updateCategoryField} className="field-input" />
                    </label>
                    <label className="flex items-center gap-3 self-end rounded-lg border border-gray-200 bg-white p-3 text-sm font-bold text-gray-700">
                      <input type="checkbox" name="is_active" checked={categoryForm.is_active} onChange={updateCategoryField} className="h-4 w-4" />
                      Active
                    </label>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                    <button type="button" onClick={resetCategoryForm} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
                      Clear
                    </button>
                    <button type="submit" disabled={savingCategory} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50">
                      {savingCategory ? 'Saving...' : editingCategoryId ? 'Update' : 'Create'}
                    </button>
                  </div>
                </div>
              </form>

              <div className="rounded-lg border border-gray-100 bg-white p-1">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Slug</th>
                      <th className="px-4 py-3">Images</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {categories.map((category) => {
                      const count = images.filter((image) => image.category_id === category.id).length;
                      return (
                        <tr key={category.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-bold text-primary">{category.name}</td>
                          <td className="px-4 py-3 text-gray-500">{category.slug}</td>
                          <td className="px-4 py-3 font-bold text-gray-900">{count}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${category.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {category.is_active ? 'Active' : 'Hidden'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button type="button" onClick={() => editCategory(category)} className="mr-2 rounded-lg border border-gray-200 px-3 py-1 text-xs font-bold text-primary hover:bg-gray-50">Edit</button>
                            <button type="button" onClick={() => setPendingDelete({ kind: 'category', id: category.id, label: category.name })} className="rounded-lg border border-red-100 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-50">Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                    {categories.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-4 py-10 text-center font-semibold text-gray-500">
                          No categories yet. Add the first one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Images</p>
                <h2 className="mt-1 text-2xl font-bold text-primary">{images.length} uploads</h2>
              </div>
            </div>

            <div className="mt-5 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
              <form onSubmit={saveImage} className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-5">
                <p className="font-bold text-primary">{editingImageId ? 'Edit image' : 'New image'}</p>
                <div className="mt-4 grid gap-3">
                  <label className="block">
                    <span className="field-label">Title</span>
                    <input name="title" value={imageForm.title} onChange={updateImageField} required maxLength="140" className="field-input" />
                  </label>
                  <label className="block">
                    <span className="field-label">Description</span>
                    <textarea name="description" value={imageForm.description} onChange={updateImageField} rows="2" maxLength="400" className="field-input" />
                  </label>
                  <label className="block">
                    <span className="field-label">Category</span>
                    <select name="category_id" value={imageForm.category_id} onChange={updateImageField} className="field-input">
                      <option value="">Uncategorised</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="field-label">{editingImageId ? 'Replace image (optional)' : 'Image file'}</span>
                    <input
                      type="file"
                      name="imageFile"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={updateImageField}
                      className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-blue-900"
                    />
                    {imageForm.image_url && !imageForm.imageFile && (
                      <p className="mt-2 text-xs text-gray-500 break-all">Current: {imageForm.image_url}</p>
                    )}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="field-label">Sort order</span>
                      <input type="number" name="sort_order" value={imageForm.sort_order} onChange={updateImageField} className="field-input" />
                    </label>
                    <label className="flex items-center gap-3 self-end rounded-lg border border-gray-200 bg-white p-3 text-sm font-bold text-gray-700">
                      <input type="checkbox" name="is_active" checked={imageForm.is_active} onChange={updateImageField} className="h-4 w-4" />
                      Visible
                    </label>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                    <button type="button" onClick={resetImageForm} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
                      Clear
                    </button>
                    <button type="submit" disabled={savingImage} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50">
                      {savingImage ? 'Uploading...' : editingImageId ? 'Update' : 'Upload'}
                    </button>
                  </div>
                </div>
              </form>

              <div className="grid gap-4 sm:grid-cols-2">
                {images.map((image) => (
                  <article key={image.id} className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                    <div className="aspect-[4/3] overflow-hidden rounded-md bg-gray-100">
                      <img src={image.image_url} alt={image.title} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                    <div className="mt-3">
                      <p className="font-bold text-primary">{image.title}</p>
                      <p className="text-xs text-gray-500">{image.category?.name || 'Uncategorised'}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${image.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {image.is_active ? 'Visible' : 'Hidden'}
                      </span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => editImage(image)} className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-bold text-primary hover:bg-gray-50">Edit</button>
                        <button type="button" onClick={() => setPendingDelete({ kind: 'image', id: image.id, label: image.title })} className="rounded-lg border border-red-100 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-50">Delete</button>
                      </div>
                    </div>
                  </article>
                ))}
                {images.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm font-semibold text-gray-500 sm:col-span-2">
                    No images uploaded yet.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={pendingDelete?.kind === 'category' ? 'Delete category?' : 'Delete image?'}
        body={
          pendingDelete?.kind === 'category'
            ? `Removing "${pendingDelete?.label}" will leave its images uncategorised. This cannot be undone.`
            : `Removing "${pendingDelete?.label}" deletes it from the gallery. This cannot be undone.`
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirmed}
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

const PanelState = ({ text }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
    <span className="material-symbols-outlined animate-spin text-4xl text-gold-DEFAULT">progress_activity</span>
    <p className="mt-3 font-bold text-primary">{text}</p>
  </div>
);

function friendlyError(message = '', kind = 'item') {
  const normalized = message.toLowerCase();
  if (normalized.includes('row-level security')) return `You do not have permission to manage this ${kind}.`;
  if (normalized.includes('duplicate') || normalized.includes('unique')) return `A ${kind} with the same slug already exists.`;
  if (normalized.includes('please choose')) return message;
  if (normalized.includes('storage') || normalized.includes('bucket')) return `Upload failed. Use JPG, PNG or WebP under the size limit (10 MB).`;
  return `The ${kind} could not be saved. Please check the form and try again.`;
}

export default AdminGallery;
