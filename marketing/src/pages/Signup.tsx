import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle2, Lock, ArrowRight, Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import Button from '../components/ui/Button';
import GlowCard from '../components/ui/GlowCard';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import ScrollReveal from '../components/ScrollReveal';

const Signup = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [googleData, setGoogleData] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.post('/api/auth/google-verify', {
        credential: credentialResponse.credential
      });
      
      const { status, google_id, email, name, avatar_url, requires_password } = response.data;
      
      if (status === 'existing_user' && !requires_password) {
          setError('Account already exists. Please sign in.');
          return;
      }

      setGoogleData({ google_id, email, name, avatar_url });
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Google verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStrength = (pass: string) => {
    let score = 0;
    if (pass.length === 0) return 0;
    if (pass.length >= 8) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    if (pass.length >= 16) score += 1;
    return score;
  };

  const strength = calculateStrength(password);
  const strengthLabels = ["", "Too short", "Weak", "Moderate", "Strong", "Very strong"];
  const strengthColors = ["bg-dim", "bg-danger", "bg-orange-500", "bg-warning", "bg-success", "bg-success"];

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (strength < 3) return;
    if (password !== confirmPassword) return;

    setIsLoading(true);
    setError('');
    try {
      const response = await api.post('/api/auth/complete-signup', {
        google_id: googleData.google_id,
        password,
        confirm_password: confirmPassword
      });
      
      login(response.data.token, response.data.user);
      window.location.href = 'http://localhost:3000/';
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] flex flex-col lg:flex-row bg-bg overflow-hidden isolate">
       {/* Left side: Visuals */}
       <div className="hidden lg:flex w-1/2 relative bg-surface/20 flex-col items-center justify-center p-20 border-r border-border">
          <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
          <ScrollReveal delay={0.1} scale={0.8}>
             <div className="mb-12 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-accent/20 blur-[100px] rounded-full" />
                <Shield className="w-32 h-32 text-accent relative z-10 filter drop-shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
             </div>
          </ScrollReveal>
          
          <ScrollReveal delay={0.2} y={10}>
             <h2 className="text-4xl font-head font-extrabold text-white text-center mb-8 tracking-tighter">
                Secure your first app in minutes.
             </h2>
          </ScrollReveal>
          
          <div className="flex flex-col gap-6 w-full max-w-sm">
             {[
               { icon: CheckCircle2, text: "No credit card required" },
               { icon: Shield, text: "Free plan forever" },
               { icon: Lock, text: "Start scanning in 60 seconds" },
             ].map((item, i) => (
                <ScrollReveal key={i} delay={0.3 + i * 0.1} x={-20}>
                   <div className="flex items-center gap-4 text-muted group">
                      <div className="p-2 rounded-lg bg-accent/10 border border-accent/20 group-hover:border-accent/40 transition-colors">
                         <item.icon className="w-5 h-5 text-accent" />
                      </div>
                      <span className="font-medium group-hover:text-white transition-colors">{item.text}</span>
                   </div>
                </ScrollReveal>
             ))}
          </div>

          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg to-transparent" />
       </div>

       {/* Right side: Forms */}
       <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-20 relative">
          <AnimatePresence mode="wait">
             {step === 1 ? (
                <motion.div
                   key="step1"
                   initial={{ opacity: 0, x: 60 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -60 }}
                   transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                   className="w-full max-w-md"
                >
                   <ScrollReveal delay={0.1}>
                      <div className="text-center lg:text-left mb-12">
                         <h1 className="text-3xl font-head font-bold text-white mb-3">Create your account</h1>
                         <p className="text-muted leading-relaxed">
                            Connect Google to get started — your email will be automatically verified.
                         </p>
                      </div>
                   </ScrollReveal>

                   <div className="flex flex-col gap-8 flex-wrap justify-center">
                      <ScrollReveal delay={0.2}>
                         <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError('Google login failed')}
                            theme="filled_blue"
                            shape="pill"
                            size="large"
                            width="100%"
                            useOneTap
                         />
                      </ScrollReveal>
                      
                      <ScrollReveal delay={0.3}>
                         <div className="flex items-center gap-4 text-dim text-xs font-bold uppercase tracking-widest">
                            <div className="h-px bg-border flex-1" />
                            <span>OR</span>
                            <div className="h-px bg-border flex-1" />
                         </div>
                      </ScrollReveal>

                      <ScrollReveal delay={0.4}>
                         <div className="text-center">
                            <p className="text-muted text-sm">
                               Already have an account? <Link to="/login" className="text-accent font-bold hover:underline">Sign in</Link>
                            </p>
                         </div>
                      </ScrollReveal>
                   </div>

                   {error && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm text-center"
                      >
                         {error}
                      </motion.div>
                   )}

                   <ScrollReveal delay={0.5}>
                      <p className="mt-20 text-[10px] text-center text-dim leading-relaxed">
                         By creating an account you agree to our <a href="#" className="underline">Terms of Service</a> and <a href="#" className="underline">Privacy Policy</a>.
                      </p>
                   </ScrollReveal>
                </motion.div>
             ) : (
                <motion.div
                   key="step2"
                   initial={{ opacity: 0, x: 60 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -60 }}
                   transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                   className="w-full max-w-md"
                >
                   <ScrollReveal delay={0.1}>
                      <div className="text-center lg:text-left mb-10">
                         <h1 className="text-3xl font-head font-bold text-white mb-2">Welcome, {googleData?.name?.split(' ')[0]}!</h1>
                         <p className="text-muted text-sm leading-relaxed">Complete your setup by setting a password.</p>
                      </div>
                   </ScrollReveal>

                   <ScrollReveal delay={0.2} y={15}>
                      <div className="p-6 rounded-2xl glass border-border mb-8 flex items-center gap-6 relative group overflow-hidden">
                         <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                         <img 
                           src={googleData?.avatar_url} 
                           alt="Avatar" 
                           className="w-14 h-14 rounded-full border-2 border-accent/20"
                         />
                         <div className="flex flex-col gap-1 min-w-0">
                            <h4 className="text-white font-bold text-base truncate">{googleData?.name}</h4>
                            <div className="flex items-center gap-2 text-dim text-xs select-none pointer-events-none">
                               <span className="truncate">{googleData?.email}</span>
                               <div className="flex items-center gap-1 text-success font-bold uppercase tracking-tighter">
                                  <CheckCircle2 className="w-3 h-3" />
                                  VERIFIED
                               </div>
                            </div>
                         </div>
                         <div className="ml-auto p-2">
                            <Lock className="w-5 h-5 text-dim/50" />
                         </div>
                      </div>
                   </ScrollReveal>

                   <form onSubmit={handleCompleteSignup} className="space-y-6">
                      <ScrollReveal delay={0.3} y={10}>
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold text-dim uppercase tracking-[.2em] ml-1">Set Password</label>
                            <div className="relative">
                               <input
                                  type={showPass ? "text" : "password"}
                                  required
                                  autoFocus
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  placeholder="Min 8 characters"
                                  className="w-full px-5 py-4 bg-card border border-border rounded-xl text-white placeholder:text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all text-sm pr-12"
                               />
                               <button
                                  type="button"
                                  onClick={() => setShowPass(!showPass)}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-dim hover:text-white transition-colors"
                               >
                                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                               </button>
                            </div>
                            
                            <div className="flex flex-col gap-2 mt-4 px-1">
                               <div className="flex gap-1.5">
                                  {[1, 2, 3, 4, 5].map(i => (
                                     <div 
                                       key={i} 
                                       className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                                         i <= strength ? strengthColors[strength] : 'bg-white/5'
                                       }`} 
                                     />
                                  ))}
                               </div>
                               <div className="flex justify-between items-center px-0.5">
                                  <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                    strength > 0 ? strengthColors[strength].replace('bg-', 'text-') : 'text-dim'
                                  }`}>
                                     {strength > 0 ? strengthLabels[strength] : 'Security level'}
                                  </span>
                               </div>
                            </div>
                         </div>
                      </ScrollReveal>

                      <ScrollReveal delay={0.4} y={10}>
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold text-dim uppercase tracking-[.2em] ml-1">Confirm Password</label>
                            <div className="relative">
                               <input
                                  type="password"
                                  required
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  placeholder="Repeat password"
                                  className={`w-full px-5 py-4 bg-card border rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-1 transition-all text-sm pr-10 ${
                                    confirmPassword.length > 0 
                                      ? (password === confirmPassword ? 'border-success/40 focus:border-success/60 focus:ring-success/50' : 'border-danger/40 focus:border-danger/60 focus:ring-danger/50')
                                      : 'border-border focus:border-accent/50 focus:ring-accent/50'
                                  }`}
                               />
                               <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                  {confirmPassword.length > 0 && (
                                     password === confirmPassword 
                                      ? <Check className="w-4 h-4 text-success" /> 
                                      : <X className="w-4 h-4 text-danger" />
                                  )}
                               </div>
                            </div>
                         </div>
                      </ScrollReveal>

                      <ScrollReveal delay={0.5}>
                         <Button 
                            type="submit" 
                            className="w-full py-4 text-sm font-bold uppercase tracking-widest gap-2 mt-4" 
                            disabled={strength < 3 || password !== confirmPassword || isLoading}
                            loading={isLoading}
                            icon={ArrowRight}
                         >
                            Complete Setup
                         </Button>
                      </ScrollReveal>

                      <ScrollReveal delay={0.6}>
                         <button 
                            type="button" 
                            onClick={() => setStep(1)}
                            className="w-full text-center text-dim text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
                         >
                            ← Go back
                         </button>
                      </ScrollReveal>
                   </form>
                </motion.div>
             )}
          </AnimatePresence>
       </div>
    </div>
  );
};

export default Signup;
