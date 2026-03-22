import React, { useMemo } from 'react';
import { LayoutGrid, AlertCircle, Clock, ShieldAlert } from 'lucide-react';

interface VulnHeatmapProps {
  findings: any[];
  onFilterChange: (category: string | null) => void;
  selectedCategory: string | null;
}

const OWASP_CATEGORIES = [
  "A01", "A02", "A03", "A04", "A05", 
  "A06", "A07", "A08", "A09", "A10"
];

const VulnHeatmap: React.FC<VulnHeatmapProps> = ({ findings, onFilterChange, selectedCategory }) => {
  
  // 1. Group findings by OWASP category
  const counts = useMemo(() => {
    const res: Record<string, number> = {};
    OWASP_CATEGORIES.forEach(c => res[c] = 0);
    
    findings.filter(f => f.attack_worked).forEach(f => {
      if (f.owasp_category) {
        const code = f.owasp_category.split(':')[0];
        if (res[code] !== undefined) res[code]++;
      }
    });
    return res;
  }, [findings]);

  // 2. Discover timeline (simplified for UI)
  const timeline = useMemo(() => {
     // findings are usually sorted by created_at. We'll map them to a 0-100% scale
     const sorted = [...findings].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
     const total = sorted.length;
     if (total < 2) return [];
     
     return sorted.slice(0, 8).map((f, i) => ({
        pos: Math.round((i / (total - 1)) * 100),
        vuln: f.vuln_type?.split(' ')[0] || 'Vuln',
        severity: f.severity
     }));
  }, [findings]);

  const maxCount = Math.max(...Object.values(counts), 1);

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-[2.5rem] p-10 space-y-12 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

      <div className="flex items-center justify-between relative z-10">
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase tracking-[0.3em] text-gray-500 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-indigo-500" /> Vulnerability Heatmap
          </h3>
          <p className="text-gray-400 text-sm italic font-medium tracking-tight">Vulnerability density across OWASP Top 10 categories</p>
        </div>
        <button 
           onClick={() => onFilterChange(null)}
           className="text-[10px] font-black uppercase text-gray-600 hover:text-white transition-all underline underline-offset-4"
        >
            Reset All Filters
        </button>
      </div>

      <div className="space-y-4 relative z-10">
        {OWASP_CATEGORIES.map(code => {
           const count = counts[code];
           const intensity = Math.min(10, Math.round((count / maxCount) * 10));
           const isSelected = selectedCategory === code;
           
           return (
             <div 
               key={code} 
               onClick={() => onFilterChange(isSelected ? null : code)}
               className={`flex items-center gap-6 p-4 rounded-2xl cursor-pointer border transition-all duration-300 ${isSelected ? 'bg-indigo-500/10 border-indigo-500' : 'bg-black/20 border-[#1f1f1f] hover:bg-white/5'}`}
             >
                <span className={`text-[11px] font-black w-8 ${isSelected ? 'text-indigo-400' : 'text-gray-600 font-mono'}`}>{code}</span>
                <div className="flex-1 h-3 bg-black rounded-full overflow-hidden border border-[#1f1f1f] flex relative">
                   {/* Background intensity bars */}
                   <div 
                      className={`h-full bg-indigo-500 transition-all duration-1000 ${intensity > 8 ? 'shadow-[0_0_15px_rgba(99,102,241,0.5)]' : ''}`}
                      style={{ width: `${(count / maxCount) * 100}%`, opacity: 0.1 + (intensity * 0.09) }}
                   />
                </div>
                <div className="w-20 text-right">
                   <span className={`text-xs font-black ${count > 0 ? 'text-white' : 'text-gray-700'}`}>{count} findings</span>
                </div>
                {count > 8 && <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />}
             </div>
           );
        })}
      </div>

      {/* Discovery Timeline */}
      <div className="space-y-6 pt-10 border-t border-[#1f1f1f] relative z-10">
         <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 flex items-center gap-2">
            <Clock className="w-3 h-3 text-indigo-500" /> Discovery Timeline
         </h4>
         <div className="relative pt-12 pb-4">
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gray-800"></div>
            <div className="absolute top-1/2 left-0 h-2 w-2 rounded-full bg-gray-700 -translate-y-1/2"></div>
            <div className="absolute top-1/2 right-0 h-2 w-2 rounded-full bg-gray-700 -translate-y-1/2"></div>
            
            {timeline.map((point, i) => (
              <div 
                key={i}
                className="absolute top-1/2 transition-all hover:scale-110 cursor-help group"
                style={{ left: `${point.pos}%` }}
              >
                  <div className="relative">
                    <div className={`w-3 h-3 rounded-full -translate-y-1/2 border-2 border-black ${point.severity === 'critical' ? 'bg-red-500' : point.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'}`}></div>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <span className="px-3 py-1 bg-black border border-[#1f1f1f] rounded-lg text-[9px] font-black text-white whitespace-nowrap uppercase tracking-tighter">
                            {point.vuln}
                        </span>
                        <div className="w-[1px] h-3 bg-gray-600 mt-1"></div>
                    </div>
                  </div>
              </div>
            ))}

            <div className="flex justify-between mt-6 text-[9px] font-black uppercase tracking-[0.3em] text-gray-700">
                <span>Start</span>
                <span className="text-gray-500 flex items-center gap-2 uppercase tracking-tight italic">
                   <ShieldAlert className="w-3 h-3" /> Tools detecting anomalies in real-time
                </span>
                <span>End</span>
            </div>
         </div>
      </div>
    </div>
  );
};

export default VulnHeatmap;
