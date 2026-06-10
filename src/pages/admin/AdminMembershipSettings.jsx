import React, { useCallback, useEffect, useState } from 'react';
import AdminShell from '../../components/admin/AdminShell';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import {
  AdminStyles,
  Field,
  FormActions,
  StatusBlock,
} from '../../components/admin/ContentAdminPrimitives';
import MarkdownBlock from '../../components/common/MarkdownBlock';
import SEO from '../../components/SEO';
import { useAuth } from '../../hooks/useAuth';
import {
  createMembershipInterestCategory,
  createMembershipPlanOption,
  deleteMembershipInterestCategory,
  deleteMembershipPlanOption,
  fallbackPortalSettings,
  getMembershipPortalAssetUrl,
  loadMembershipPortalData,
  normalizeSlug,
  updateMembershipInterestCategory,
  updateMembershipPlanOption,
  updateMembershipPortalSettings,
  uploadMembershipPortalQr,
} from '../../lib/membershipConfig';

const emptyPlanForm = {
  slug: '',
  label: '',
  description: '',
  amount: '',
  currency: 'INR',
  amount_label: '',
  duration_label: '',
  number_prefix: '',
  validity_years: '',
  is_active: true,
  sort_order: 0,
};

const emptyCategoryForm = {
  slug: '',
  label: '',
  description: '',
  is_active: true,
  sort_order: 0,
};

const AdminMembershipSettings = () => {
  const { user } = useAuth();
  const [settingsForm, setSettingsForm] = useState(fallbackPortalSettings);
  const [plans, setPlans] = useState([]);
  const [categories, setCategories] = useState([]);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [qrFile, setQrFile] = useState(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });
  const [pendingDelete, setPendingDelete] = useState(null);

  const loadAll = useCallback(async () => {
    const data = await loadMembershipPortalData({ admin: true });
    setSettingsForm(data.settings);
    setPlans(data.plans);
    setCategories(data.categories);
    setLoading(false);

    if (data.settings.qr_image_path) {
      const url = await getMembershipPortalAssetUrl(data.settings.qr_image_path, 900);
      setQrPreviewUrl(url);
    } else {
      setQrPreviewUrl('');
    }
  }, []);

  useEffect(() => {
    loadAll().catch((error) => {
      setStatus({ type: 'error', message: friendlyError(error.message, 'settings') });
      setLoading(false);
    });
  }, [loadAll]);

  useEffect(() => {
    if (!status.message) return undefined;
    const timer = window.setTimeout(() => {
      setStatus({ type: null, message: '' });
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [status.message]);

  const updateSettingsField = (event) => {
    const { name, type, checked, value } = event.target;
    setSettingsForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const updatePlanField = (event) => {
    const { name, type, checked, value } = event.target;
    setPlanForm((current) => ({
      ...current,
      [name]: normalizePlanField(name, type === 'checkbox' ? checked : value),
      ...(!editingPlanId && name === 'label' ? { slug: normalizeSlug(value) } : {}),
    }));
  };

  const updateCategoryField = (event) => {
    const { name, type, checked, value } = event.target;
    setCategoryForm((current) => ({
      ...current,
      [name]: name === 'slug' ? normalizeSlug(value) : type === 'checkbox' ? checked : value,
      ...(!editingCategoryId && name === 'label' ? { slug: normalizeSlug(value) } : {}),
    }));
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    setSavingSettings(true);
    setStatus({ type: null, message: '' });

    try {
      let qrPath = settingsForm.qr_image_path || '';
      if (qrFile) {
        qrPath = await uploadMembershipPortalQr(qrFile);
      }

      const updated = await updateMembershipPortalSettings({
        ...settingsForm,
        qr_image_path: qrPath,
      }, user?.id);

      setSettingsForm(updated);
      setQrFile(null);
      setStatus({ type: 'success', message: 'Membership portal settings saved.' });
      await loadAll();
    } catch (error) {
      setStatus({ type: 'error', message: friendlyError(error.message, 'settings') });
    } finally {
      setSavingSettings(false);
    }
  };

  const editPlan = (plan) => {
    setEditingPlanId(plan.id);
    setPlanForm({
      slug: plan.slug || plan.value || '',
      label: plan.label || '',
      description: plan.description || '',
      amount: plan.amount || '',
      currency: plan.currency || 'INR',
      amount_label: plan.amount_label || plan.amountLabel || '',
      duration_label: plan.duration_label || plan.durationLabel || '',
      number_prefix: plan.number_prefix || plan.numberPrefix || '',
      validity_years: plan.validity_years ?? plan.validityYears ?? '',
      is_active: plan.is_active,
      sort_order: plan.sort_order || 0,
    });
  };

  const resetPlanForm = () => {
    setEditingPlanId(null);
    setPlanForm(emptyPlanForm);
  };

  const savePlan = async (event) => {
    event.preventDefault();
    setSavingPlan(true);
    setStatus({ type: null, message: '' });

    try {
      if (editingPlanId) {
        await updateMembershipPlanOption(editingPlanId, planForm, user?.id);
        setStatus({ type: 'success', message: 'Membership type updated.' });
      } else {
        await createMembershipPlanOption(planForm, user?.id);
        setStatus({ type: 'success', message: 'Membership type created.' });
      }
      resetPlanForm();
      await loadAll();
    } catch (error) {
      setStatus({ type: 'error', message: friendlyError(error.message, 'membership type') });
    } finally {
      setSavingPlan(false);
    }
  };

  const editCategory = (category) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      slug: category.slug || '',
      label: category.label || '',
      description: category.description || '',
      is_active: category.is_active,
      sort_order: category.sort_order || 0,
    });
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
        await updateMembershipInterestCategory(editingCategoryId, categoryForm, user?.id);
        setStatus({ type: 'success', message: 'Category updated.' });
      } else {
        await createMembershipInterestCategory(categoryForm, user?.id);
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

  const handleDeleteConfirmed = async () => {
    if (!pendingDelete) return;

    try {
      if (pendingDelete.kind === 'plan') {
        await deleteMembershipPlanOption(pendingDelete.id);
        if (editingPlanId === pendingDelete.id) resetPlanForm();
        setStatus({ type: 'success', message: 'Membership type deleted.' });
      } else {
        await deleteMembershipInterestCategory(pendingDelete.id);
        if (editingCategoryId === pendingDelete.id) resetCategoryForm();
        setStatus({ type: 'success', message: 'Category deleted.' });
      }
      setPendingDelete(null);
      await loadAll();
    } catch (error) {
      setStatus({ type: 'error', message: friendlyError(error.message, pendingDelete.kind) });
    }
  };

  const computedPlanAmountLabel = formatPlanAmountLabel(planForm.amount, planForm.currency);

  return (
    <AdminShell title="Membership Form" description="Edit the public join-membership page, payment QR, membership types, and categories.">
      <SEO title="Admin Membership Form" description="Manage public membership form settings." keywords="admin membership form" />
      <StatusBlock status={status} />

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
          <span className="material-icons-outlined animate-spin text-4xl text-gold-DEFAULT">progress_activity</span>
          <p className="mt-3 font-bold text-primary">Loading membership form settings...</p>
        </div>
      ) : (
        <div className="grid gap-6">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Page setup</p>
                <h2 className="mt-1 text-2xl font-bold text-primary">Public form content</h2>
              </div>
              <a href="/join-membership" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-primary hover:underline">
                Open public form
              </a>
            </div>

            <form onSubmit={saveSettings} className="mt-5 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Portal title">
                    <input name="portal_title" value={settingsForm.portal_title} onChange={updateSettingsField} required maxLength="120" className="field-input" />
                  </Field>
                  <Field label="Portal subtitle">
                    <input name="portal_subtitle" value={settingsForm.portal_subtitle} onChange={updateSettingsField} required maxLength="180" className="field-input" />
                  </Field>
                </div>

                <Field label="Payment section title">
                  <input name="payment_title" value={settingsForm.payment_title} onChange={updateSettingsField} required maxLength="120" className="field-input" />
                </Field>

                <Field label="Payment instructions markdown">
                  <textarea name="payment_markdown" value={settingsForm.payment_markdown} onChange={updateSettingsField} rows={8} className="field-input font-mono text-sm" />
                </Field>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="QR caption">
                    <input name="qr_caption" value={settingsForm.qr_caption || ''} onChange={updateSettingsField} maxLength="160" className="field-input" />
                  </Field>
                  <Field label="Replace QR image">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => setQrFile(event.target.files?.[0] || null)}
                      className="block max-w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-blue-900"
                    />
                    {settingsForm.qr_image_path && <p className="mt-2 break-all text-xs text-gray-500">Current: {settingsForm.qr_image_path}</p>}
                  </Field>
                </div>

                <Field label="Success message markdown">
                  <textarea name="registration_success_markdown" value={settingsForm.registration_success_markdown} onChange={updateSettingsField} rows={3} className="field-input font-mono text-sm" />
                </Field>

                <Field label="Status tab intro markdown">
                  <textarea name="status_intro_markdown" value={settingsForm.status_intro_markdown} onChange={updateSettingsField} rows={3} className="field-input font-mono text-sm" />
                </Field>

                <div className="rounded-lg border border-yellow-200 bg-yellow-50/70 p-4">
                  <label className="flex items-center gap-3 text-sm font-bold text-primary">
                    <input type="checkbox" name="promo_enabled" checked={settingsForm.promo_enabled} onChange={updateSettingsField} className="h-4 w-4" />
                    Show promotional drive tab
                  </label>
                  <div className="mt-4 grid gap-4">
                    <Field label="Promotional title">
                      <input name="promo_title" value={settingsForm.promo_title || ''} onChange={updateSettingsField} maxLength="140" className="field-input" />
                    </Field>
                    <Field label="Promotional markdown">
                      <textarea name="promo_markdown" value={settingsForm.promo_markdown || ''} onChange={updateSettingsField} rows={7} className="field-input font-mono text-sm" />
                    </Field>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="submit" disabled={savingSettings} className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50">
                    {savingSettings ? 'Saving...' : 'Save page settings'}
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Markdown preview</p>
                  <div className="mt-3 rounded-lg border border-gray-100 bg-white p-4">
                    <MarkdownBlock content={settingsForm.payment_markdown} />
                  </div>
                </div>

                <div className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">QR preview</p>
                  {qrPreviewUrl ? (
                    <img src={qrPreviewUrl} alt="Current payment QR" className="mt-3 max-h-80 w-full rounded-lg border border-gray-200 object-contain bg-white p-2" />
                  ) : (
                    <p className="mt-3 rounded-lg border border-dashed border-gray-200 p-6 text-sm font-semibold text-gray-500">No uploaded QR yet. The bundled fallback QR is shown on the public form until you upload one.</p>
                  )}
                </div>
              </div>
            </form>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Membership types</p>
                  <h2 className="mt-1 text-2xl font-bold text-primary">{plans.length} plans</h2>
                </div>
                {editingPlanId && (
                  <button type="button" onClick={resetPlanForm} className="text-sm font-bold text-primary hover:underline">
                    New type
                  </button>
                )}
              </div>

              <form onSubmit={savePlan} className="mt-5 rounded-lg border border-gray-100 bg-[#fbfcfe] p-4">
                <p className="font-bold text-primary">{editingPlanId ? 'Edit membership type' : 'Create membership type'}</p>
                <div className="mt-4 grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Display name">
                      <input name="label" value={planForm.label} onChange={updatePlanField} required maxLength="140" className="field-input" />
                    </Field>
                    <Field label="Slug">
                      <input name="slug" value={planForm.slug} onChange={updatePlanField} required maxLength="60" className="field-input lowercase" />
                    </Field>
                  </div>
                  <Field label="Description">
                    <textarea name="description" value={planForm.description || ''} onChange={updatePlanField} rows={2} maxLength="400" className="field-input" />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Amount">
                      <input type="number" min="1" step="0.01" name="amount" value={planForm.amount} onChange={updatePlanField} required className="field-input" />
                    </Field>
                    <Field label="Currency">
                      <select name="currency" value={planForm.currency} onChange={updatePlanField} className="field-input">
                        <option value="INR">INR</option>
                        <option value="USD">USD</option>
                      </select>
                    </Field>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Amount label">
                      <input value={computedPlanAmountLabel} readOnly className="field-input bg-gray-100 font-semibold text-gray-700" placeholder="Auto: 5,000 INR" />
                      <p className="mt-1 text-xs text-gray-500">Generated from amount and currency.</p>
                    </Field>
                    <Field label="Duration label">
                      <input name="duration_label" value={planForm.duration_label || ''} onChange={updatePlanField} maxLength="100" className="field-input" placeholder="Per 3 Years" />
                    </Field>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Number prefix">
                      <input name="number_prefix" value={planForm.number_prefix || ''} onChange={updatePlanField} maxLength="8" className="field-input uppercase" placeholder="L, AH, OS" />
                      <p className="mt-1 text-xs text-gray-500">Used when admin leaves membership number blank.</p>
                    </Field>
                    <Field label="Validity years">
                      <input type="number" min="1" step="1" name="validity_years" value={planForm.validity_years ?? ''} onChange={updatePlanField} className="field-input" placeholder="Blank for lifetime" />
                      <p className="mt-1 text-xs text-gray-500">Blank means no expiry date.</p>
                    </Field>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Sort order">
                      <input type="number" name="sort_order" value={planForm.sort_order} onChange={updatePlanField} className="field-input" />
                    </Field>
                    <label className="mt-6 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm font-bold text-gray-700">
                      <input type="checkbox" name="is_active" checked={planForm.is_active} onChange={updatePlanField} className="h-4 w-4" />
                      Visible on public form
                    </label>
                  </div>
                  <FormActions editing={Boolean(editingPlanId)} saving={savingPlan} onClear={resetPlanForm} createLabel="Create type" updateLabel="Save type" />
                </div>
              </form>

              <div className="mt-5 grid gap-3">
                {plans.map((plan) => (
                  <article key={plan.id || plan.value} className="rounded-lg border border-gray-100 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${plan.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {plan.is_active ? 'Visible' : 'Hidden'}
                          </span>
                          <span className="text-xs font-semibold text-gray-500">{plan.slug || plan.value}</span>
                        </div>
                        <p className="mt-2 font-bold text-primary">{plan.label}</p>
                        <p className="text-sm font-semibold text-gray-700">{plan.amountLabel || plan.amount_label}</p>
                        <p className="mt-1 text-xs font-semibold text-gray-500">
                          Prefix: {plan.numberPrefix || plan.number_prefix || 'Auto'} · Validity: {plan.validityYears || plan.validity_years ? `${plan.validityYears || plan.validity_years} years` : 'Lifetime'}
                        </p>
                        {plan.description && <p className="mt-1 text-sm text-gray-500">{plan.description}</p>}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={() => editPlan(plan)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary hover:bg-gray-50">Edit</button>
                        {plan.id && <button type="button" onClick={() => setPendingDelete({ kind: 'plan', id: plan.id, label: plan.label })} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50">Delete</button>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">Categories</p>
                  <h2 className="mt-1 text-2xl font-bold text-primary">{categories.length} choices</h2>
                </div>
                {editingCategoryId && (
                  <button type="button" onClick={resetCategoryForm} className="text-sm font-bold text-primary hover:underline">
                    New category
                  </button>
                )}
              </div>

              <form onSubmit={saveCategory} className="mt-5 rounded-lg border border-gray-100 bg-[#fbfcfe] p-4">
                <p className="font-bold text-primary">{editingCategoryId ? 'Edit category' : 'Create category'}</p>
                <div className="mt-4 grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Label">
                      <input name="label" value={categoryForm.label} onChange={updateCategoryField} required maxLength="180" className="field-input" />
                    </Field>
                    <Field label="Slug">
                      <input name="slug" value={categoryForm.slug} onChange={updateCategoryField} required maxLength="80" className="field-input lowercase" />
                    </Field>
                  </div>
                  <Field label="Description">
                    <textarea name="description" value={categoryForm.description || ''} onChange={updateCategoryField} rows={2} maxLength="400" className="field-input" />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Sort order">
                      <input type="number" name="sort_order" value={categoryForm.sort_order} onChange={updateCategoryField} className="field-input" />
                    </Field>
                    <label className="mt-6 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm font-bold text-gray-700">
                      <input type="checkbox" name="is_active" checked={categoryForm.is_active} onChange={updateCategoryField} className="h-4 w-4" />
                      Visible on public form
                    </label>
                  </div>
                  <FormActions editing={Boolean(editingCategoryId)} saving={savingCategory} onClear={resetCategoryForm} createLabel="Create category" updateLabel="Save category" />
                </div>
              </form>

              <div className="mt-5 grid gap-3">
                {categories.map((category) => (
                  <article key={category.id || category.slug} className="rounded-lg border border-gray-100 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${category.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {category.is_active ? 'Visible' : 'Hidden'}
                          </span>
                          <span className="text-xs font-semibold text-gray-500">{category.slug}</span>
                        </div>
                        <p className="mt-2 font-bold text-primary">{category.label}</p>
                        {category.description && <p className="mt-1 text-sm text-gray-500">{category.description}</p>}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={() => editCategory(category)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary hover:bg-gray-50">Edit</button>
                        {category.id && <button type="button" onClick={() => setPendingDelete({ kind: 'category', id: category.id, label: category.label })} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50">Delete</button>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={pendingDelete?.kind === 'plan' ? 'Delete membership type?' : 'Delete category?'}
        body={`"${pendingDelete?.label || 'This item'}" will be removed from the public form. Existing submitted applications keep their saved text.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setPendingDelete(null)}
      />

      <AdminStyles />
    </AdminShell>
  );
};

function friendlyError(message = '', kind = 'item') {
  const normalized = String(message || '').toLowerCase();
  if (normalized.includes('row-level security') || normalized.includes('permission')) return `You do not have permission to manage this ${kind}.`;
  if (normalized.includes('duplicate') || normalized.includes('unique')) return `A ${kind} with the same slug already exists.`;
  if (normalized.includes('selected membership plan')) return 'This membership type is not active. Choose an active type before submitting.';
  if (normalized.includes('qr image') || normalized.includes('jpg') || normalized.includes('png') || normalized.includes('webp')) return message;
  if (normalized.includes('storage') || normalized.includes('bucket')) return 'QR upload failed. Use a JPG, PNG, or WebP image under 2 MB.';
  return message || `The ${kind} could not be saved.`;
}

function normalizePlanField(name, value) {
  if (name === 'slug') return normalizeSlug(value);
  if (name === 'number_prefix') return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return value;
}

function formatPlanAmountLabel(amount, currency) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return '';
  return `${new Intl.NumberFormat('en-IN').format(numericAmount)} ${currency === 'USD' ? 'USD' : 'INR'}`;
}

export default AdminMembershipSettings;
