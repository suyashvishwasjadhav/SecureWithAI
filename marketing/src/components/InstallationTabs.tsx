import { useState } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const tabs = [
  { id: 'npm', label: 'npm', command: 'npx shieldssentinel scan --url https://yoursite.com' },
  { id: 'pip', label: 'pip', command: 'pip install shieldssentinel\nshieldssentinel scan --url https://yoursite.com' },
  { id: 'docker', label: 'Docker', command: 'docker run shieldssentinel/cli scan --url https://yoursite.com' },
];

const InstallationTabs = () => {
    const [activeTab, setActiveTab] = useState('npm');
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const text = tabs.find(t => t.id === activeTab)?.command || '';
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
            <div className="flex justify-center border-b border-white/5 gap-8">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`pb-4 text-xs font-bold uppercase tracking-widest transition-all relative ${
                            activeTab === tab.id ? 'text-white' : 'text-dim hover:text-muted'
                        }`}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div 
                                layoutId="tab-underline"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                            />
                        )}
                    </button>
                ))}
            </div>

            <div className="relative group overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a0a] shadow-2xl">
                {/* Header */}
                <div className="h-10 border-b border-white/5 flex items-center px-4 justify-between bg-white/[0.02]">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-danger/20 border border-danger/40" />
                        <div className="w-2.5 h-2.5 rounded-full bg-warning/20 border border-warning/40" />
                        <div className="w-2.5 h-2.5 rounded-full bg-success/20 border border-success/40" />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-dim tracking-widest uppercase">
                        <Terminal className="w-3 h-3" />
                        Terminal
                    </div>
                    <button 
                        onClick={handleCopy}
                        className="p-1.5 rounded-md hover:bg-white/5 transition-colors text-dim hover:text-white"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 font-mono text-sm leading-relaxed overflow-x-auto min-h-[120px] flex items-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="w-full"
                        >
                            {tabs.find(t => t.id === activeTab)?.command.split('\n').map((line, i) => (
                                <div key={i} className="flex gap-4">
                                    <span className="text-dim/30 select-none w-4">{i + 1}</span>
                                    <span className={line.startsWith('#') ? 'text-dim italic' : 'text-accent'}>
                                        {line}
                                    </span>
                                </div>
                            ))}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default InstallationTabs;
