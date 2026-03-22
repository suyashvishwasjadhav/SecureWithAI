import { useState, useEffect } from 'react';

const lines = [
  { text: '$ shieldssentinel scan --url https://target.com', color: 'text-accent' },
  { text: '  ✓ Connecting to scanner...', color: 'text-success' },
  { text: '  ✓ Running ZAP spider... 47 URLs', color: 'text-success' },
  { text: '  ✓ Active scan... 23% ██████░░░', color: 'text-success' },
  { text: '  → Found: SQL Injection at /api/login', color: 'text-danger' },
  { text: '  ✓ Generating AI fix...', color: 'text-success' },
  { text: '  ✓ Report saved: report_2026.pdf', color: 'text-success' },
];

const TerminalPreview = () => {
    const [visibleLines, setVisibleLines] = useState<number>(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setVisibleLines((prev) => {
                if (prev >= lines.length) {
                    // Pause at the end
                    return prev + 1;
                }
                return prev + 1;
            });
        }, 600);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Reset every 8 seconds (approximately)
        if (visibleLines > lines.length + 5) {
            setVisibleLines(0);
        }
    }, [visibleLines]);

    return (
        <div className="w-full bg-[#0a0a0a] rounded-xl border border-white/5 p-4 font-mono text-[10px] sm:text-xs leading-relaxed overflow-hidden">
            <div className="flex gap-1.5 mb-3 px-1">
                <div className="w-2 h-2 rounded-full bg-danger/40" />
                <div className="w-2 h-2 rounded-full bg-warning/40" />
                <div className="w-2 h-2 rounded-full bg-success/40" />
            </div>
            <div className="space-y-1">
                {lines.slice(0, visibleLines).map((line, i) => (
                    <div key={i} className={line.color}>
                        {line.text}
                    </div>
                ))}
                {visibleLines <= lines.length && (
                    <span className="inline-block w-1.5 h-3.5 bg-accent ml-1 animate-pulse align-middle" />
                )}
            </div>
        </div>
    );
};

export default TerminalPreview;
