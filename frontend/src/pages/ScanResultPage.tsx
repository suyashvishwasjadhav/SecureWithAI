import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ShieldCheck, Clock, AlertTriangle, ShieldAlert,
  CheckCircle2, Globe, FileCode, Filter, Loader2, Terminal, XCircle
} from 'lucide-react';
import api, { getScan, getFindings, downloadReport, downloadWafRules } from '../lib/api';
import Navbar from '../components/Navbar';
import RiskGauge from '../components/RiskGauge';
import FindingsTable from '../components/FindingsTable';
import ScanProgress from '../components/ScanProgress';
import { ChatPanel } from '../components/ChatPanel';
import ComplianceTab from '../components/ComplianceTab';
import AttackSurfaceTab from '../components/AttackSurfaceTab';
import SecurityBenchmark from '../components/SecurityBenchmark';
import VulnHeatmap from '../components/VulnHeatmap';

const ScanResultPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState<any>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [mainTab, setMainTab] = useState<'findings' | 'compliance' | 'attack-surface' | 'analytics'>('findings');
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const fetchScanData = async () => {
    try {
      const scanData = await getScan(id!);
      setScan(scanData);
      
      if (scanData.status === 'complete' || scanData.status === 'demo_started') {
        const findingsData = await getFindings(id!);
        setFindings(Array.isArray(findingsData) ? findingsData : findingsData.findings || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load scan results');
    }
  };

  useEffect(() => {
    void fetchScanData();
    const interval = scan?.status === 'running' || scan?.status === 'queued'
      ? setInterval(fetchScanData, 5000)
      : null;
    return () => { if (interval) clearInterval(interval); };
  }, [id, scan?.status]);

  const calculatedRiskScore = useMemo(() => {
    if (!findings || findings.length === 0) return 0;
    let score = 0;
    findings.filter(f => f.attack_worked !== false).forEach(f => {
      if (f.severity === 'critical') score += 25;
      else if (f.severity === 'high') score += 10;
      else if (f.severity === 'medium') score += 5;
      else if (f.severity === 'low') score += 2;
    });
    return Math.min(100, score);
  }, [findings]);

  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleExport = async (format: string) => {
    setIsExporting(format);
    try {
      if (format === 'waf') {
        await downloadWafRules(id!);
      } else {
        await downloadReport(id!, format);
      }
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(null);
    }
  };

  const groupFindings = (list: any[]) => {
    const groups: Record<string, any> = {};
    list.forEach(f => {
      const key = `${f.severity}-${f.vuln_type}`;
      if (!groups[key]) {
        groups[key] = { ...f, count: 1, examples: [f.url || f.file_path] };
      } else {
        groups[key].count += 1;
        if (groups[key].examples.length < 3) groups[key].examples.push(f.url || f.file_path);
      }
    });
    return Object.values(groups);
  };

  if (error || scan?.status === 'failed') {
    const failReason = realtimeError || scan?.error_message || error || 'Internal engine error.';
    return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-8">
       <div className="max-w-lg w-full bg-[#111111] border border-red-500/20 rounded-3xl p-10 text-center space-y-6">
          <div className="inline-flex p-4 bg-red-500/10 rounded-full">
             <ShieldAlert className="w-12 h-12 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight text-white">Security Scan Failed</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
               Scan for <span className="text-white font-mono">{scan?.target || id}</span> did not complete.
            </p>
          </div>

          <div className="text-left bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <div className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">Failure Reason</div>
            <p className="text-red-300 font-mono text-sm leading-relaxed break-all">{failReason}</p>
          </div>

          <div className="flex flex-col gap-3">
             <Link to="/scan" className="w-full">
                <button className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-bold transition-all">
                   Initialize Recovery Operation
                </button>
             </Link>
             <Link to="/" className="w-full">
                <button className="w-full py-3 text-gray-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest">
                   Return to Central Command
                </button>
             </Link>
          </div>
       </div>
    </div>
  );
  }

  if (!scan) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-8">
        <div className="max-w-lg w-full bg-[#111111] border border-[#1f1f1f] rounded-3xl p-10 text-center space-y-4">
          <h2 className="text-2xl font-black uppercase tracking-tight text-white">Scan Data Unavailable</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            The scan response did not include usable data. Please return to the dashboard and try again.
          </p>
          <Link to="/" className="inline-flex items-center justify-center px-5 py-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl font-bold transition-all">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if ((scan?.status === 'running' || scan?.status === 'queued') && scan?.scan_type === 'github' && scan?.session_id) {
    navigate(`/ide/${scan.session_id}`);
    return null;
  }

  const handleAbort = async () => {
    if (window.confirm("ARE YOU SURE YOU WANT TO ABORT THIS MISSION? ALL PROGRESS WILL BE TERMINATED.")) {
      try {
        await api.post(`/api/scans/${id}/abort`);
        navigate('/');
      } catch (err) {
        console.error("Abort failed", err);
        navigate('/'); // Redirect anyway
      }
    }
  };

  if (scan?.status === 'running' || scan?.status === 'queued') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-indigo-500/30 font-sans">
         <Navbar />
         <div className="max-w-[1400px] mx-auto pt-32 p-4 md:p-8 space-y-12">
            {/* Header / Nav */}
            <button 
                onClick={handleAbort}
                className="inline-flex items-center gap-2 px-4 py-2 border border-red-900/30 bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-red-900/20"
            >
               <XCircle className="w-4 h-4" /> Abort Mission
            </button>
            <div className="space-y-2">
               <h1 className="text-4xl font-black uppercase tracking-tight">Active Operation</h1>
               <p className="text-gray-500 font-mono text-sm tracking-tight">{scan.target}</p>
            </div>
            <ScanProgress
              scanId={id!}
              onComplete={() => {
                void fetchScanData();
              }}
              onFailed={(reason) => {
                setRealtimeError(reason);
                window.setTimeout(() => {
                  void fetchScanData();
                }, 1500);
              }}
            />
         </div>
      </div>
    );
  }

  const sevCount = (s: string) => findings.filter(f => f.severity === s && f.attack_worked).length;

  const displayRiskScore = scan?.risk_score > 0 ? scan.risk_score : calculatedRiskScore;

  const riskLabel = (score: number) => {
    if (score <= 20) return "✅ GOOD SECURITY POSTURE";
    if (score <= 40) return "⚠️ ISSUES REQUIRE ATTENTION";
    if (score <= 70) return "🚨 MULTIPLE CRITICAL FINDINGS";
    return "🔴 IMMEDIATE CONTAINMENT REQUIRED";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-indigo-500/30">
       <Navbar />

       <div className="pt-[72px] bg-[#0a0a0a]/50 border-b border-[#1f1f1f]">
          <div className="max-w-[1400px] mx-auto px-8 py-4 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-2">
                   <ArrowLeft className="w-3 h-3" /> Back to Intelligence
                </Link>
                <div className="h-4 w-px bg-[#1f1f1f]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500/80">Operation ID: {id?.split('-')[0]}</span>
             </div>
             <div className="flex items-center gap-3">
                 {scan.session_id && (
                    <Link to={`/ide/${scan.session_id}`}>
                       <button className="flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                          <Terminal className="w-3 h-3" /> Open in IDE
                       </button>
                    </Link>
                 )}
                 <button 
                  onClick={() => handleExport('waf')}
                  disabled={isExporting !== null}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                >
                   {isExporting === 'waf' ? <Loader2 className="w-3 h-3 animate-spin" /> : '🛡️'} WAF Rules
                </button>
                <button 
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting !== null}
                  className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-white/5 border border-[#1f1f1f] text-gray-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                >
                   {isExporting === 'pdf' ? <Loader2 className="w-3 h-3 animate-spin" /> : '📄'} PDF Report
                </button>
                <button 
                  onClick={() => handleExport('json')}
                  disabled={isExporting !== null}
                  className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-white/5 border border-[#1f1f1f] text-gray-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                >
                   {isExporting === 'json' ? <Loader2 className="w-3 h-3 animate-spin" /> : '🔗'} Export JSON
                </button>
             </div>
          </div>
       </div>

       <main className="pt-12 pb-20 px-8 max-w-[1400px] mx-auto space-y-12">
          {/* Header Metadata */}
          <div className="flex flex-col md:flex-row gap-12 items-center bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-[#1f1f1f] p-12 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 transition-all duration-1000"></div>
             
             <div className="relative z-10 flex-shrink-0">
                <RiskGauge score={displayRiskScore} />
             </div>

             <div className="flex-1 space-y-6 relative z-10">
                <div className="space-y-2">
                   <div className="flex items-center gap-4">
                      {scan.scan_type === 'url' ? <Globe className="w-5 h-5 text-indigo-500" /> : <FileCode className="w-5 h-5 text-green-500" />}
                      <span className="text-xs font-black uppercase tracking-[0.3em] text-gray-600">{scan.scan_type} Deep Integrity Scan</span>
                   </div>
                   <h1 className="text-4xl font-black tracking-tight break-all uppercase leading-[1.1]">{scan.target}</h1>
                </div>

                <div className="flex flex-wrap gap-8 py-6 border-y border-[#1f1f1f]">
                   <div className="space-y-1">
                      <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Post Analysis Summary</div>
                      <div className="text-lg font-bold text-white flex items-center gap-2">
                        {riskLabel(displayRiskScore)}
                      </div>
                   </div>
                   <div className="space-y-1">
                      <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Duration</div>
                      <div className="text-lg font-bold flex items-center gap-2"><Clock className="w-4 h-4 text-gray-600" /> {scan?.duration || 'N/A'}</div>
                   </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                   {[
                     { label: 'Critical', val: sevCount('critical'), color: 'bg-red-500', icon: ShieldAlert },
                     { label: 'High', val: sevCount('high'), color: 'bg-orange-500', icon: AlertTriangle },
                     { label: 'Medium', val: sevCount('medium'), color: 'bg-yellow-500', icon: AlertTriangle },
                     { label: 'Low', val: sevCount('low'), color: 'bg-blue-500', icon: ShieldCheck },
                     { label: 'Inspected', val: '100%', color: 'bg-green-500', icon: CheckCircle2 },
                   ].map((s, idx) => (
                     <div key={idx} className="p-4 bg-black/40 border border-[#1f1f1f] rounded-2xl flex items-center gap-4 hover:border-indigo-500/30 transition-all cursor-pointer">
                        <div className={`p-2 rounded-lg bg-black ${s.color} bg-opacity-10 text-opacity-100`}>
                           <s.icon className={`w-4 h-4 ${s.color.replace('bg-', 'text-')}`} />
                        </div>
                        <div>
                           <div className="text-[10px] font-black uppercase tracking-widest text-gray-600">{s.label}</div>
                           <div className="text-lg font-black">{s.val}</div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="space-y-6">
             <div className="flex border-b border-[#1f1f1f]">
               {['findings', 'compliance', 'attack-surface', 'analytics'].map((tab: any) => (
                 <button 
                   key={tab}
                   onClick={() => setMainTab(tab)}
                   className={`px-8 py-4 text-sm font-black uppercase tracking-widest transition-all ${mainTab === tab ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-gray-500 hover:text-gray-300'}`}
                 >
                   {tab.replace('-', ' ')}
                 </button>
               ))}
             </div>

             {mainTab === 'findings' && (
                <div className="animate-fadeIn space-y-12">
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                      {/* Column 1: Confirmed */}
                      <div className="flex flex-col gap-4">
                         <div className="flex items-center justify-between p-4 bg-red-500/10 border-b border-red-500/20 rounded-t-2xl">
                             <div className="flex items-center gap-3">
                                <ShieldAlert className="w-5 h-5 text-red-500" />
                                <span className="text-xs font-black uppercase tracking-widest text-red-400">Confirmed</span>
                             </div>
                             <span className="text-sm font-black text-red-500">{findings.filter(f => f.attack_worked).length}</span>
                         </div>
                         <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {groupFindings(findings.filter(f => f.attack_worked)).map((g: any) => (
                               <div key={g.id} className="p-3 bg-[#111111] border border-[#1f1f1f] rounded-xl hover:border-red-500/40 transition-all cursor-pointer group">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-[9px] font-black uppercase text-red-500/70">{g.severity}</span>
                                    <span className="text-[10px] font-black text-white bg-red-500/20 px-1.5 rounded">x{g.count}</span>
                                  </div>
                                  <div className="text-[11px] font-bold text-white group-hover:text-red-400 transition-colors uppercase leading-tight mb-2">{g.vuln_type}</div>
                                  <div className="space-y-1">
                                    {g.examples.map((ex: string, i: number) => (
                                      <div key={i} className="text-[9px] font-mono text-gray-600 truncate bg-black/40 px-1.5 py-0.5 rounded italic">{ex}</div>
                                    ))}
                                    {g.count > 3 && <div className="text-[8px] text-gray-700 ml-2">+{g.count - 3} more instances...</div>}
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>

                      {/* Column 2: Defended */}
                      <div className="flex flex-col gap-4">
                         <div className="flex items-center justify-between p-4 bg-green-500/10 border-b border-green-500/20 rounded-t-2xl">
                             <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span className="text-xs font-black uppercase tracking-widest text-green-400">Defended</span>
                             </div>
                             <span className="text-sm font-black text-green-500">{findings.filter(f => f.was_attempted && !f.attack_worked).length}</span>
                         </div>
                         <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-none custom-scrollbar">
                            {groupFindings(findings.filter(f => f.was_attempted && !f.attack_worked)).map((g: any) => (
                               <div key={g.id} className="p-3 bg-[#111111] border border-[#1f1f1f] rounded-xl hover:border-green-500/40 transition-all cursor-pointer group opacity-90 hover:opacity-100">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-[9px] font-black uppercase text-green-500/70">Actively Defended</span>
                                    <span className="text-[10px] font-black text-white bg-green-500/20 px-1.5 rounded">x{g.count}</span>
                                  </div>
                                  <div className="text-[11px] font-bold text-white group-hover:text-green-400 transition-colors uppercase leading-tight mb-2">{g.vuln_type}</div>
                                  <div className="text-[10px] font-mono text-gray-600 truncate bg-black/40 p-1.5 rounded italic">System immune to {g.tool_source || 'attack'}</div>
                               </div>
                            ))}
                            {findings.filter(f => f.was_attempted && !f.attack_worked).length === 0 && (
                                <div className="p-8 text-center border border-dashed border-[#1f1f1f] rounded-2xl">
                                    <div className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">All tools reported success or skipped</div>
                                </div>
                            )}
                         </div>
                      </div>

                      {/* Column 3: Not Tested */}
                      <div className="flex flex-col gap-4">
                         <div className="flex items-center justify-between p-4 bg-gray-500/10 border-b border-gray-500/20 rounded-t-2xl">
                             <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-gray-500" />
                                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Not Tested</span>
                             </div>
                             <span className="text-sm font-black text-gray-500">{findings.filter(f => !f.was_attempted).length}</span>
                         </div>
                         <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-none custom-scrollbar">
                            {groupFindings(findings.filter(f => !f.was_attempted)).map((g: any) => (
                               <div key={g.id} className="p-3 bg-[#111111] border border-[#1f1f1f] rounded-xl group hover:border-gray-500/30 transition-all opacity-50 cursor-not-allowed">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-[9px] font-black uppercase text-gray-600">Automated Analysis</span>
                                    <span className="text-[10px] font-black text-gray-600 bg-gray-500/10 px-1.5 rounded">x{g.count}</span>
                                  </div>
                                  <div className="text-[11px] font-bold text-gray-400 uppercase leading-tight mb-1">{g.vuln_type}</div>
                                  <div className="text-[10px] font-mono text-gray-700 italic leading-snug">{g.description}</div>
                                </div>
                            ))}
                         </div>
                      </div>
                   </div>

                   <hr className="border-[#1f1f1f]" />
                   <div className="flex items-center gap-4">
                      <Filter className="w-5 h-5 text-indigo-500" />
                      <h3 className="text-2xl font-black uppercase tracking-tight italic text-white uppercase">Granular Breakdown Table</h3>
                   </div>
                   <FindingsTable findings={filterCategory ? findings.filter(f => f.owasp_category?.startsWith(filterCategory)) : findings} />
                </div>
             )}

             {mainTab === 'compliance' && <ComplianceTab scanId={id!} />}
             {mainTab === 'attack-surface' && <AttackSurfaceTab scanId={id!} />}
             
             {mainTab === 'analytics' && (
                <div className="space-y-12 animate-fadeIn">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Tech intelligence */}
                      <div className="bg-[#111111] border border-[#1f1f1f] rounded-[2.5rem] p-10 space-y-8">
                         <h3 className="text-2xl font-black uppercase tracking-tight">Host Intelligence</h3>
                         <div className="grid grid-cols-2 gap-4">
                            {[
                               { label: 'Operating System', val: scan.os_guess || 'Linux/Unified', icon: '💻' },
                               { label: 'Detected Ports', val: scan.open_ports?.join(', ') || 'None', icon: '🔌' },
                               { label: 'Web Server', val: scan.tech_stack?.technologies?.find((t:string) => t.includes('Server')) || 'Unknown', icon: '☁️' },
                               { label: 'WAF/CDN', val: scan.tech_stack?.waf ? 'Active Protection' : 'None Detected', icon: '🛡️' },
                            ].map((item, i) => (
                               <div key={i} className="p-5 bg-black/40 border border-[#1f1f1f] rounded-2xl">
                                  <div className="text-lg mb-1">{item.icon}</div>
                                  <div className="text-[10px] font-black text-gray-500 uppercase mb-1">{item.label}</div>
                                  <div className="text-sm font-bold text-white truncate">{item.val}</div>
                                </div>
                            ))}
                         </div>
                      </div>

                      {/* timeline */}
                      <div className="bg-[#111111] border border-[#1f1f1f] rounded-[2.5rem] p-10 space-y-8">
                         <h3 className="text-2xl font-black uppercase tracking-tight">Attack Timeline</h3>
                         <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                            {(scan.attack_timeline || []).map((entry: any, i: number) => (
                               <div key={i} className="flex items-center gap-4 p-3 bg-black/40 border border-[#1f1f1f] rounded-xl">
                                  <div className="text-[10px] font-mono text-gray-600 shrink-0">{entry.time?.split('T')[1]?.slice(0,8)}</div>
                                  <div className="w-1 h-1 bg-indigo-500 rounded-full" />
                                  <div className="flex-1">
                                     <div className="text-[10px] font-black text-white uppercase">{entry.tool}</div>
                                     <div className="text-[9px] text-gray-500 italic">{entry.action}</div>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>

                   <SecurityBenchmark score={scan.risk_score || 0} techStack={scan.tech_stack} />
                   <VulnHeatmap 
                      findings={findings} 
                      onFilterChange={(cat) => {
                         setFilterCategory(cat);
                         setMainTab('findings');
                      }} 
                      selectedCategory={filterCategory} 
                   />
                </div>
              )}
          </div>
       </main>
       
       <ChatPanel scanId={id!} />
    </div>
  );
};

export default ScanResultPage;
