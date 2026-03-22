import { motion } from 'framer-motion';
import { Shield, ChevronRight, Activity, AlertCircle, CheckCircle2, MoreHorizontal } from 'lucide-react';

const ScannerMockup = () => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full aspect-[4/3] sm:aspect-video rounded-2xl overflow-hidden glass border-border-hover shadow-[0_40px_100px_rgba(0,0,0,0.5)] z-10"
        >
            {/* Browser Top Bar */}
            <div className="h-10 border-b border-border bg-surface/80 flex items-center px-4 justify-between select-none">
                <div className="flex gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-danger/20 border border-danger/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-warning/20 border border-warning/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-success/20 border border-success/40" />
                </div>
                <div className="bg-bg/60 border border-border px-8 py-1 rounded-md text-[10px] font-mono text-dim tracking-wider uppercase">
                    localhost:3000/scan/shield-01
                </div>
                <div className="flex items-center gap-4 text-dim">
                    <div className="w-4 h-4 rounded bg-border/20" />
                    <MoreHorizontal className="w-3.5 h-3.5" />
                </div>
            </div>

            {/* Content Mockup */}
            <div className="p-8 bg-bg h-full font-body">
                {/* Dashboard Head */}
                <div className="flex justify-between items-center mb-8 pb-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
                            <Activity className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-white font-head font-bold text-sm tracking-tight uppercase">Scanner Engine</h4>
                                <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[8px] font-bold uppercase tracking-widest border border-success/20">Active</span>
                            </div>
                            <p className="text-muted text-[10px]">Scanning: staging.techcore.io</p>
                        </div>
                    </div>
                </div>

                {/* Main section */}
                <div className="grid grid-cols-12 gap-6">
                    {/* Gauge placeholder */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col items-center justify-center p-6 rounded-xl bg-surface border border-border">
                        <div className="relative w-24 h-24 mb-4">
                            <svg className="w-full h-full -rotate-90">
                                <circle cx="48" cy="48" r="40" fill="transparent" stroke="var(--border)" strokeWidth="6" />
                                <motion.circle 
                                    cx="48" cy="48" r="40" fill="transparent" stroke="var(--accent)" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset="75"
                                    initial={{ strokeDashoffset: 251.2 }}
                                    whileInView={{ strokeDashoffset: 75 }}
                                    transition={{ duration: 1.5, delay: 0.5 }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-head font-extrabold text-white">72</span>
                                <span className="text-[8px] text-muted uppercase tracking-widest -mt-1">Secure</span>
                            </div>
                        </div>
                        <h5 className="text-[10px] font-bold text-muted uppercase tracking-widest">Risk Score</h5>
                    </div>

                    {/* Stats Grid */}
                    <div className="col-span-12 lg:col-span-8 grid grid-cols-2 gap-3">
                        {[
                            { label: 'Critical', value: 3, color: 'text-danger', icon: AlertCircle },
                            { label: 'High', value: 7, color: 'text-warning', icon: AlertCircle },
                            { label: 'Medium', value: 5, color: 'text-accent', icon: AlertCircle },
                            { label: 'Low', value: 2, color: 'text-success', icon: CheckCircle2 },
                        ].map((stat) => (
                            <div key={stat.label} className="p-4 rounded-xl glass border-border flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-bold text-dim uppercase tracking-widest mb-1">{stat.label}</span>
                                    <span className={`text-xl font-bold font-head ${stat.color}`}>{stat.value}</span>
                                </div>
                                <stat.icon className={`w-5 h-5 ${stat.color} opacity-40`} />
                            </div>
                        ))}
                    </div>

                    {/* Mini Table */}
                    <div className="col-span-12 overflow-hidden rounded-xl border border-border bg-surface/50">
                        <table className="w-full text-left">
                            <thead className="bg-surface border-b border-border">
                                <tr className="text-[9px] font-bold text-dim uppercase tracking-widest">
                                    <th className="px-4 py-3">Vulnerability</th>
                                    <th className="px-4 py-3">Impact</th>
                                    <th className="px-4 py-3">Remediation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {[
                                    { name: 'XSS Attack', severity: 'Critical', status: 'Fix Generated' },
                                    { name: 'Exposed JWT', severity: 'High', status: 'Fix Generated' },
                                    { name: 'SQL Injection', severity: 'Critical', status: 'In Review' },
                                ].map((vuln, i) => (
                                    <tr key={i} className="text-[10px]">
                                        <td className="px-4 py-3 text-white font-medium">{vuln.name}</td>
                                        <td className="px-4 py-3">
                                            <span className={vuln.severity === 'Critical' ? 'text-danger' : 'text-warning'}>{vuln.severity}</span>
                                        </td>
                                        <td className="px-4 py-3 text-muted">{vuln.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Decorative Bottom Bar */}
                <div className="mt-8 flex justify-center">
                    <div className="h-0.5 w-1/3 bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
                </div>
            </div>

            {/* Hover Glow Pulse */}
            <motion.div 
               animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }} 
               transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
               className="absolute -bottom-20 -left-20 w-80 h-80 bg-accent/20 rounded-full blur-[100px] pointer-events-none -z-10" 
            />
        </motion.div>
    );
};

export default ScannerMockup;
