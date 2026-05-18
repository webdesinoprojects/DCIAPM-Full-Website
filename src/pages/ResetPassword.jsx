import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { useAuth } from '../hooks/useAuth';

const ResetPassword = () => {
  const navigate = useNavigate();
  const {
    loading,
    user,
    updatePassword,
  } = useAuth();
  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
  });
  const [status, setStatus] = useState({ type: null, message: '' });
  const [submitting, setSubmitting] = useState(false);

  const updateForm = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    setStatus({ type: null, message: '' });

    if (form.password !== form.confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setSubmitting(true);
    const result = await updatePassword({ password: form.password });
    setSubmitting(false);

    if (!result.ok) {
      setStatus({ type: 'error', message: result.message });
      return;
    }

    const nextProfile = result.profile;
    const nextIsAdmin = nextProfile?.role === 'admin' && nextProfile?.is_active;
    const nextProfileComplete = Boolean(
      nextIsAdmin || (
        nextProfile?.full_name
        && nextProfile?.registration_no
        && nextProfile?.photo_path
      ),
    );

    navigate(nextIsAdmin ? '/admin' : nextProfileComplete ? '/account' : '/complete-profile', { replace: true });
  };

  if (loading) {
    return (
      <main className="grid min-h-[60vh] place-items-center bg-[#f7f9fc] px-4">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-5xl text-gold-DEFAULT">progress_activity</span>
          <p className="mt-3 font-semibold text-primary">Checking reset link...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background-light px-4 py-10 dark:bg-background-dark">
      <SEO
        title="Reset Password"
        description="Set a new voter account password."
        keywords="SGIHPBP reset password, voter password"
      />

      <div className="mx-auto max-w-xl rounded-xl border border-gray-100 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-DEFAULT">Account Recovery</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-primary dark:text-white">Set New Password</h1>

        {!user ? (
          <div className="mt-6 rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            This reset link is missing or expired. Return to login and send a new password reset email.
          </div>
        ) : (
          <form onSubmit={submitPassword} className="mt-6 space-y-5">
            <label className="block">
              <span className="form-label">New Password</span>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={updateForm}
                required
                minLength="6"
                className="form-input"
                autoComplete="new-password"
              />
            </label>

            <label className="block">
              <span className="form-label">Confirm Password</span>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={updateForm}
                required
                minLength="6"
                className="form-input"
                autoComplete="new-password"
              />
            </label>

            <StatusMessage status={status} />

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3 font-bold text-white shadow-lg transition hover:bg-blue-900 disabled:opacity-50"
            >
              <span className="material-icons-outlined mr-2 text-base">lock_reset</span>
              {submitting ? 'Saving password...' : 'Save new password'}
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          <Link to="/login" className="font-bold text-primary hover:underline dark:text-gold-light">Return to login</Link>
        </p>
      </div>

      <style>{`
        .form-label { display: block; font-size: 0.875rem; font-weight: 700; color: #374151; margin-bottom: 0.35rem; }
        .dark .form-label { color: #E5E7EB; }
        .form-input { width: 100%; padding: 0.75rem 1rem; border-radius: 0.5rem; border: 1px solid #D1D5DB; background-color: white; color: #111827; transition: border-color 0.2s, box-shadow 0.2s; }
        .dark .form-input { background-color: #1F2937; border-color: #4B5563; color: white; }
        .form-input:focus { outline: none; border-color: #D4AF37; box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.25); }
      `}</style>
    </main>
  );
};

const StatusMessage = ({ status }) => {
  if (!status.message) return null;

  return (
    <div className={`rounded-lg border p-4 text-sm font-semibold ${
      status.type === 'success'
        ? 'border-green-100 bg-green-50 text-green-700'
        : 'border-red-100 bg-red-50 text-red-700'
    }`}>
      {status.message}
    </div>
  );
};

export default ResetPassword;
