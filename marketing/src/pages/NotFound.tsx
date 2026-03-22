import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowLeft, Home, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import MagneticButton from '../components/MagneticButton';
import ScrollReveal from '../components/ScrollReveal';

const NotFound: React.FC = () => {
    return (
        <div className="min-h-[calc(100vh-72px)] flex flex-col items-center justify-center p-6 bg-bg relative overflow-hidden isolate">
            {/* Background Effects */}
            <div className="absolute inset-0 grid-bg opacity-10 -z-10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-full max-h-[600px] bg-accent/10 blur-[120px] rounded-full -z-10 animate-pulse" />

            <div className="text-center max-w-lg w-full">
                <ScrollReveal delay={0.1}>
                    <div className="relative inline-block mb-12">
                        <div className="absolute inset-0 bg-danger/20 blur-3xl animate-pulse" />
                        <div className="relative p-8 rounded-3xl glass border border-danger/30 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
                            <ShieldAlert className="w-20 h-20 text-danger" />
                        </div>
                    </div>
                </ScrollReveal>

                <ScrollReveal delay={0.2} y={10}>
                    <h1 className="text-7xl sm:text-9xl font-head font-extrabold text-white mb-6 tabular-nums tracking-tighter">
                        404
                    </h1>
                </ScrollReveal>

                <ScrollReveal delay={0.3} y={20}>
                    <h2 className="text-2xl sm:text-3xl font-head font-bold text-white mb-6 tracking-tight">
                        Endpoint not found.
                    </h2>
                    <p className="text-muted text-lg leading-relaxed mb-12">
                        The requested asset does not exist or has been relocated within our fleet. 
                        Security protocols prevent further access to this path.
                    </p>
                </ScrollReveal>

                <ScrollReveal delay={0.4}>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <MagneticButton strength={0.3}>
                            <Link to="/">
                                <Button size="lg" className="px-10" icon={Home} iconPosition="left">
                                    Return Base
                                </Button>
                            </Link>
                        </MagneticButton>
                        <MagneticButton strength={0.2}>
                            <Link to="/about">
                                <Button variant="secondary" size="lg" className="px-10">
                                    Our Products
                                </Button>
                            </Link>
                        </MagneticButton>
                    </div>
                </ScrollReveal>

                {/* Simulated search bar for 404 */}
                <ScrollReveal delay={0.6} y={30} className="mt-20">
                    <div className="relative group max-w-sm mx-auto">
                        <input 
                            type="text" 
                            placeholder="Search help documentation..." 
                            className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 transition-all"
                        />
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dim group-hover:text-accent transition-colors" />
                    </div>
                </ScrollReveal>
            </div>
            
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-dim text-[10px] font-bold uppercase tracking-[0.4em] select-none text-center">
                ShieldSentinel Asset Management Recovery System
            </div>
        </div>
    );
};

export default NotFound;
