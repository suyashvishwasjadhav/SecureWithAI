import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Menu, X, ChevronRight, User, LogOut, LayoutDashboard, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import MagneticButton from './MagneticButton';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, logout, isLoggedIn } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location]);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Pricing', href: '/pricing' },
  ];

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-[60] h-[72px] flex items-center transition-all duration-300 px-6",
          isScrolled 
            ? "glass border-b border-border shadow-lg h-[64px] sm:h-[72px]" 
            : "bg-transparent border-b border-transparent"
        )}
      >
        <div className="max-w-[1280px] mx-auto w-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <motion.div
              whileHover={{ rotate: 15 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="relative"
            >
              <Shield className="w-8 h-8 text-accent shrink-0" fill="currentColor" fillOpacity={0.1} />
              <div className="absolute inset-0 bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
            <span className="font-head font-semibold text-xl tracking-tight text-white flex select-none">
              Shield<span className="text-accent">Sentinel</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 ml-8">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={cn(
                    "relative text-sm font-medium transition-colors duration-200 py-1",
                    isActive ? "text-white" : "text-muted hover:text-white"
                  )}
                >
                  {link.name}
                  {isActive && (
                    <motion.div 
                      layoutId="nav-dot"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent glow-accent"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-6 ml-auto">
            {!isLoggedIn ? (
              <>
                <Link to="/login" className="text-sm font-medium text-muted hover:text-white transition-colors">
                  Sign In
                </Link>
                <MagneticButton strength={0.4}>
                  <Link
                    to="/signup"
                    className="px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-head font-medium transition-all duration-200 hover:bg-[#818cf8] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] active:scale-95 group flex items-center gap-1.5"
                  >
                    Get Started <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </MagneticButton>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <MagneticButton strength={0.2}>
                   <a
                     href="http://localhost:3000"
                     className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-xs font-head font-bold uppercase tracking-widest transition-all duration-200 hover:bg-white/10 active:scale-95 group flex items-center gap-2"
                   >
                     Go to App <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-accent" />
                   </a>
                </MagneticButton>
                
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-3 p-1 rounded-full hover:bg-white/5 transition-colors focus:outline-none"
                  >
                    <div className="w-9 h-9 rounded-full border-2 border-accent/20 overflow-hidden shrink-0">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="User" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-surface/50 flex items-center justify-center">
                          <User className="w-5 h-5 text-muted" />
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium text-white pr-2 hidden lg:block">
                       {user?.full_name?.split(' ')[0]}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                        className="absolute right-0 mt-2 w-56 glass border border-border shadow-2xl rounded-2xl overflow-hidden py-2"
                      >
                        <div className="px-4 py-3 border-b border-border/50 mb-1">
                          <p className="text-xs font-bold text-dim uppercase tracking-widest mb-0.5">Logged in as</p>
                          <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                        </div>
                        
                        <a href="http://localhost:3000" className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:text-white hover:bg-white/5 transition-colors group">
                           <LayoutDashboard className="w-4 h-4 text-dim group-hover:text-accent" />
                           My Dashboard
                        </a>
                        <Link to="/pricing" className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:text-white hover:bg-white/5 transition-colors group">
                           <Shield className="w-4 h-4 text-dim group-hover:text-accent" />
                           View Plans
                        </Link>
                        
                        <div className="h-px bg-border/50 my-1 mx-2" />
                        
                        <button 
                          onClick={logout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-danger/5 transition-colors group"
                        >
                           <LogOut className="w-4 h-4" />
                           Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-white hover:bg-surface rounded-lg transition-colors ml-4"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="fixed top-[72px] left-0 right-0 z-50 overflow-hidden md:hidden bg-surface/95 border-b border-border shadow-2xl backdrop-blur-2xl"
          >
            <div className="px-6 py-8 flex flex-col gap-8">
               {isLoggedIn && (
                  <div className="flex items-center gap-4 mb-4">
                     <div className="w-12 h-12 rounded-full border-2 border-accent/20 overflow-hidden">
                        {user?.avatar_url ? (
                           <img src={user.avatar_url} alt="User" className="w-full h-full object-cover" />
                        ) : (
                           <div className="w-full h-full bg-surface-dark flex items-center justify-center">
                              <User className="w-6 h-6 text-muted" />
                           </div>
                        )}
                     </div>
                     <div>
                        <p className="text-white font-bold">{user?.full_name}</p>
                        <p className="text-xs text-muted">{user?.email}</p>
                     </div>
                  </div>
               )}

              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className={cn(
                    "text-2xl font-head font-medium transition-colors",
                    location.pathname === link.href ? "text-accent" : "text-muted hover:text-white"
                  )}
                >
                  {link.name}
                </Link>
              ))}
              <div className="h-px bg-border my-2" />
              
              {!isLoggedIn ? (
                 <>
                  <Link to="/login" className="text-xl font-medium text-muted hover:text-white transition-colors">
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="w-full py-4 bg-accent text-white rounded-xl text-center font-head font-semibold flex items-center justify-center gap-2"
                  >
                    Get Started <ChevronRight className="w-5 h-5" />
                  </Link>
                 </>
              ) : (
                 <>
                  <a href="http://localhost:3000" className="text-xl font-medium text-muted hover:text-white transition-colors flex items-center gap-2">
                     <LayoutDashboard className="w-5 h-5" /> My Dashboard
                  </a>
                  <button onClick={logout} className="text-xl font-medium text-danger text-left flex items-center gap-2">
                     <LogOut className="w-5 h-5" /> Sign Out
                  </button>
                 </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
