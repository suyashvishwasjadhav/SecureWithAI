import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';

const PageLoader: React.FC = () => {
    const [isVisible, setIsVisible] = useState(true);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(() => setIsVisible(false), 500);
                    return 100;
                }
                return prev + Math.random() * 15;
            });
        }, 150);
        return () => clearInterval(interval);
    }, []);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                    className="fixed inset-0 z-[100] bg-bg flex flex-col items-center justify-center p-6"
                >
                    <div className="relative mb-12">
                        {/* Drawing Shield Animation */}
                        <motion.div
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                            className="relative"
                        >
                            <Shield className="w-20 h-20 text-accent filter drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                        </motion.div>
                        
                        {/* Orbiting ring */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="absolute -inset-4 border border-dashed border-accent/20 rounded-full"
                        />
                    </div>

                    <div className="w-full max-w-[240px] space-y-4">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-dim uppercase tracking-[0.3em]">Initializing Fleet</span>
                            <span className="text-[10px] font-mono text-accent">{Math.min(100, Math.floor(progress))}%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-accent"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ type: "spring", stiffness: 50, damping: 20 }}
                            />
                        </div>
                    </div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-8 text-xs font-medium text-muted font-head tracking-tighter"
                    >
                        Shield<span className="text-accent">Sentinel</span> v1.0.4r
                    </motion.p>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PageLoader;
