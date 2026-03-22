import { Check, X } from 'lucide-react';

const ComparisonTable = () => {
    const features = [
      { name: 'Finds vulnerabilities', traditional: true, shield: true, highlighted: false },
      { name: 'AI-powered code fixes', traditional: false, shield: true, highlighted: true },
      { name: 'WAF rule generation', traditional: false, shield: true, highlighted: true },
      { name: 'Compliance mapping', traditional: false, shield: true, highlighted: true },
      { name: 'AI chatbot', traditional: false, shield: true, highlighted: true },
      { name: 'IDE prompt generator', traditional: false, shield: true, highlighted: true },
      { name: 'SAST + DAST hybrid', traditional: false, shield: true, highlighted: true },
      { name: 'PDF report download', traditional: 'partial', shield: true, highlighted: false },
    ];

    return (
        <div className="w-full max-w-4xl mx-auto overflow-hidden rounded-3xl border border-white/5 bg-[#0a0a0a] shadow-2xl overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                    <tr className="bg-white/[0.03] border-b border-white/5">
                        <th className="px-8 py-6 text-sm font-bold text-dim uppercase tracking-widest">Feature</th>
                        <th className="px-8 py-6 text-sm font-bold text-dim uppercase tracking-widest text-center">Traditional</th>
                        <th className="px-8 py-6 text-sm font-bold text-accent uppercase tracking-widest text-center bg-accent/10">ShieldSentinel</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {features.map((feature, i) => (
                        <tr 
                            key={i} 
                            className={`transition-colors hover:bg-white/[0.02] ${feature.highlighted ? 'bg-accent/[0.03]' : ''}`}
                        >
                            <td className="px-8 py-6 text-sm sm:text-base font-medium text-white flex items-center gap-3">
                                {feature.name}
                                {feature.highlighted && <span className="px-1.5 py-0.5 rounded bg-accent/20 text-accent text-[8px] font-bold uppercase tracking-widest">Unique</span>}
                            </td>
                            <td className="px-8 py-6 text-center">
                                {feature.traditional === true ? (
                                    <Check className="w-5 h-5 text-success inline-block opacity-40" />
                                ) : feature.traditional === 'partial' ? (
                                    <span className="text-muted font-bold text-xl">~</span>
                                ) : (
                                    <X className="w-5 h-5 text-danger inline-block opacity-40" />
                                )}
                            </td>
                            <td className="px-8 py-6 text-center bg-accent/5">
                                <Check className="w-6 h-6 text-accent inline-block drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" strokeWidth={3} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ComparisonTable;
