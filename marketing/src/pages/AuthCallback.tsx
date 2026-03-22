import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // In a real app, logic to handle the code/token from Google URL
    // and communicate with the backend.
    const timer = setTimeout(() => {
      navigate('/register');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <div className="p-4 rounded-2xl bg-surface border border-primary/20 animate-pulse">
          <Shield className="w-12 h-12 text-primary" fill="currentColor" fillOpacity={0.1} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Authenticating Identity...</h2>
          <p className="text-text-secondary text-sm">Validating your credentials with Google</p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
