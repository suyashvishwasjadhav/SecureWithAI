import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Info, Search, Code, Check, Copy, Loader2, 
  TerminalSquare, Sparkles, ExternalLink, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import CodeBlock from './CodeBlock';

function stubIdePrompt(d: Record<string, any>): string {
  const loc = d.file_path || d.url || 'unknown';
  const ln = d.line_number ? ` around line ${d.line_number}` : '';
  const ev = (d.evidence || '').toString().slice(0, 800);
  return [
    'You are fixing a security finding reported by ShieldSentinel.',
    `Vulnerability: ${d.vuln_type || 'Unknown'}`,
    `Location: ${loc}${ln}`,
    `Description: ${d.description || '(none)'}`,
    ev ? `Evidence:\n${ev}` : '',
    'Deliver a minimal secure patch and how to verify it.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

interface Finding {
  id: string;
  vuln_type: string;
  severity: string;
  url?: string;
  parameter?: string;
  file_path?: string;
  line_number?: number;
  owasp_category?: string;
  tool_source?: string;
  description: string;
  evidence?: string;
  cvss_score?: number;
  scan_id?: string;
  
  // AI Fix Data
  layman_explanation?: string;
  what_is_happening?: string;
  key_terms?: string[];
  money_loss_min?: number;
  money_loss_max?: number;
  breach_examples?: any[];
  attack_examples?: any[];
  defense_examples?: any[];
  services_to_use?: string[];
  ide_prompt?: string;
  effort_minutes?: number;
  confidence?: number;
  fix_verified?: boolean;
  fix_verified_at?: string;
}

export const FindingDetailPanel = ({ finding, onClose, isIDE = false }: { finding: any, onClose?: () => void, isIDE?: boolean }) => {
  const [data, setData] = useState<any>(finding);
  const [loading, setLoading] = useState(!finding.layman_explanation);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [ideSessionId, setIdeSessionId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setData(finding);
    setVerifyResult(null);
    const hasRich =
      !!(finding.layman_explanation && String(finding.layman_explanation).trim()) ||
      (finding.attack_examples && finding.attack_examples.length > 0);
    const needFetch = finding.id && !hasRich;
    setLoading(!!needFetch);
    if (needFetch) {
      void fetchDetailsFor(finding.id);
    } else {
      setLoading(false);
    }
    if (!isIDE && finding.scan_id) {
      void checkIDESession(finding.scan_id);
    }
  }, [finding.id, finding.scan_id, isIDE, finding.layman_explanation, finding.attack_examples]);

  const fetchDetailsFor = async (findingId: string) => {
    try {
      const res = await api.get(`/api/findings/${findingId}`);
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const checkIDESession = async (scanId: string) => {
    try {
        const res = await api.get(`/api/ide/scan/${scanId}`);
        if (res.data.session_id) {
            setIdeSessionId(res.data.session_id);
        }
    } catch (e) {
        console.error(e);
    }
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const verifyFix = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await api.post(`/api/findings/${data.id}/verify-fix`);
      setVerifyResult(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setVerifying(false);
    }
  };

  const getCvssColor = (score: number) => {
    if (score >= 9) return 'text-red-600';
    if (score >= 7) return 'text-red-500';
    if (score >= 4) return 'text-orange-500';
    return 'text-yellow-500';
  };

  return (
    <div className={`flex flex-col bg-[#0d0d0d] ${isIDE ? 'h-full overflow-y-auto' : 'rounded-2xl border border-[#1f1f1f] m-6 overflow-hidden shadow-2xl animate-slideDown'}`}>
      
      {/* 1. HEADER SECTION */}
      <div className="p-6 border-b border-[#1f1f1f] bg-white/[0.02] flex justify-between items-start">
        <div className="space-y-2">
           <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border 
                ${data.severity === 'critical' ? 'bg-red-500/20 text-red-500 border-red-500/30' : 
                  data.severity === 'high' ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' : 
                  'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'}`}>
                {data.severity}
              </span>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">{data.vuln_type}</h2>
              {data.cvss_score && (
                  <span className={`text-xs font-black ${getCvssColor(data.cvss_score)}`}>CVSS: {data.cvss_score}</span>
              )}
           </div>
           <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500">
              <span className="flex items-center gap-1"><Code className="w-3 h-3"/> {data.file_path ? `${data.file_path} : line ${data.line_number}` : data.url}</span>
              <span className="px-1.5 py-0.5 bg-[#1a1a1a] rounded text-gray-400 capitalize">[{data.tool_source || 'engine'}]</span>
           </div>
        </div>
        {!isIDE && onClose && (
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500 transition-colors">
                <Search className="w-5 h-5 rotate-45" />
            </button>
        )}
      </div>

      <div className="p-8 space-y-12">
        
        {/* 2. WHAT IS THIS SECTION */}
        <section className="space-y-4">
            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-600">
                💬 WHAT IS THIS?
            </h4>
            {loading ? (
                <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10 animate-pulse flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    <span className="text-xs text-indigo-400 font-bold uppercase">AI Agent analyzing vulnerability impact...</span>
                </div>
            ) : (
                <>
                    <p className="text-lg text-gray-300 leading-relaxed italic font-medium">
                        {`"${data.layman_explanation || data.description || "Plain-language analysis runs in the background after the scan. You can still use the technical description and evidence below while it completes."}"`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {data.key_terms?.map((term: string) => (
                            <a 
                                key={term}
                                href={`https://owasp.org/www-community/attacks/${term.replace(/\s+/g, '_')}`}
                                target="_blank"
                                rel="noreferrer"
								className="px-2 py-1 bg-[#1a1a1a] hover:bg-indigo-500/20 text-gray-500 hover:text-indigo-400 text-[9px] font-black uppercase rounded border border-[#2a2a2a] transition-all cursor-alias"
                            >
                                {term} ↗
                            </a>
                        ))}
                    </div>
                </>
            )}
        </section>

        {/* 3. FINANCIAL IMPACT */}
        <section className="space-y-6">
            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-600">
                💸 ESTIMATED FINANCIAL IMPACT
            </h4>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Indicative range from severity and vulnerability class (and breach benchmarks when available). Not a formal risk assessment.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 sm:p-6 bg-red-500/[0.02] border border-red-500/10 rounded-2xl text-center space-y-1">
                    <span className="text-[10px] font-black uppercase text-gray-500">Minimum Loss</span>
                    <p className="text-xl sm:text-2xl font-black text-white">${(data.money_loss_min ?? 2500).toLocaleString()}</p>
                    <span className="text-[9px] text-red-400/50 uppercase font-bold">per incident</span>
                </div>
                <div className="p-5 sm:p-6 bg-red-500/[0.05] border border-red-500/20 rounded-2xl text-center space-y-1">
                    <span className="text-[10px] font-black uppercase text-gray-500">Maximum Loss</span>
                    <p className="text-xl sm:text-2xl font-black text-red-500">${(data.money_loss_max ?? 150_000).toLocaleString()}</p>
                    <span className="text-[9px] text-red-400/50 uppercase font-bold">per incident</span>
                </div>
            </div>
            
            {data.breach_examples?.length > 0 && (
                <div className="space-y-3">
                    <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Real World References:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {data.breach_examples.map((ex: any, i: number) => (
                            <div key={i} className="p-4 bg-[#111] border border-[#1f1f1f] rounded-xl flex items-start gap-3 group hover:border-red-500/30 transition-all">
                                <span className="text-xl">📰</span>
                                <div>
                                    <p className="text-[11px] font-black text-white uppercase group-hover:text-red-400 transition-colors">{ex.company}</p>
                                    <p className="text-[10px] text-red-500/80 font-bold">{ex.loss} loss — {ex.detail}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>

        {/* 4. ATTACK PAYLOADS */}
        <section className="space-y-6">
            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-600">
                ⚡ HOW ATTACKERS USE THIS
            </h4>
            <div className="space-y-4">
                {data.attack_examples?.map((attack: any, i: number) => (
                    <div key={i} className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl overflow-hidden group">
                        <div className="p-4 border-b border-[#1f1f1f] flex justify-between items-center bg-red-500/[0.02]">
                            <h5 className="text-[11px] font-black text-red-400 uppercase tracking-tight">{attack.name}</h5>
                            <button 
                                onClick={() => handleCopy(attack.payload, `payload-${i}`)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] rounded text-[9px] font-black uppercase text-gray-400 hover:text-white transition-all"
                            >
                                {copied === `payload-${i}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                {copied === `payload-${i}` ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <div className="p-4 font-mono text-xs text-red-300 break-all bg-[#050505]">
                            {attack.payload}
                        </div>
                        <div className="p-4 bg-white/[0.01] text-[10px] text-gray-500 flex gap-4">
                            <span><strong className="text-gray-700 uppercase">Action:</strong> {attack.explanation}</span>
                            <span className="text-red-500/50">→ {attack.impact}</span>
                        </div>
                    </div>
                ))}
            </div>
        </section>

        {/* 5. EVIDENCE */}
        <section className="space-y-4">
            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-600">
                📋 EVIDENCE FROM SCAN
            </h4>
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-[#1f1f1f] flex items-center justify-between bg-white/[0.01]">
                    <span className="text-[10px] font-mono text-gray-400 flex items-center gap-2">
                        <Code className="w-3 h-3" /> {data.file_path || "Dynamic URL Path"} {data.line_number && `(Line: ${data.line_number})`}
                    </span>
                    {!isIDE && ideSessionId ? (
                        <button 
                            onClick={() => navigate(`/ide/${ideSessionId}`)}
                            className="text-[10px] font-black uppercase text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-all"
                        >
                            Navigate to this line in IDE <ArrowRight className="w-3 h-3" />
                        </button>
                    ) : !isIDE && data.file_path && (
                        <button 
                             onClick={() => navigate('/scan')}
                             className="text-[10px] font-black uppercase text-gray-600 hover:text-white flex items-center gap-1 transition-all"
                        >
                            Upload code to IDE for inline view <ExternalLink className="w-3 h-3" />
                        </button>
                    )}
                </div>
                <div className="max-h-64 overflow-y-auto overflow-x-hidden">
                    <CodeBlock
                      code={
                        data.evidence?.trim()
                          ? data.evidence
                          : '// No code snapshot stored for this line — open the file in the IDE editor to view full context.'
                      }
                      language={
                        data.language ||
                        (data.file_path?.match(/\.(html|htm)$/i) ? 'html' : data.file_path?.split('.').pop()) ||
                        'text'
                      }
                    />
                </div>
            </div>
        </section>

        {/* 6. HOW TO DEFEND */}
        <section className="space-y-6">
            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-green-600">
                🛡️ HOW TO DEFEND
            </h4>
            <div className="space-y-8">
                {data.defense_examples?.map((def: any, i: number) => (
                    <div key={i} className="space-y-4">
                        <h5 className="text-xs font-bold text-white uppercase tracking-tight">Method {i+1}: {def.method}</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <span className="text-[9px] font-black uppercase text-red-500/50 ml-2">Vulnerable:</span>
                                <div className="rounded-xl border border-red-500/10 opacity-70">
                                    <CodeBlock code={def.code_before} language={def.language || 'python'} />
                                </div>
                             </div>
                             <div className="space-y-2">
                                <div className="flex justify-between items-center ml-2">
                                    <span className="text-[9px] font-black uppercase text-green-500/50">Secure:</span>
                                    <button onClick={() => handleCopy(def.code_after, `def-${i}`)} className="text-gray-600 hover:text-white transition-colors">
                                        <Copy className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="rounded-xl border border-green-500/30 bg-green-500/[0.02]">
                                    <CodeBlock code={def.code_after} language={def.language || 'python'} />
                                </div>
                             </div>
                        </div>
                        <p className="text-[11px] text-gray-500 italic">Why: {def.explanation}</p>
                    </div>
                ))}
            </div>
            
            <div className="p-4 bg-indigo-500/[0.03] border border-indigo-500/10 rounded-2xl flex flex-wrap gap-4">
                {data.services_to_use?.map((tool: string) => (
                    <span key={tool} className="text-[10px] text-indigo-400 font-bold flex items-center gap-1.5">
                        <div className="w-1 h-1 bg-indigo-500 rounded-full" />
                        {tool}
                    </span>
                ))}
            </div>
        </section>

        {/* 7. AI PROMPT */}
        <section className="space-y-4">
            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400">
                🤖 IDE PROMPT (PASTE INTO CURSOR/COPILOT)
            </h4>
            <div className="relative group">
                <textarea 
                    readOnly
                    className="w-full min-h-[10rem] h-44 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-4 sm:p-6 text-[11px] font-mono text-gray-300 leading-relaxed focus:outline-none resize-y"
                    value={
                      data.ide_prompt?.trim()
                        ? data.ide_prompt
                        : loading
                          ? 'Generating prompt…'
                          : stubIdePrompt(data)
                    }
                />
                <div className="absolute top-4 right-4 flex gap-2">
                    <button 
                        onClick={() =>
                          handleCopy(
                            data.ide_prompt?.trim() ? data.ide_prompt : stubIdePrompt(data),
                            'ide-p'
                          )
                        }
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase rounded-lg transition-all shadow-xl shadow-indigo-600/20"
                    >
                        {copied === 'ide-p' ? 'Copied' : 'Copy Prompt'}
                    </button>
                </div>
            </div>
        </section>

        {/* 8. WAF RULE */}
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-400">
                    🔥 WAF PROTECTION
                </h4>
                <div className="flex gap-2">
                    {['ModSecurity', 'AWS WAF', 'Cloudflare'].map(waf => (
                        <span key={waf} className="px-2 py-0.5 bg-[#1a1a1a] border border-[#2a2a2a] text-[9px] font-black uppercase text-gray-500 rounded">{waf}</span>
                    ))}
                </div>
            </div>
            <div className="bg-[#0a0a0a] border border-orange-500/20 rounded-2xl p-4 font-mono text-xs text-orange-200 break-all relative group">
                {data.waf_rule?.rule_syntax || `SecRule ARGS "@detect${data.vuln_type?.replace(/\s/g,'')}" "id:1000,phase:2,deny,status:403,msg:'ShieldSentinel Blocked Attack'"`}
                <button 
                    onClick={() => handleCopy(data.waf_rule?.rule_syntax || 'SecRule...', 'waf')}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 bg-black/50 rounded-lg text-white transition-all"
                >
                    <Copy className="w-3 h-3" />
                </button>
            </div>
        </section>

        {/* 9. METADATA & ACTIONS */}
        <div className="pt-6 border-t border-[#1f1f1f] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-8">
            <div className="flex flex-wrap items-center gap-6">
                <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-gray-600">Fix Time</span>
                    <p className="text-xs font-bold text-white uppercase tracking-widest">~{data.effort_minutes ?? '—'} MIN</p>
                </div>
                <div className="h-8 w-px bg-[#1f1f1f] hidden sm:block" />
                <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-gray-600">Confidence</span>
                    <p className="text-xs font-bold text-white">{data.confidence != null ? `${data.confidence}%` : '—'}</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                {!data.fix_verified && (
                    <button 
                        onClick={() => setData({...data, fix_verified: true, fix_verified_at: new Date().toISOString()})}
                        className="flex-1 min-w-[140px] px-5 py-3 bg-[#111] hover:bg-white/5 border border-[#1f1f1f] rounded-xl text-xs font-black uppercase transition-all"
                    >
                        Mark as Fixed
                    </button>
                )}
                <button 
                    onClick={verifyFix}
                    disabled={verifying}
                    className="flex-1 min-w-[160px] px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-3"
                >
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin"/> : <TerminalSquare className="w-4 h-4"/>}
                    {verifying ? 'Scanning...' : 'Verify Fix'}
                </button>
            </div>
        </div>

        {verifyResult && (
            <div className={`p-4 rounded-xl border-l-4 ${verifyResult.still_vulnerable ? 'bg-red-500/10 border-red-500' : 'bg-green-500/10 border-green-500'}`}>
                <p className={`text-xs font-bold ${verifyResult.still_vulnerable ? 'text-red-400' : 'text-green-400'} uppercase`}>
                    {verifyResult.still_vulnerable ? "Vulnerability session active" : "Check complete: Issue resolved!"}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">{verifyResult.message}</p>
            </div>
        )}
      </div>
    </div>
  );
};
