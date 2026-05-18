import React from 'react';
import { Link } from 'react-router-dom';

export const StatusBlock = ({ status }) => {
  if (!status.message) return null;
  const success = status.type === 'success';
  return (
    <div className={`pointer-events-none fixed right-4 top-24 z-[80] w-[calc(100vw-2rem)] max-w-sm rounded-lg border bg-white p-4 text-sm font-semibold shadow-lg ${success ? 'border-green-100 text-green-700' : 'border-red-100 text-red-700'}`}>
      <div className="flex items-start gap-3">
        <span className="material-icons-outlined mt-0.5 text-lg">{success ? 'check_circle' : 'error'}</span>
        <p className="min-w-0 leading-5">{status.message}</p>
      </div>
    </div>
  );
};

export const Field = ({ label, children }) => (
  <label className="block min-w-0">
    <span className="field-label">{label}</span>
    {children}
  </label>
);

export const FileField = ({ label, name, accept, onChange, current }) => (
  <label className="block min-w-0">
    <span className="field-label">{label}</span>
    <input type="file" name={name} accept={accept} onChange={onChange} className="block max-w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-blue-900" />
    {current && <p className="mt-2 max-w-full break-all text-xs leading-5 text-gray-500">Current: {current}</p>}
  </label>
);

export const FormActions = ({ editing, saving, onClear, createLabel, updateLabel }) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
    <button type="button" onClick={onClear} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">Clear</button>
    <button type="submit" disabled={saving} className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50">
      {saving ? 'Saving...' : editing ? updateLabel : createLabel}
    </button>
  </div>
);

export const ContentList = ({ title, count, loading, emptyText, publicLink, rows, renderRow }) => (
  <div className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-DEFAULT">{title}</p>
        <h2 className="mt-1 text-2xl font-bold text-primary">{count} entries</h2>
      </div>
      <Link to={publicLink} className="text-sm font-bold text-primary hover:underline">Open public page</Link>
    </div>
    {loading ? <p className="mt-6 text-center text-sm font-semibold text-gray-500">Loading...</p> : (
      <div className="mt-5 grid min-w-0 gap-3">
        {rows.map(renderRow)}
        {rows.length === 0 && <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center font-semibold text-gray-500">{emptyText}</div>}
      </div>
    )}
  </div>
);

export const RowStatus = ({ published, slug }) => (
  <div className="flex min-w-0 flex-wrap items-center gap-2">
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${published ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
      {published ? 'Published' : 'Draft'}
    </span>
    {slug && <span className="min-w-0 max-w-full truncate text-xs font-semibold text-gray-500">{slug}</span>}
  </div>
);

export const RowActions = ({ onEdit, onToggle, published, onDelete }) => (
  <div className="flex shrink-0 flex-wrap gap-2">
    <button type="button" onClick={onEdit} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary hover:bg-gray-50">Edit</button>
    <button type="button" onClick={onToggle} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-primary hover:bg-gray-50">{published ? 'Unpublish' : 'Publish'}</button>
    <button type="button" onClick={onDelete} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50">Delete</button>
  </div>
);

export const AdminStyles = () => (
  <style>{`
    .field-label { display: block; margin-bottom: 0.4rem; font-size: 0.875rem; font-weight: 700; color: #334155; }
    .field-input { width: 100%; border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.6rem 0.85rem; color: #111827; background: #fff; }
    .field-input:focus { outline: none; border-color: #0A2342; box-shadow: 0 0 0 2px rgba(10, 35, 66, 0.12); }
  `}</style>
);
