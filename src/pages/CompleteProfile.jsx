import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { useAuth } from '../hooks/useAuth';

const maxPhotoBytes = 3 * 1024 * 1024;
const allowedPhotoTypes = ['image/jpeg', 'image/png', 'image/webp'];

const CompleteProfile = () => {
  const navigate = useNavigate();
  const {
    loading,
    user,
    profile,
    isAdmin,
    profileComplete,
    completeVoterProfile,
    signOut,
  } = useAuth();
  const [form, setForm] = useState({
    fullName: '',
    registrationNo: '',
    photoFile: null,
  });
  const [status, setStatus] = useState({ type: null, message: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!profile) return;

    setForm((current) => ({
      ...current,
      fullName: current.fullName || profile.full_name || '',
      registrationNo: current.registrationNo || profile.registration_no || '',
    }));
  }, [profile]);

  useEffect(() => {
    if (loading) return;
    if (isAdmin) {
      navigate('/admin', { replace: true });
      return;
    }
    if (profileComplete) {
      navigate('/account', { replace: true });
    }
  }, [isAdmin, loading, navigate, profileComplete]);

  const photoPreview = useMemo(() => {
    if (!form.photoFile) return null;
    return URL.createObjectURL(form.photoFile);
  }, [form.photoFile]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const identityMissing = !profile?.full_name || !profile?.registration_no;
  const hasExistingPhoto = Boolean(profile?.photo_path);

  const updateTextField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const updatePhoto = (event) => {
    const file = event.target.files?.[0] || null;
    setStatus({ type: null, message: '' });

    if (!file) {
      setForm((current) => ({ ...current, photoFile: null }));
      return;
    }

    if (!allowedPhotoTypes.includes(file.type)) {
      setStatus({ type: 'error', message: 'Please upload a JPG, PNG or WebP photo.' });
      event.target.value = '';
      return;
    }

    if (file.size > maxPhotoBytes) {
      setStatus({ type: 'error', message: 'Please upload a photo under 3 MB.' });
      event.target.value = '';
      return;
    }

    setForm((current) => ({ ...current, photoFile: file }));
  };

  const submitProfile = async (event) => {
    event.preventDefault();
    setStatus({ type: null, message: '' });

    const fullName = form.fullName || profile?.full_name || '';
    const registrationNo = form.registrationNo || profile?.registration_no || '';

    if (!fullName.trim() || !registrationNo.trim()) {
      setStatus({ type: 'error', message: 'Your name and registration number are required before voting.' });
      return;
    }

    if (!hasExistingPhoto && !form.photoFile) {
      setStatus({ type: 'error', message: 'Please upload your voter photo to complete the profile.' });
      return;
    }

    setSubmitting(true);

    try {
      const result = await completeVoterProfile({
        fullName,
        registrationNo,
        photoFile: form.photoFile,
      });

      if (!result.ok) {
        setStatus({ type: 'error', message: result.message });
        return;
      }

      navigate('/account', { replace: true });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error?.message || 'The photo upload failed. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="grid min-h-[60vh] place-items-center bg-[#f7f9fc] px-4">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-5xl text-gold-DEFAULT">progress_activity</span>
          <p className="mt-3 font-semibold text-primary">Checking session...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-4 py-10">
      <SEO
        title="Complete Voter Profile"
        description="Upload voter photo after magic-link login."
        keywords="SGIHPBP complete voter profile, voter photo"
      />

      <div className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
        <section className="border-b border-gray-100 bg-primary px-6 py-7 text-white md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-light">Voter Verification</p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold md:text-4xl">Complete Your Profile</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-200">
                Upload your voter photo from this logged-in session before opening the voting dashboard.
              </p>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center justify-center rounded-lg border border-white/25 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <span className="material-icons-outlined mr-2 text-base">logout</span>
              Logout
            </button>
          </div>
        </section>

        <form onSubmit={submitProfile} className="grid gap-6 p-6 md:grid-cols-[0.9fr_1.1fr] md:p-8">
          <aside className="rounded-lg border border-gray-100 bg-[#fbfcfe] p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Signed in as</p>
            <p className="mt-2 break-words font-bold text-primary">{user?.email}</p>

            <div className="mt-5 grid gap-3">
              <InfoTile label="Name" value={profile?.full_name || form.fullName || 'Not saved yet'} />
              <InfoTile label="Registration No." value={profile?.registration_no || form.registrationNo || 'Not saved yet'} />
              <InfoTile label="Photo Status" value={hasExistingPhoto ? 'Saved' : 'Required'} />
            </div>
          </aside>

          <section className="space-y-5">
            {identityMissing && (
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="form-label">Full Name</span>
                  <input
                    type="text"
                    name="fullName"
                    value={form.fullName}
                    onChange={updateTextField}
                    required
                    minLength="2"
                    maxLength="120"
                    className="form-input"
                    placeholder="Enter your full name"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="form-label">Registration No.</span>
                  <input
                    type="text"
                    name="registrationNo"
                    value={form.registrationNo}
                    onChange={updateTextField}
                    required
                    minLength="2"
                    maxLength="40"
                    className="form-input uppercase"
                    placeholder="DCIAPM001"
                  />
                </label>
              </div>
            )}

            <label className="block">
              <span className="form-label">Voter Photo</span>
              <div className="flex flex-col gap-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-white">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Voter preview" className="h-full w-full object-cover" />
                  ) : (
                    <span className="material-icons-outlined text-4xl">person</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <input
                    type="file"
                    name="photoFile"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={updatePhoto}
                    required={!hasExistingPhoto}
                    className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-blue-900"
                  />
                  <p className="mt-2 text-xs font-semibold text-gray-500">JPG, PNG or WebP. Maximum 3 MB.</p>
                </div>
              </div>
            </label>

            <StatusMessage status={status} />

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3 font-bold text-white shadow-lg transition hover:bg-blue-900 disabled:opacity-50"
            >
              <span className="material-icons-outlined mr-2 text-base">verified_user</span>
              {submitting ? 'Saving profile...' : 'Save photo and continue'}
            </button>
          </section>
        </form>
      </div>

      <style>{`
        .form-label { display: block; font-size: 0.875rem; font-weight: 700; color: #374151; margin-bottom: 0.35rem; }
        .form-input { width: 100%; padding: 0.75rem 1rem; border-radius: 0.5rem; border: 1px solid #D1D5DB; background-color: white; color: #111827; transition: border-color 0.2s, box-shadow 0.2s; }
        .form-input:focus { outline: none; border-color: #D4AF37; box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.25); }
      `}</style>
    </main>
  );
};

const InfoTile = ({ label, value }) => (
  <div className="rounded-lg border border-gray-100 bg-white p-4">
    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-2 break-words font-bold text-gray-900">{value}</p>
  </div>
);

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

export default CompleteProfile;
