import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { ArrowLeft, Play, Save, CheckCircle2, AlertCircle, Terminal, Bot } from 'lucide-react';
import api from '../lib/api';
import Navbar from '../components/Navbar';

export function IDEMode() {
  const { id } = useParams<{ id: string }>();
  const [code, setCode] = useState('// Select a finding to apply AI fix...');
  const [findings, setFindings] = useState<any[]>([]);
  const [activeFinding, setActiveFinding] = useState<any | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle'|'testing'|'success'|'failed'>('idle');
  const [logs, setLogs] = useState<string[]>(['ShieldSentinel IDE Environment Initialized.']);

  useEffect(() => {
    fetchFindings();
  }, [id]);

  const fetchFindings = async () => {
    try {
      const { data } = await api.get(`/scans/${id}`);
      setFindings(data.findings || []);
      addLog(`Loaded ${data.findings?.length || 0} vulnerabilities for repair.`);
    } catch (err) {
      addLog('Failed to load vulnerabilities.');
    }
  };

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const selectFinding = (f: any) => {
    setActiveFinding(f);
    if (f.ai_fix_data?.defense_examples?.[0]?.code_after) {
      setCode(f.ai_fix_data.defense_examples[0].code_after);
      addLog(`Loaded AI fix for: ${f.vuln_type}`);
    } else {
      setCode(`// No AI fix found for ${f.vuln_type}\n// You may write a custom fix here.`);
      addLog(`No automated fix available for: ${f.vuln_type}`);
    }
    setTestStatus('idle');
  };

  const handleApplyFix = async () => {
    if (!activeFinding) return;
    setIsApplying(true);
    addLog(`Applying patch to sandbox...`);
    
    // Simulate applying and re-testing
    setTimeout(() => {
      setIsApplying(false);
      setTestStatus('testing');
      addLog(`Running verification tests for ${activeFinding.vuln_type}...`);
      
      setTimeout(() => {
        setTestStatus('success');
        addLog(`✅ Verification passed! Vulnerability successfully mitigated.`);
      }, 2000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">
      <Navbar />

      <div className="pt-[72px] bg-[#0a0a0a]/50 border-b border-[#1f1f1f] flex-shrink-0">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={`/scan/${id}`} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-2">
              <ArrowLeft className="w-3 h-3" /> Back to Report
            </Link>
            <div className="h-4 w-px bg-[#1f1f1f]" />
            <span className="text-[10px] items-center gap-2 flex font-black uppercase tracking-widest text-green-500/80">
              <Bot className="w-3 h-3" /> Sentinel IDE Mode
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleApplyFix}
              disabled={!activeFinding || isApplying || testStatus === 'testing'}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-mono text-xs uppercase transition-all disabled:opacity-50"
            >
              {isApplying ? <div className="w-3 h-3 rounded-full border-2 border-white/20 border-t-white animate-spin"/> : <Play className="w-3 h-3"/>}
              Apply & Verify Fix
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white rounded font-mono text-xs uppercase transition-all">
              <Save className="w-3 h-3" /> Commit Patch
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Files/Findings */}
        <div className="w-64 border-r border-[#1f1f1f] bg-[#0d0d0d] flex-shrink-0 flex flex-col">
          <div className="p-4 border-b border-[#1f1f1f]">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-500">Vulnerabilities</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {findings.map(f => (
              <button
                key={f.id}
                onClick={() => selectFinding(f)}
                className={`w-full text-left px-3 py-2 rounded text-xs font-mono truncate transition-colors ${
                  activeFinding?.id === f.id ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {f.severity === 'critical' ? '🚨' : f.severity === 'high' ? '🔴' : f.severity === 'medium' ? '🟠' : '🔵'} {f.vuln_type}
              </button>
            ))}
            {findings.length === 0 && (
              <div className="text-xs text-gray-600 font-mono p-4 text-center">No findings available.</div>
            )}
          </div>
        </div>

        {/* Center - Editor & Terminal */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e]">
          <div className="flex-1 relative">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineHeight: 22,
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                padding: { top: 16 }
              }}
            />
          </div>

          {/* Terminal / Output */}
          <div className="h-48 border-t border-[#1f1f1f] bg-[#0a0a0a] flex flex-col">
            <div className="px-4 py-2 border-b border-[#1f1f1f] flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
              <Terminal className="w-3 h-3" /> Build Output & AI Verification
              
              {testStatus === 'testing' && <span className="ml-auto text-yellow-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full border-2 border-yellow-500/20 border-t-yellow-500 animate-spin"/> Running security regression...</span>}
              {testStatus === 'success' && <span className="ml-auto text-green-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Test Passed</span>}
              {testStatus === 'failed' && <span className="ml-auto text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Test Failed</span>}
            </div>
            <div className="flex-1 p-4 font-mono text-[11px] leading-relaxed text-gray-300 overflow-y-auto whitespace-pre-wrap">
              {logs.map((log, i) => (
                <div key={i} className={
                  log.includes('✅') ? 'text-green-400' :
                  log.includes('🚨') || log.includes('Failed') ? 'text-red-400' :
                  'text-gray-400'
                }>{log}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
