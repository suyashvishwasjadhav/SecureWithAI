import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle2, User, Mail, MessageSquare, Loader2 } from 'lucide-react';
import Button from './ui/Button';

const ContactForm = () => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setStatus('success');
        setFormData({ name: '', email: '', message: '' });
        
        // Reset status after a few seconds
        setTimeout(() => setStatus('idle'), 5000);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
                {status === 'success' ? (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="p-8 rounded-2xl glass border-success/30 flex flex-col items-center text-center gap-4"
                    >
                        <div className="p-3 rounded-full bg-success/10 border border-success/20">
                            <CheckCircle2 className="w-8 h-8 text-success" />
                        </div>
                        <h4 className="text-xl font-bold text-white tracking-tight">Message Encrypted & Sent</h4>
                        <p className="text-muted text-sm leading-relaxed max-w-[240px]">
                            Our security team has received your inquiry. Expect a response within 4-6 business hours.
                        </p>
                        <Button 
                            type="button" 
                            variant="secondary" 
                            size="sm" 
                            className="mt-4" 
                            onClick={() => setStatus('idle')}
                        >
                            Send another
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-dim uppercase tracking-[0.2em] ml-1">Name</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="John Carter"
                                        className="w-full px-5 py-4 bg-card border border-border rounded-xl text-white placeholder:text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all text-sm"
                                    />
                                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-dim uppercase tracking-[0.2em] ml-1">Email</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="carter@tech.io"
                                        className="w-full px-5 py-4 bg-card border border-border rounded-xl text-white placeholder:text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all text-sm"
                                    />
                                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-dim uppercase tracking-[0.2em] ml-1">Message Body</label>
                            <div className="relative">
                                <textarea
                                    required
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    rows={4}
                                    placeholder="Briefly describe your security requirements or inquiry..."
                                    className="w-full px-5 py-4 bg-card border border-border rounded-xl text-white placeholder:text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all text-sm resize-none"
                                />
                                <MessageSquare className="absolute right-4 top-4 w-4 h-4 text-dim" />
                            </div>
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full py-4 text-sm font-bold uppercase tracking-widest gap-2" 
                            loading={status === 'loading'}
                            icon={Send}
                        >
                            Fortify Inquiry
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </form>
    );
};

export default ContactForm;
