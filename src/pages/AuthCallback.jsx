import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { useAuth } from '../hooks/useAuth';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { loading, refreshProfile } = useAuth();

  useEffect(() => {
    if (loading) return undefined;

    let cancelled = false;

    const completeAuth = async () => {
      const nextState = await refreshProfile();
      if (cancelled) return;

      if (!nextState?.user) {
        navigate('/login', { replace: true });
        return;
      }

      const profile = nextState.profile;
      const nextIsAdmin = profile?.role === 'admin' && profile?.is_active;
      const nextProfileComplete = Boolean(
        nextIsAdmin || (
          profile?.full_name
          && profile?.registration_no
          && profile?.photo_path
        ),
      );

      navigate(nextIsAdmin ? '/admin' : nextProfileComplete ? '/account' : '/complete-profile', { replace: true });
    };

    completeAuth().catch((error) => {
      console.error('Unable to finish auth callback:', error);
      if (!cancelled) navigate('/login', { replace: true });
    });

    return () => {
      cancelled = true;
    };
  }, [loading, navigate, refreshProfile]);

  return (
    <main className="min-h-[60vh] flex items-center justify-center bg-background-light dark:bg-background-dark px-4">
      <SEO
        title="Verifying Email"
        description="Completing SGIHPBP account verification."
        keywords="SGIHPBP email verification"
      />
      <div className="text-center bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
        <span className="material-symbols-outlined text-5xl text-gold-DEFAULT animate-spin">progress_activity</span>
        <h1 className="mt-4 text-2xl font-bold text-primary dark:text-white">Completing verification</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">Please wait while we finish signing you in.</p>
      </div>
    </main>
  );
};

export default AuthCallback;
