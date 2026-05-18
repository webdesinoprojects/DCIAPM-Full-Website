import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { useAuth } from '../hooks/useAuth';

const initialSignInForm = {
  email: '',
  password: '',
};

const initialSignUpForm = {
  fullName: '',
  email: '',
  registrationNo: '',
  password: '',
  confirmPassword: '',
};

const initialMagicLinkForm = {
  email: '',
};

const initialForgotForm = {
  email: '',
};

const initialAdminForm = {
  email: 'admin@gmail.com',
  password: 'admin123',
};

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    loading,
    user,
    isAdmin,
    profileComplete,
    requestMagicLink,
    sendPasswordReset,
    signIn,
    signUp,
  } = useAuth();
  const [activeTab, setActiveTab] = useState('voter');
  const [voterMode, setVoterMode] = useState('signin');
  const [signInForm, setSignInForm] = useState(initialSignInForm);
  const [signUpForm, setSignUpForm] = useState(initialSignUpForm);
  const [magicLinkForm, setMagicLinkForm] = useState(initialMagicLinkForm);
  const [forgotForm, setForgotForm] = useState(initialForgotForm);
  const [adminForm, setAdminForm] = useState(initialAdminForm);
  const [status, setStatus] = useState({ type: null, message: '' });
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname || (isAdmin ? '/admin' : '/account');

  useEffect(() => {
    if (!user) return;
    if (isAdmin) {
      navigate('/admin', { replace: true });
      return;
    }

    navigate(profileComplete ? redirectTo : '/complete-profile', { replace: true });
  }, [isAdmin, navigate, profileComplete, redirectTo, user]);

  const switchVoterMode = (mode) => {
    setVoterMode(mode);
    setStatus({ type: null, message: '' });
  };

  const updateForm = (setter) => (event) => {
    const { name, value } = event.target;
    setter((current) => ({ ...current, [name]: value }));
  };

  const submitVoterSignIn = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: null, message: '' });

    const result = await signIn(signInForm);
    setSubmitting(false);

    if (!result.ok) {
      setStatus({ type: 'error', message: result.message });
      if (result.code === 'ACCOUNT_EXISTS') {
        setVoterMode('signin');
        setSignInForm({ email: signUpForm.email, password: '' });
      }
      return;
    }

    if (result.profile?.role === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }

    navigate(result.profile?.photo_path ? redirectTo : '/complete-profile', { replace: true });
  };

  const submitVoterSignUp = async (event) => {
    event.preventDefault();
    setStatus({ type: null, message: '' });

    if (signUpForm.password !== signUpForm.confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setSubmitting(true);

    const result = await signUp({
      email: signUpForm.email,
      password: signUpForm.password,
      fullName: signUpForm.fullName,
      registrationNo: signUpForm.registrationNo,
    });

    setSubmitting(false);

    if (!result.ok) {
      setStatus({ type: 'error', message: result.message });
      return;
    }

    if (result.needsVerification) {
      setStatus({
        type: 'success',
        message: 'Account created. Please verify your email, then sign in with your password.',
      });
      setVoterMode('signin');
      setSignInForm({ email: signUpForm.email, password: '' });
      return;
    }

    navigate('/complete-profile', { replace: true });
  };

  const sendMagicLink = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: null, message: '' });

    const result = await requestMagicLink({
      email: magicLinkForm.email,
      shouldCreateUser: false,
    });

    setSubmitting(false);

    if (!result.ok) {
      setStatus({ type: 'error', message: result.message });
      return;
    }

    setStatus({
      type: 'success',
      message: 'Sign-in link sent. Open the email link to continue.',
    });
  };

  const submitForgotPassword = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: null, message: '' });

    const result = await sendPasswordReset({ email: forgotForm.email });
    setSubmitting(false);

    if (!result.ok) {
      setStatus({ type: 'error', message: result.message });
      return;
    }

    setStatus({
      type: 'success',
      message: 'Password reset link sent. Open the email link and set a new password.',
    });
  };

  const submitAdminLogin = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: null, message: '' });

    const result = await signIn(adminForm);
    setSubmitting(false);

    if (!result.ok) {
      setStatus({ type: 'error', message: result.message });
      return;
    }

    if (result.profile?.role !== 'admin') {
      setStatus({ type: 'error', message: 'This login is not an admin account.' });
      return;
    }

    navigate('/admin', { replace: true });
  };

  if (loading || user) {
    return (
      <main className="grid min-h-screen place-items-center bg-background-light px-4 dark:bg-background-dark">
        <SEO
          title="Governance Login"
          description="Secure SGIHPBP voter and admin login."
          keywords="SGIHPBP login, election login, admin login"
        />
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-5xl text-gold-DEFAULT">progress_activity</span>
          <p className="mt-3 font-semibold text-primary dark:text-white">Checking session...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background-light px-4 py-10 dark:bg-background-dark">
      <SEO
        title="Governance Login"
        description="Secure SGIHPBP voter and admin login."
        keywords="SGIHPBP login, election login, admin login"
      />

      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="bg-primary p-8 text-white md:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-light">DC-IAPM Governance Portal</p>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight md:text-4xl">
            Verified access for voters and administrators
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-gray-200 md:text-base">
            Voters create a password account for regular sign-in. Email magic links and password reset stay available as recovery paths.
          </p>

          <div className="mt-8 grid gap-3">
            <InfoRow icon="lock" title="Password sign-in" text="Repeat voter access does not depend on sending an email every time." />
            <InfoRow icon="mark_email_read" title="Email backup" text="Magic link and reset email remain available for recovery." />
            <InfoRow icon="add_a_photo" title="Photo after login" text="The voter photo is uploaded after a real Supabase session starts." />
          </div>
        </section>

        <section className="p-6 md:p-10">
          <div className="mb-6 grid grid-cols-2 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
            <TabButton active={activeTab === 'voter'} onClick={() => setActiveTab('voter')}>
              Voter Access
            </TabButton>
            <TabButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')}>
              Admin Login
            </TabButton>
          </div>

          {activeTab === 'voter' ? (
            <>
              <div className="mb-6 grid gap-2 sm:grid-cols-4">
                <ModeButton active={voterMode === 'signin'} onClick={() => switchVoterMode('signin')} icon="login" label="Sign in" />
                <ModeButton active={voterMode === 'signup'} onClick={() => switchVoterMode('signup')} icon="person_add" label="Create" />
                <ModeButton active={voterMode === 'magic'} onClick={() => switchVoterMode('magic')} icon="mail" label="Magic link" />
                <ModeButton active={voterMode === 'forgot'} onClick={() => switchVoterMode('forgot')} icon="key" label="Forgot" />
              </div>

              {voterMode === 'signin' && (
                <form onSubmit={submitVoterSignIn} className="space-y-5">
                  <label className="block">
                    <span className="form-label">Email Address</span>
                    <input
                      type="email"
                      name="email"
                      value={signInForm.email}
                      onChange={updateForm(setSignInForm)}
                      required
                      className="form-input"
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </label>

                  <label className="block">
                    <span className="form-label">Password</span>
                    <input
                      type="password"
                      name="password"
                      value={signInForm.password}
                      onChange={updateForm(setSignInForm)}
                      required
                      minLength="6"
                      className="form-input"
                      autoComplete="current-password"
                    />
                  </label>

                  <StatusMessage status={status} />

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3 font-bold text-white shadow-lg transition hover:bg-blue-900 disabled:opacity-50"
                  >
                    <span className="material-icons-outlined mr-2 text-base">login</span>
                    {submitting ? 'Signing in...' : 'Sign in'}
                  </button>
                </form>
              )}

              {voterMode === 'signup' && (
                <form onSubmit={submitVoterSignUp} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="form-label">Full Name</span>
                      <input
                        type="text"
                        name="fullName"
                        value={signUpForm.fullName}
                        onChange={updateForm(setSignUpForm)}
                        required
                        minLength="2"
                        maxLength="120"
                        className="form-input"
                        placeholder="Enter your full name"
                        autoComplete="name"
                      />
                    </label>

                    <label className="block">
                      <span className="form-label">Email Address</span>
                      <input
                        type="email"
                        name="email"
                        value={signUpForm.email}
                        onChange={updateForm(setSignUpForm)}
                        required
                        className="form-input"
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </label>

                    <label className="block">
                      <span className="form-label">Registration No.</span>
                      <input
                        type="text"
                        name="registrationNo"
                        value={signUpForm.registrationNo}
                        onChange={updateForm(setSignUpForm)}
                        required
                        minLength="2"
                        maxLength="40"
                        className="form-input uppercase"
                        placeholder="DCIAPM001"
                        autoComplete="off"
                      />
                    </label>

                    <label className="block">
                      <span className="form-label">Password</span>
                      <input
                        type="password"
                        name="password"
                        value={signUpForm.password}
                        onChange={updateForm(setSignUpForm)}
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
                        value={signUpForm.confirmPassword}
                        onChange={updateForm(setSignUpForm)}
                        required
                        minLength="6"
                        className="form-input"
                        autoComplete="new-password"
                      />
                    </label>
                  </div>

                  <StatusMessage status={status} />

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3 font-bold text-white shadow-lg transition hover:bg-blue-900 disabled:opacity-50"
                  >
                    <span className="material-icons-outlined mr-2 text-base">person_add</span>
                    {submitting ? 'Creating account...' : 'Create voter account'}
                  </button>
                </form>
              )}

              {voterMode === 'magic' && (
                <form onSubmit={sendMagicLink} className="space-y-5">
                  <label className="block">
                    <span className="form-label">Email Address</span>
                    <input
                      type="email"
                      name="email"
                      value={magicLinkForm.email}
                      onChange={updateForm(setMagicLinkForm)}
                      required
                      className="form-input"
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </label>

                  <StatusMessage status={status} />

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3 font-bold text-white shadow-lg transition hover:bg-blue-900 disabled:opacity-50"
                  >
                    <span className="material-icons-outlined mr-2 text-base">mail</span>
                    {submitting ? 'Sending link...' : 'Send magic link'}
                  </button>
                </form>
              )}

              {voterMode === 'forgot' && (
                <form onSubmit={submitForgotPassword} className="space-y-5">
                  <label className="block">
                    <span className="form-label">Email Address</span>
                    <input
                      type="email"
                      name="email"
                      value={forgotForm.email}
                      onChange={updateForm(setForgotForm)}
                      required
                      className="form-input"
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </label>

                  <StatusMessage status={status} />

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3 font-bold text-white shadow-lg transition hover:bg-blue-900 disabled:opacity-50"
                  >
                    <span className="material-icons-outlined mr-2 text-base">key</span>
                    {submitting ? 'Sending reset...' : 'Send password reset'}
                  </button>
                </form>
              )}
            </>
          ) : (
            <form onSubmit={submitAdminLogin} className="space-y-5">
              <label className="block">
                <span className="form-label">Admin Email</span>
                <input
                  type="email"
                  name="email"
                  value={adminForm.email}
                  onChange={updateForm(setAdminForm)}
                  required
                  className="form-input"
                  autoComplete="email"
                />
              </label>

              <label className="block">
                <span className="form-label">Password</span>
                <input
                  type="password"
                  name="password"
                  value={adminForm.password}
                  onChange={updateForm(setAdminForm)}
                  required
                  minLength="6"
                  className="form-input"
                  autoComplete="current-password"
                />
              </label>

              <StatusMessage status={status} />

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-primary px-5 py-3 font-bold text-white shadow-lg transition hover:bg-blue-900 disabled:opacity-50"
              >
                {submitting ? 'Checking...' : 'Login as Admin'}
              </button>
            </form>
          )}

          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            <Link to="/" className="font-bold text-primary hover:underline dark:text-gold-light">Return home</Link>
          </p>
        </section>
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

const TabButton = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-md px-4 py-3 text-sm font-bold transition ${
      active
        ? 'bg-primary text-white shadow'
        : 'text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-white'
    }`}
  >
    {children}
  </button>
);

const ModeButton = ({ active, icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition ${
      active
        ? 'bg-primary text-white shadow'
        : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-primary'
    }`}
  >
    <span className="material-icons-outlined text-base">{icon}</span>
    <span className="truncate">{label}</span>
  </button>
);

const InfoRow = ({ icon, title, text }) => (
  <div className="rounded-lg border border-white/15 bg-white/10 p-4">
    <div className="flex items-start gap-3">
      <span className="material-icons-outlined text-gold-light">{icon}</span>
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-1 text-sm leading-5 text-gray-200">{text}</p>
      </div>
    </div>
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

export default Auth;
