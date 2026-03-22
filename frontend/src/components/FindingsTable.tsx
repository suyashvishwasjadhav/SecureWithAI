import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronDown, ChevronUp, Search, Filter, 
  Code, Info, ShieldAlert, Sparkles, TerminalSquare,
  Copy, Loader2, Check
} from 'lucide-react';
import CodeBlock from './CodeBlock';
import { FindingDetailPanel } from './FindingDetailPanel';
import api from '../lib/api';

interface Finding {
  id: string;
  vuln_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  url?: string;
  parameter?: string;
  file_path?: string;
  line_number?: number;
  owasp_category?: string;
  tool_source?: string;
  description: string;
  evidence?: string;
  ai_fix?: any;
  waf_rule?: any;
  correlated_finding_id?: string;
  correlation_message?: string;
  
  // Phase 14 Fields
  attack_examples?: any[];
  defense_examples?: any[];
  layman_explanation?: string;
  cvss_score?: number;
  cve_id?: string;
  fix_verified?: boolean;
  fix_verified_at?: string;
}

interface FindingsTableProps {
  findings: Finding[];
}

const FindingsTable: React.FC<FindingsTableProps> = ({ findings }) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const filteredFindings = useMemo(() => {
    return findings.filter(f => {
      const matchesSearch = 
        f.vuln_type.toLowerCase().includes(search.toLowerCase()) ||
        (f.url || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.file_path || '').toLowerCase().includes(search.toLowerCase());
      
      const matchesSeverity = filterSeverity === 'all' || f.severity === filterSeverity;
      
      return matchesSearch && matchesSeverity;
    });
  }, [findings, search, filterSeverity]);

  const [isGrouped, setIsGrouped] = useState(true);

  const groupedFindings = useMemo(() => {
    if (!isGrouped) return filteredFindings.map(f => ({ ...f, occurrences: [f] }));
    
    const groups: Record<string, any> = {};
    filteredFindings.forEach(f => {
      if (!groups[f.vuln_type]) {
        groups[f.vuln_type] = {
          ...f,
          occurrences: [f]
        };
      } else {
        groups[f.vuln_type].occurrences.push(f);
      }
    });
    return Object.values(groups);
  }, [filteredFindings, isGrouped]);

  const severityStyles: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    info: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  const toggleRow = (id: string) => {
    setExpandedRow(prev => (prev === id ? null : id));
  };

  return (
    <div className="w-full space-y-4">
      {/* Search & Filter Header */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-6 bg-[#111111] border border-[#1f1f1f] rounded-2xl shadow-xl">
        <div className="flex flex-col md:flex-row gap-4 flex-1">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by vulnerability, URL or file..."
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-600 transition-all font-mono"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <button 
            onClick={() => setIsGrouped(!isGrouped)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
              isGrouped ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-[#1a1a1a] border-[#1f1f1f] text-gray-500'
            }`}
          >
            {isGrouped ? 'Grouping: Active' : 'Grouping: Inactive'}
          </button>
        </div>
        
        <div className="flex gap-2 p-1 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-x-auto max-w-full">
           {['all', 'critical', 'high', 'medium', 'low'].map(s => (
             <button
               key={s}
               onClick={() => setFilterSeverity(s)}
               className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                 filterSeverity === s 
                   ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                   : 'text-gray-500 hover:text-gray-300'
               }`}
             >
               {s}
             </button>
           ))}
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-hidden border border-[#1f1f1f] rounded-2xl bg-[#111111] shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#151515] border-b border-[#1f1f1f] text-gray-500 text-[10px] uppercase font-black tracking-widest">
              <th className="px-6 py-4 w-12 text-center">#</th>
              <th className="px-6 py-4">Vulnerability</th>
              <th className="px-6 py-4">Severity</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Tool</th>
              <th className="px-6 py-4 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {groupedFindings.map((f, idx) => (
              <React.Fragment key={f.id}>
                <tr 
                  onClick={() => toggleRow(f.id)}
                  className={`border-b border-[#1f1f1f] hover:bg-[#1a1a1a] transition-all cursor-pointer group ${expandedRow === f.id ? 'bg-[#1a1a1a]' : ''}`}
                >
                  <td className="px-6 py-5 text-center font-mono text-xs text-gray-600">{idx + 1}</td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{f.vuln_type}</span>
                        {isGrouped && f.occurrences.length > 1 && (
                          <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[9px] font-black rounded border border-indigo-500/20">
                            {f.occurrences.length} SITES
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 font-semibold">{f.owasp_category || 'A00:2021 Security Misconfiguration'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase border ${severityStyles[f.severity]}`}>
                      {f.severity}
                    </span>
                  </td>
                  <td className="px-6 py-5 max-w-xs truncate font-mono text-xs text-indigo-400/80">
                    {f.occurrences.length > 1 ? `Multiple (${f.occurrences.length} locations)` : (f.file_path ? `${f.file_path}${f.line_number ? `:${f.line_number}` : ''}` : f.url)}
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-2 py-1 bg-[#1f1f1f] rounded text-[10px] font-bold text-gray-400 uppercase">
                      {f.tool_source}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    {expandedRow === f.id ? <ChevronUp className="w-5 h-5 text-indigo-500" /> : <ChevronDown className="w-5 h-5 text-gray-700" />}
                  </td>
                </tr>

                {/* Expanded Detailed Content */}
                {expandedRow === f.id && (
                  <tr>
                    <td colSpan={6} className="bg-[#0a0a0a] p-0 border-b border-[#1f1f1f]">
                      <div className="animate-slideDown overflow-hidden">
                        
                        {isGrouped && f.occurrences.length > 1 && (
                          <div className="m-6 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Grouped Locations ({f.occurrences.length})</h4>
                            <div className="max-h-32 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                              {f.occurrences.map((occ: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-[11px] font-mono p-2 bg-black/20 rounded border border-[#1f1f1f]">
                                  <span className="text-gray-400">{occ.url || occ.file_path}</span>
                                  <span className="text-indigo-500/50"># {i+1}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {f.correlated_finding_id && (
                           <div className="m-6 p-4 border border-green-500/30 bg-green-500/10 rounded-xl">
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-green-400 mb-2">
                                 <span>🔗</span> SAST + DAST CORRELATION
                              </div>
                              <p className="text-sm font-bold text-gray-300">This vulnerability was confirmed BOTH at runtime AND traced to source code:</p>
                              <div className="mt-3 flex items-center justify-between p-3 bg-black/40 rounded-lg border border-green-500/20 text-xs font-mono text-green-400">
                                 <span>📄 {f.correlation_message || 'Correlated to related source finding'}</span>
                                 <span className="text-gray-500 opacity-50 cursor-not-allowed">[View File ↗]</span>
                              </div>
                           </div>
                        )}
                        {/* Single Redesigned Panel */}
                        <FindingDetailPanel 
                          finding={f} 
                          onClose={() => setExpandedRow(null)} 
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {filteredFindings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-gray-600 flex flex-col items-center gap-4">
                  <span className="p-4 bg-gray-500/5 rounded-full border border-gray-500/10">
                    <Filter className="w-8 h-8 opacity-20" />
                  </span>
                  No findings match your current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FindingsTable;
