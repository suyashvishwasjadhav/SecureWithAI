import React, { useEffect, useState } from 'react';
import { getCompliance } from '../lib/api';
import { 
  Loader2, Info, Building2, 
  ChevronDown, ChevronUp, AlertTriangle, ShieldCheck
} from 'lucide-react';

interface ComplianceTabProps {
  scanId: string;
}

const ComplianceTab: React.FC<ComplianceTabProps> = ({ scanId }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  useEffect(() => {
    getCompliance(scanId).then(res => {
      setData(res);
      setLoading(false);
    });
  }, [scanId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Running Compliance Audit...</p>
    </div>
  );

  const failingCount = data.owasp_breakdown.filter((c: any) => c.status === 'FAIL').length;
  const criticalGap = data.owasp_breakdown.find((c: any) => c.code === 'A03' && c.status === 'FAIL') 
    ? "Injection attacks which could allow full database compromise" 
    : data.owasp_breakdown.find((c: any) => c.status === 'FAIL')?.name + " issues";

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. Overall Summary */}
      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-[2rem] p-8 flex items-start gap-6">
        <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400">
          <Info className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-indigo-500/60 uppercase tracking-[0.3em]">Compliance Summary</h3>
          <p className="text-xl font-bold text-white leading-relaxed">
            Your application fails {failingCount} out of 10 OWASP Top 10 categories. 
            The most critical gap is <span className="text-red-400">{criticalGap}</span>.
          </p>
        </div>
      </div>

      {/* 2. Framework Scores (Horizontal Bars) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { label: 'OWASP Top 10', score: data.scores.owasp, desc: 'Open Web Application Security Project standard for web apps.', color: 'from-indigo-600 to-indigo-400' },
          { label: 'PCI-DSS', score: data.scores.pci_dss, desc: 'Payment Card Industry Data Security Standard for handling credit cards.', color: 'from-purple-600 to-purple-400' },
          { label: 'HIPAA', score: data.scores.hipaa, desc: 'Health Insurance Portability and Accountability Act for protecting health data.', color: 'from-emerald-600 to-cyan-400' },
          { label: 'GDPR', score: data.scores.gdpr, desc: 'General Data Protection Regulation for privacy and data protection in EU.', color: 'from-blue-600 to-blue-400' },
        ].map((f, i) => (
          <div key={i} className="bg-[#111111] border border-[#1f1f1f] p-6 rounded-2xl space-y-4 group">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">{f.label}</span>
                <div className="group/tip relative">
                    <Info className="w-3 h-3 text-gray-600 cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-black border border-[#1f1f1f] rounded-lg text-[9px] text-gray-400 opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50">
                        {f.desc}
                    </div>
                </div>
              </div>
              <span className="text-lg font-black">{f.score}%</span>
            </div>
            <div className="h-2 bg-black rounded-full overflow-hidden border border-[#1f1f1f]">
               <div 
                 className={`h-full bg-gradient-to-r ${f.color} transition-all duration-1000`}
                 style={{ width: `${f.score}%` }}
               />
            </div>
          </div>
        ))}
      </div>

      {/* 3. OWASP Breakdown (Accordion) */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-600 px-2 flex items-center gap-3">
            <ShieldCheck className="w-4 h-4" /> OWASP Top 10 Audit Breakdown
        </h3>
        <div className="space-y-3">
          {data.owasp_breakdown.map((cat: any) => (
            <div 
              key={cat.code} 
              className={`border rounded-2xl overflow-hidden transition-all duration-300 ${cat.status === 'PASS' ? 'border-[#1f1f1f] bg-[#0d0d0d]' : 'border-red-500/20 bg-red-500/[0.02]'}`}
            >
              <button 
                onClick={() => setExpandedCode(expandedCode === cat.code ? null : cat.code)}
                className="w-full px-6 py-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter ${cat.status === 'PASS' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                    {cat.status}
                  </div>
                  <span className="text-sm font-bold text-gray-200">
                    <span className="text-gray-500 font-mono mr-2">{cat.code}</span>
                    {cat.name}
                  </span>
                </div>
                {expandedCode === cat.code ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
              </button>

              {expandedCode === cat.code && (
                <div className="px-6 pb-6 pt-2 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-6">
                    <section className="space-y-2">
                       <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                         <Info className="w-3 h-3" /> What this means
                       </h5>
                       <p className="text-sm text-gray-400 leading-relaxed font-medium">{cat.what_it_means}</p>
                    </section>
                    <section className="space-y-2">
                       <h5 className="text-[10px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-2">
                         <AlertTriangle className="w-3 h-3" /> Real world example
                       </h5>
                       <p className="text-sm text-gray-500 italic leading-relaxed">"{cat.real_world_example}"</p>
                    </section>
                  </div>
                  <div className="space-y-6">
                    <section className="space-y-2">
                       <h5 className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2">
                         <AlertTriangle className="w-3 h-3" /> Business impact
                       </h5>
                       <p className="text-sm text-gray-400 leading-relaxed font-medium">{cat.business_impact}</p>
                    </section>
                    <section className="space-y-2">
                       <h5 className="text-[10px] font-black text-green-400 uppercase tracking-widest flex items-center gap-2">
                         <ShieldCheck className="w-3 h-3" /> Quick fix
                       </h5>
                       <p className="text-sm text-gray-400 leading-relaxed font-medium">{cat.quick_fix}</p>
                    </section>
                    {cat.status === 'FAIL' && cat.failing_findings.length > 0 && (
                      <section className="pt-4 border-t border-[#1f1f1f] space-y-2">
                        <h5 className="text-[10px] font-black text-red-500 uppercase tracking-widest">❌ Failed because:</h5>
                        <div className="flex flex-wrap gap-2">
                          {cat.failing_findings.map((f: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-lg border border-red-500/20">{f}</span>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. PCI-DSS Gaps */}
      {data.pci_dss_gaps.length > 0 && (
        <div className="space-y-4 pt-10 border-t border-[#1f1f1f]">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-600 px-2 flex items-center gap-3">
              <Building2 className="w-4 h-4" /> PCI-DSS Compliance Gaps Identified
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {data.pci_dss_gaps.map((gap: any, i: number) => (
               <div key={i} className="p-6 bg-[#111111] border border-red-500/20 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-red-500 uppercase tracking-widest">{gap.requirement}</span>
                    <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[9px] font-black uppercase rounded border border-red-500/20">Critical Gap</span>
                  </div>
                  <p className="text-sm font-bold text-gray-300">{gap.description}</p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p><span className="text-gray-600 mr-2 uppercase tracking-tighter">Trigger:</span> {gap.failing_because}</p>
                    <p><span className="text-gray-600 mr-2 uppercase tracking-tighter">Required Fix:</span> {gap.how_to_fix}</p>
                  </div>
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceTab;
