import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ProtectedRoute = ({ children, requireAdmin = false, requireVerified = true }) => {
  const { loading, user, emailVerified, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-gold-DEFAULT animate-spin">progress_activity</span>
          <p className="mt-3 font-semibold text-primary dark:text-white">Checking session...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireVerified && !emailVerified) {
    return (
      <main className="container mx-auto px-4 py-16 min-h-[60vh]">
        <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 text-center">
          <span className="material-symbols-outlined text-6xl text-gold-DEFAULT">mark_email_unread</span>
          <h1 className="mt-4 text-2xl font-bold text-primary dark:text-white">Verify your email</h1>
          <p className="mt-3 text-gray-600 dark:text-gray-300">
            Please verify your email address before continuing.
          </p>
        </div>
      </main>
    );
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/account" replace />;
  }

  return children;
};

export default ProtectedRoute;
