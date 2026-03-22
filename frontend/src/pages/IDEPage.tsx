import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Download, Loader2, XCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { AgentPanel } from '../components/ide/AgentPanel';
import { CodeEditor } from '../components/ide/CodeEditor';
import { FileTree } from '../components/ide/FileTree';

export default function IDEPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [findings, setFindings] = useState<any>({});
  const [logs, setLogs] = useState<string[]>(['ShieldSentinel IDE Engine boot...']);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [fileContext, setFileContext] = useState({ content: '', language: 'plaintext', path: '' });
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'agent' | 'findings' | 'chat'>('agent');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleAbort = async () => {
      if (window.confirm("ARE YOU SURE YOU WANT TO ABORT THIS SCAN?")) {
          if (session?.scan_id) {
              try {
                  await api.post(`/api/scans/${session.scan_id}/abort`);
                  navigate('/');
              } catch (e) {
                  console.error(e);
                  navigate('/');
              }
          } else {
              navigate('/');
          }
      }
  };

  useEffect(() => {
    let isUnmounted = false;
    let ws: WebSocket | null = null;
    let retryCount = 0;
    const maxRetries = 3;
    
    fetchSession();
    fetchFindings();
    
    const connectWebSocket = () => {
      if (isUnmounted || retryCount >= maxRetries) return;
      
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const host = window.location.hostname;
      const wsUrl = `${protocol}://${host}:8000/ws/ide/${sessionId}`;
      
      console.log(`Connecting to IDE WebSocket (attempt ${retryCount + 1}): ${wsUrl}`);
      
      try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log("WebSocket connected successfully");
          retryCount = 0; // Reset retry count on successful connection
        };
        
        ws.onmessage = (e) => {
          if (isUnmounted) return;
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'progress') {
              setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${data.message} (${data.pct}%)`]);
              if (data.pct === 100) {
                 fetchSession().catch((err) => {
                   console.error("Failed to fetch session after progress completion:", err);
                 });
                 fetchFindings().catch((err) => {
                   console.error("Failed to fetch findings after progress completion:", err);
                 });
              }
            } else if (data.type === 'finding') {
               fetchFindings();
            } else if (data.type === 'error') {
               setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🚨 ERROR: ${data.message}`]);
            }
          } catch (err) {
            console.error("Failed to parse WebSocket message", err);
          }
        };

        ws.onerror = (err) => {
          if (isUnmounted) return;
          console.error("WebSocket Error:", err);
          retryCount++;
        };

        ws.onclose = (e) => {
          if (isUnmounted) return;
          console.log("WebSocket closed:", e.code, e.reason);
          
          if (e.code !== 1000 && e.code !== 1001 && retryCount < maxRetries) {
            setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔌 Connection lost. Retrying... (${retryCount}/${maxRetries})`]);
            setTimeout(() => {
              connectWebSocket();
            }, 2000 * retryCount); // Exponential backoff
          } else if (retryCount >= maxRetries) {
            setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔌 Connection failed after ${maxRetries} attempts. Working in offline mode.`]);
          }
        };
      } catch (err) {
        console.error("Failed to create WebSocket connection:", err);
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(() => {
            connectWebSocket();
          }, 2000 * retryCount);
        }
      }
    };
    
    connectWebSocket();
    
    return () => {
      isUnmounted = true;
      // ONLY close if it's already OPEN. 
      // Closing in CONNECTING state triggers a browser console error.
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, "Component unmounted");
      }
    };
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const { data } = await api.get(`/api/ide/${sessionId}`);
      setSession(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFindings = async () => {
    try {
      const { data } = await api.get(`/api/ide/${sessionId}/findings`);
      setFindings(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileSelect = async (path: string, finding?: any) => {
    setActivePath(path);
    try {
      const { data } = await api.get(`/api/ide/${sessionId}/file?path=${encodeURIComponent(path)}`);
      setFileContext({
        content: data.content,
        language: data.language,
        path: path
      });
      setAnnotations(data.annotations);
      
      if (finding) {
         // Focus finding logic happens via editor mount or scroll inside CodeEditor if we passed finding directly
      }
    } catch (e) {
      console.error("File not fetched", e);
    }
  };

  const handleSendMessage = async (msg: string) => {
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    try {
      const { data } = await api.post(`/api/ide/${sessionId}/chat`, { message: msg, file_path: activePath });
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't process that message." }]);
    }
  };

  const handleFixAll = async () => {
    try {
        const res = await api.post(`/api/ide/${sessionId}/fix-all`);
        const n = res.data.applied_count ?? 0;
        if (n > 0) {
            toast.success(`Applied ${n} automated fix(es).`);
            if (activePath && res.data.modified_files?.includes(activePath)) {
                handleFileSelect(activePath);
            }
            fetchFindings();
            fetchSession();
        } else {
            toast.error(
              'No automatic fixes applied. Wait for AI analysis to finish (for suggested code), or fix issues manually — empty quick-fixes are skipped.'
            );
        }
    } catch (e) {
        console.error("Fix all failed", e);
        toast.error('Fix-all request failed. Check the console for details.');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            handleFixAll();
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
            e.preventDefault();
            setActiveTab('findings');
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setActiveTab('chat');
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionId, activePath, session]);

  const downloadZip = async () => {
    setIsDownloading(true);
    try {
      const res = await api.get(`/api/ide/${sessionId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${session?.repo_name}_secured.zip`);
      document.body.appendChild(link);
      link.click();
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans h-screen overflow-hidden">
      <div className="h-14 bg-[#111] border-b border-[#2a2a2a] flex items-center justify-between px-6 flex-shrink-0 z-50 shadow-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleAbort}
            className="flex items-center gap-2 px-3 py-1 border border-red-900/30 bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white rounded-md transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <XCircle className="w-3.5 h-3.5" />
            Abort Mission
          </button>
          <div className="h-6 w-px bg-[#2a2a2a]" />
          <div className="flex items-center gap-2">
            <span className="text-xl">🐙</span>
            <span className="font-mono text-sm tracking-widest">{session?.repo_name || 'Loading Repo...'}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-[#161616] border border-[#2a2a2a] rounded-full px-4 py-1.5 shadow-inner">
             {(() => {
               const r = session?.security_score;
               const icon =
                 r == null ? 'text-gray-500' :
                 r >= 70 ? 'text-red-500' :
                 r >= 40 ? 'text-orange-500' :
                 'text-green-500';
               return (
                 <>
                   <ShieldCheck className={`w-4 h-4 ${icon}`} />
                   <span
                     className="text-xs font-black uppercase tracking-widest"
                     title="Risk index: higher = more severity-weighted findings (not a grade — 0 means nothing scored)"
                   >
                     Risk: {r !== undefined && r !== null ? r : '--'}/100
                     {session?.total_findings != null && session.total_findings > 0 ? (
                       <span className="ml-2 font-mono font-normal normal-case text-gray-500">
                         · {session.total_findings} finding{session.total_findings === 1 ? '' : 's'}
                       </span>
                     ) : null}
                   </span>
                 </>
               );
             })()}
          </div>
          
          <button 
            onClick={downloadZip}
            disabled={isDownloading || session?.status !== 'ready'}
            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-full text-xs font-bold uppercase tracking-widest transition-all"
          >
            {isDownloading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Download className="w-3 h-3" />}
            Download ZIP
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
        <AgentPanel 
          status={session?.status || 'cloning'}
          logs={logs}
          findings={findings}
          score={session?.security_score}
          activePath={activePath}
          onFileSelect={handleFileSelect}
          chatMessages={chatMessages}
          onSendMessage={handleSendMessage}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onFixAll={handleFixAll}
        />
        <CodeEditor 
          sessionId={sessionId!} 
          fileContext={fileContext} 
          annotations={annotations} 
          onFixApplied={() => handleFileSelect(fileContext.path)} 
        />
        <FileTree 
          tree={session?.file_tree || []} 
          findings={findings} 
          activePath={activePath} 
          onFileSelect={handleFileSelect} 
        />
      </div>

      {/* Shortcut Bar */}
      <div className="h-8 bg-[#0a0a0a] border-t border-[#1f1f1f] flex items-center px-4 gap-6 select-none overflow-x-auto whitespace-nowrap z-50">
         {[
           { k: '⌘F', l: 'Search Findings' },
           { k: '⌘S', l: 'Fix All Critical' },
           { k: '⌘K', l: 'Focus Chat' },
           { k: 'ESC', l: 'Close Widget' },
           { k: '⌥↑↓', l: 'Nav Findings' },
           { k: '⌘D', l: 'Download Zip' }
         ].map(s => (
           <div key={s.k} className="flex items-center gap-1.5">
             <span className="text-[10px] font-black bg-[#1a1a1a] px-1.5 py-0.5 rounded text-gray-500 border border-[#2a2a2a]">{s.k}</span>
             <span className="text-[9px] font-bold text-gray-600 uppercase tracking-tight">{s.l}</span>
           </div>
         ))}
         <div className="ml-auto text-[9px] font-mono text-indigo-500/50 uppercase tracking-widest">ShieldSentinel v2.0 // Secure IDE Mode</div>
      </div>
    </div>
  );
}
