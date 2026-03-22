import React, { useState } from 'react';
import { Bot, Search, MessageSquare, AlertTriangle, ShieldAlert, ChevronRight, Zap, ArrowLeft } from 'lucide-react';
import { FindingDetailPanel } from '../FindingDetailPanel';

interface Finding {
  id: string;
  vuln_type: string;
  severity: string;
  line_number: number;
}

interface AgentPanelProps {
  status: string;
  logs: string[];
  findings: Record<string, Finding[]>;
  score: number | null;
  activePath: string | null;
  onFileSelect: (path: string, finding?: Finding) => void;
  chatMessages: {role: string, content: string}[];
  onSendMessage: (msg: string) => void;
  activeTab: 'agent' | 'findings' | 'chat';
  setActiveTab: (tab: 'agent' | 'findings' | 'chat') => void;
  onFixAll?: () => Promise<void>;
}

export function AgentPanel({ status, logs, findings, score, onFileSelect, chatMessages, onSendMessage, activeTab, setActiveTab, onFixAll }: AgentPanelProps) {
  const [input, setInput] = useState('');
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [fixingAll, setFixingAll] = useState(false);

  const renderTabHeader = () => (
    <div className="flex bg-[#0a0a0a] border-b border-[#1f1f1f]">
      <button onClick={() => setActiveTab('agent')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'agent' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-[#161616]' : 'text-gray-500 hover:text-gray-300'}`}>
        <Bot className="w-3 h-3" /> Agent
      </button>
      <button onClick={() => setActiveTab('findings')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'findings' ? 'text-red-400 border-b-2 border-red-500 bg-[#161616]' : 'text-gray-500 hover:text-gray-300'}`}>
        <Search className="w-3 h-3" /> Findings
      </button>
      <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'chat' ? 'text-green-400 border-b-2 border-green-500 bg-[#161616]' : 'text-gray-500 hover:text-gray-300'}`}>
        <MessageSquare className="w-3 h-3" /> Chat
      </button>
    </div>
  );

  return (
    <div className="w-full min-w-[280px] max-w-[min(26rem,42vw)] sm:max-w-[26rem] bg-[#0d0d0d] border-r border-[#1f1f1f] flex flex-col flex-shrink-0">
      {renderTabHeader()}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'agent' && (
          <div className="absolute inset-0 overflow-y-auto p-4 flex flex-col space-y-4">
            {status !== 'ready' && status !== 'error' ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <p className="text-xs font-mono text-indigo-400 uppercase tracking-widest">Scanning in progress...</p>
              </div>
            ) : status === 'ready' ? (
              <div className="bg-[#161616] border border-[#2a2a2a] p-6 rounded-xl text-center space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Risk index (higher = more issues)</h3>
                <div className={`text-5xl font-black ${
                  score == null ? 'text-gray-600' :
                  score >= 70 ? 'text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' :
                  score >= 40 ? 'text-orange-500' :
                  'text-green-500'
                }`}>{score !== undefined && score !== null ? score : 0}</div>
                <div className="flex items-center justify-center gap-4 text-xs font-mono">
                   <span className="text-red-400">Crit: {Object.values(findings).flat().filter(f => f.severity === 'critical').length}</span>
                   <span className="text-orange-400">High: {Object.values(findings).flat().filter(f => f.severity === 'high').length}</span>
                </div>
              </div>
            ) : null}
            <div className="space-y-2 mt-4">
               {logs.map((L, i) => (
                 <div key={i} className="text-[10px] font-mono p-2 bg-[#1a1a1a] border border-[#1f1f1f] rounded text-gray-400">{L}</div>
               ))}
            </div>
            {status === 'ready' && (
               <button 
                onClick={async () => {
                   if (onFixAll) {
                       setFixingAll(true);
                       await onFixAll();
                       setFixingAll(false);
                   }
                }}
                disabled={fixingAll}
                className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded font-mono text-xs font-bold uppercase tracking-widest transition-colors mt-auto"
               >
                 {fixingAll ? <div className="w-4 h-4 border-2 border-white/20 border-t-white animate-spin rounded-full" /> : <Zap className="w-4 h-4" />}
                 Fix All Critical
               </button>
            )}
          </div>
        )}

        {activeTab === 'findings' && (
          <div className="absolute inset-0 flex flex-col">
            {selectedFinding ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3 border-b border-[#1f1f1f] bg-black/40 flex items-center gap-2">
                  <button onClick={() => setSelectedFinding(null)} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-black uppercase text-gray-400">Back to List</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <FindingDetailPanel finding={selectedFinding} isIDE={true} />
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {Object.entries(findings).length === 0 ? (
                  <div className="text-center text-gray-500 font-mono text-xs py-12">No vulnerabilities found.</div>
                ) : (
                  Object.entries(findings).map(([file, list]) => (
                    <div key={file} className="space-y-2">
                       <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest pb-1 border-b border-[#1f1f1f] break-all">{file}</div>
                       {list.map(f => (
                         <div key={f.id} onClick={() => { onFileSelect(file, f); setSelectedFinding(f); }} className={`p-2 rounded cursor-pointer border hover:border-white/20 transition-all ${f.severity === 'critical' ? 'bg-red-500/5 border-red-500/20' : 'bg-orange-500/5 border-orange-500/20'}`}>
                           <div className="flex items-start gap-2">
                             {f.severity === 'critical' ? <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />}
                             <div>
                               <div className={`text-xs font-bold ${f.severity === 'critical' ? 'text-red-400' : 'text-orange-400'}`}>{f.vuln_type}</div>
                               <div className="text-[10px] text-gray-500 font-mono">Line {f.line_number}</div>
                             </div>
                           </div>
                         </div>
                       ))}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                 <div className="text-center text-gray-500 font-mono text-xs py-12">Ask Sentinel an architectural or code-level question.</div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`p-3 rounded-lg text-xs leading-relaxed ${msg.role === 'user' ? 'bg-[#1f1f1f] text-gray-300 ml-4' : 'bg-indigo-500/10 text-indigo-200 border border-indigo-500/20 mr-4'}`}>
                  {msg.content}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-[#1f1f1f] bg-[#0d0d0d]">
              <form onSubmit={e => { e.preventDefault(); if (input.trim()) onSendMessage(input.trim()); setInput(''); }}>
                 <div className="flex items-center gap-2">
                   <input value={input} onChange={e => setInput(e.target.value)} type="text" placeholder="Explain this file..." className="flex-1 bg-[#161616] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 font-mono" />
                   <button type="submit" className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded text-white"><ChevronRight className="w-4 h-4" /></button>
                 </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
