import { useEffect, useState } from 'react';
import { isAuthenticated, redirectToLogin } from '../lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Wraps any route that requires authentication.
 * If no valid token is found in localStorage, the user is
 * sent to the marketing/auth site at http://localhost:4000/login.
 */
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const authOk = await isAuthenticated();
      if (authOk) {
        setAllowed(true);
      } else {
        redirectToLogin();
      }
      setChecking(false);
    };
    checkAuth();
  }, []);

  if (checking) {
    // Brief loading screen while we check auth
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#0a0a0f',
          color: '#fff',
          flexDirection: 'column',
          gap: '16px',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid #6366f1',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Verifying your session…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return allowed ? <>{children}</> : null;
};

export default ProtectedRoute;
