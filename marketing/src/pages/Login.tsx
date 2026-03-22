import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, User, Globe, Search } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import Button from '../components/ui/Button';
import SectionLabel from '../components/ui/SectionLabel';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import ScrollReveal from '../components/ScrollReveal';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [vulnerabilityCount, setVulnerabilityCount] = useState(1241);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Attack counter visualization
  useEffect(() => {
    const interval = setInterval(() => {
       setVulnerabilityCount(prev => prev + Math.floor(Math.random() * 3));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await api.post('/api/auth/login', { email, password });
      login(response.data.token, response.data.user);
      window.location.href = 'http://localhost:3000/';
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async (credentialResponse: any) => {
    setIsLoading(true);
    setError('');
    try {
       const response = await api.post('/api/auth/google-login', {
          credential: credentialResponse.credential
       });
       
       const { status, token, user } = response.data;
       
       if (status === 'not_registered') {
          setError('No account found. Sign up first.');
          return;
       }
       
       if (status === 'incomplete') {
          navigate('/signup'); 
          return;
       }
       
       login(token, user);
       window.location.href = 'http://localhost:3000/';
    } catch (err: any) {
       setError(err.response?.data?.detail || 'Google login failed');
    } finally {
       setIsLoading(false);
    }
  };

  const shakeAnimation = {
    x: [0, -6, 6, -6, 6, -3, 3, 0],
    transition: { duration: 0.5 }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] flex flex-col lg:flex-row bg-bg overflow-hidden isolate">
       {/* Left side: Visuals */}
       <div className="hidden lg:flex w-1/2 relative bg-surface/20 flex-col items-center justify-center p-20 border-r border-border">
          <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
          
          <ScrollReveal delay={0.1} scale={0.8}>
             <div className="mb-12 relative flex items-center justify-center">
                <div className="absolute w-[200px] h-[200px] bg-accent/20 blur-[80px] rounded-full animate-pulse" />
                <div className="relative p-8 rounded-3xl glass border border-accent/30 shadow-[0_0_40px_rgba(99,102,241,0.2)]">
                   <Shield className="w-16 h-16 text-accent filter drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                </div>
                
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-4 -right-4 p-3 rounded-full glass border border-success/40 shadow-lg shadow-success/10"
                >
                   <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                </motion.div>
             </div>
          </ScrollReveal>
          
          <div className="text-center max-w-sm">
             <ScrollReveal delay={0.2} y={10}>
                <h2 className="text-4xl font-head font-extrabold text-white mb-6 tracking-tighter">
                   Welcome back.
                </h2>
             </ScrollReveal>
             <ScrollReveal delay={0.3} y={20}>
                <div className="flex flex-col items-center gap-4">
                   <div className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 w-full">
                      <div className="flex items-center justify-between gap-8 mb-2">
                          <span className="text-dim text-[10px] uppercase font-bold tracking-widest">Active Scanning</span>
                          <div className="w-2 h-2 bg-accent rounded-full animate-ping" />
                      </div>
                      <div className="text-3xl font-mono text-white font-bold tabular-nums">
                         {vulnerabilityCount.toLocaleString()}
                      </div>
                      <p className="text-[10px] text-accent font-bold mt-1 uppercase tracking-tighter">Vulnerabilities detected today</p>
                   </div>
                   <p className="text-muted text-sm leading-relaxed mt-4">
                      Continue your journey of securing your applications with intelligent automation.
                   </p>
                </div>
             </ScrollReveal>
          </div>

          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg to-transparent" />
       </div>

       {/* Right side: Login Form */}
       <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-20 relative">
          <div className="w-full max-w-md">
             <ScrollReveal delay={0.1}>
                <div className="text-center lg:text-left mb-12">
                   <h1 className="text-3xl font-head font-bold text-white mb-2">Sign in to ShieldSentinel</h1>
                   <p className="text-muted leading-relaxed">Secure, intelligent vulnerability management.</p>
                </div>
             </ScrollReveal>

             <div className="flex flex-col gap-8">
                <ScrollReveal delay={0.2}>
                   <GoogleLogin
                      onSuccess={handleGoogleLogin}
                      onError={() => setError('Google login failed')}
                      theme="filled_blue"
                      shape="pill"
                      size="large"
                      width="350"
                      useOneTap={false}
                   />
                </ScrollReveal>
                
                <ScrollReveal delay={0.3}>
                   <div className="flex items-center gap-4 text-dim text-xs font-bold uppercase tracking-widest">
                      <div className="h-px bg-border flex-1" />
                      <span>OR</span>
                      <div className="h-px bg-border flex-1" />
                   </div>
                </ScrollReveal>

                <form onSubmit={handleEmailLogin} className="space-y-6">
                   <AnimatePresence mode="wait">
                      <motion.div
                         key={error ? 'error' : 'normal'}
                         animate={error ? shakeAnimation : {}}
                         className="space-y-6"
                      >
                         <ScrollReveal delay={0.4} y={10}>
                            <div className="space-y-2">
                               <label className="text-[10px] font-bold text-dim uppercase tracking-[.2em] ml-1">Email Address</label>
                               <div className="relative">
                                  <input
                                     type="email"
                                     required
                                     value={email}
                                     onChange={(e) => setEmail(e.target.value)}
                                     placeholder="name@company.co"
                                     className={`w-full px-5 py-4 bg-card border rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-1 transition-all text-sm pl-12 ${
                                       error ? 'border-danger/50 focus:border-danger/60 focus:ring-danger/40' : 'border-border focus:border-accent/50 focus:ring-accent/50'
                                     }`}
                                  />
                                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
                               </div>
                            </div>
                         </ScrollReveal>

                         <ScrollReveal delay={0.5} y={10}>
                            <div className="space-y-2">
                               <div className="flex justify-between items-center ml-1">
                                  <label className="text-[10px] font-bold text-dim uppercase tracking-[.2em]">Password</label>
                                   <Link to="/forgot-password" className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline pointer-events-none opacity-50">Forgot password?</Link>
                               </div>
                               <div className="relative">
                                  <input
                                     type={showPass ? "text" : "password"}
                                     required
                                     value={password}
                                     onChange={(e) => setPassword(e.target.value)}
                                     placeholder="••••••••"
                                     className={`w-full px-5 py-4 bg-card border rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-1 transition-all text-sm pl-12 pr-12 ${
                                       error ? 'border-danger/50 focus:border-danger/60 focus:ring-danger/40' : 'border-border focus:border-accent/50 focus:ring-accent/50'
                                     }`}
                                  />
                                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
                                  <button
                                     type="button"
                                     onClick={() => setShowPass(!showPass)}
                                     className="absolute right-4 top-1/2 -translate-y-1/2 text-dim hover:text-white transition-colors"
                                  >
                                     {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                               </div>
                            </div>
                         </ScrollReveal>
                      </motion.div>
                   </AnimatePresence>

                   {error && (
                      <motion.div 
                         initial={{ opacity: 0, y: -4, height: 0 }}
                         animate={{ opacity: 1, y: 0, height: 'auto' }}
                         className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-medium text-center"
                      >
                         {error}
                      </motion.div>
                   )}

                   <ScrollReveal delay={0.6}>
                      <Button 
                         type="submit" 
                         className="w-full py-4 text-sm font-bold uppercase tracking-widest gap-2" 
                         loading={isLoading}
                         icon={ArrowRight}
                      >
                         Sign In
                      </Button>
                   </ScrollReveal>
                </form>

                <ScrollReveal delay={0.7}>
                   <div className="text-center">
                      <p className="text-muted text-sm">
                         Don't have an account? <Link to="/signup" className="text-accent font-bold hover:underline">Sign up</Link>
                      </p>
                   </div>
                </ScrollReveal>
             </div>
          </div>
       </div>
    </div>
  );
};

export default Login;
