import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Shield, CheckCircle2, Clock, Zap, Activity, Cpu, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ScanProgressProps {
  scanId: string;
  onComplete?: () => void;
  onFailed?: (reason: string) => void;
}

interface ScanLog {
  message: string;
  percentage: number;
  timestamp: string;
  isError?: boolean;
}

const ScanProgress: React.FC<ScanProgressProps> = ({ scanId, onComplete, onFailed }) => {
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('Initializing...');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFailed, setIsFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onFailedRef = useRef(onFailed);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onFailedRef.current = onFailed;
  }, [onComplete, onFailed]);

  useEffect(() => {
    if (progress < 100 && !isFailed) {
      timerRef.current = window.setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [progress, isFailed]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const apiBase = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
    const socketUrl = apiBase.replace(/^http/, 'ws').replace(/\/$/, '');
    const ws = new WebSocket(`${socketUrl}/ws/scan/${scanId}`);
    socketRef.current = ws;

    ws.onopen = () => {
      // Connection established
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // --- FAILURE HANDLING ---
      if (data.status === 'failed' || data.is_error) {
        const reason = data.error_message || data.message || 'Unknown error occurred';
        setIsFailed(true);
        setErrorMessage(reason);
        setCurrentStatus(`❌ ${reason}`);

        setLogs((prev) => [
          ...prev,
          {
            message: `❌ SCAN FAILED: ${reason}`,
            percentage: 0,
            timestamp: new Date().toLocaleTimeString(),
            isError: true,
          },
        ]);
        onFailedRef.current?.(reason);
        return;
      }

      // --- NORMAL PROGRESS ---
      const nextProgress =
        typeof data.progress_pct === 'number'
          ? data.progress_pct
          : typeof data.percentage === 'number'
          ? data.percentage
          : 0;

      const nextStatus = data.message || data.status || 'Running scan...';

      setProgress(nextProgress);
      setCurrentStatus(nextStatus);

      setLogs((prev) => {
        if (prev.length > 0) {
          const lastLog = prev[prev.length - 1];
          if (lastLog.message === nextStatus && lastLog.percentage === nextProgress) return prev;
        }
        return [
          ...prev,
          {
            message: nextStatus,
            percentage: nextProgress,
            timestamp: new Date().toLocaleTimeString(),
          },
        ];
      });

      if (data.status === 'complete' || nextProgress >= 100) {
        onCompleteRef.current?.();
      }
    };

    ws.onerror = () => {
      setCurrentStatus('⚠️ Connection lost while waiting for scanner updates...');
    };

    return () => {
      if (socketRef.current) {
        const ws = socketRef.current;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => ws.close();
        } else {
          ws.close();
        }
        socketRef.current = null;
      }
    };
  }, [scanId]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTo({
        top: terminalRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [logs]);

  // ─── FAILED STATE ────────────────────────────────────────────────────────────
  if (isFailed) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6 animate-fadeIn">
        {/* Main failure card */}
        <div className="bg-[#111111] border border-red-500/30 rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
          <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="text-[10px] font-black text-red-500/70 uppercase tracking-[0.25em] mb-1 flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" /> Scan Engine Failure
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                  Operation Terminated
                </h2>
              </div>

              {/* Error reason box */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 font-mono text-sm">
                <div className="text-red-400/60 text-[10px] font-bold uppercase tracking-widest mb-2">
                  Error Message
                </div>
                <p className="text-red-300 leading-relaxed break-all">
                  {errorMessage || 'An unknown internal error occurred.'}
                </p>
              </div>

              {/* Elapsed time */}
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Clock className="w-4 h-4" />
                <span>Failed after {formatTime(elapsedTime)}</span>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Link to="/scan">
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                    <RefreshCw className="w-3 h-3" />
                    Retry Scan
                  </button>
                </Link>
                <Link to="/">
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-gray-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                    Return to Dashboard
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Reasons / Troubleshooting hints */}
        <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-6">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-yellow-500" /> Common Failure Reasons
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: '🔌', title: 'ZAP not reachable', desc: 'ZAP scanner container failed to start. Check Docker logs.' },
              { icon: '⏱️', title: 'Timeout', desc: 'Target was unreachable or too slow. Try a faster target.' },
              { icon: '🚫', title: 'Invalid target', desc: 'URL may be offline, blocked, or returning errors.' },
              { icon: '🛠️', title: 'Missing tool', desc: 'nuclei/semgrep/trivy may not be installed in the container.' },
            ].map((hint, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-[#111111] border border-[#1f1f1f] rounded-xl">
                <span className="text-xl">{hint.icon}</span>
                <div>
                  <div className="text-sm font-bold text-white">{hint.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{hint.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Terminal log showing what happened before failure */}
        {logs.length > 0 && (
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[250px]">
            <div className="px-6 py-3 bg-[#111111] border-b border-[#1f1f1f] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60 border border-red-500/40" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30" />
                  <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30" />
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="w-3 h-3" /> Execution Log (Before Failure)
                </span>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto font-mono text-sm">
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`flex gap-4 mb-2 border-l-2 pl-2 ${
                    log.isError ? 'border-red-500/60' : 'border-transparent'
                  }`}
                >
                  <span className="text-indigo-500/50 font-bold min-w-[80px]">{log.timestamp}</span>
                  <span className="text-gray-600">»</span>
                  <span className={log.isError ? 'text-red-400 font-bold' : 'text-gray-300'}>
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── RUNNING STATE ───────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Column: Animation & Stats */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden h-full min-h-[280px]">
            {/* Radial Scan Animation */}
            <div className="scan-radial-container mb-4">
              <div className="scan-radial-ring">
                <div className="scan-radial-ring" style={{ width: '80%', height: '80%', opacity: 0.5 }}></div>
                <div className="scan-radial-ring" style={{ width: '60%', height: '60%', opacity: 0.3 }}></div>
                <Shield className={`w-10 h-10 ${progress < 100 ? 'text-indigo-500 animate-pulse' : 'text-green-500'}`} />
              </div>
              {progress < 100 && <div className="scan-radial-sweep"></div>}
              {progress < 100 && <div className="scan-pulse" style={{ top: '20%', left: '30%' }}></div>}
              {progress < 100 && <div className="scan-pulse" style={{ bottom: '25%', right: '20%', animationDelay: '0.5s' }}></div>}
            </div>

            <div className="text-center z-10">
              <div className="text-4xl font-black text-white mb-1">{progress}%</div>
              <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Progress</div>
            </div>

            {/* Decorative grid */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            />
          </div>
        </div>

        {/* Right Column: Status & Progress */}
        <div className="md:col-span-3 space-y-6 flex flex-col">
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6 relative overflow-hidden flex-1">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                  <Activity className="w-3 h-3 text-indigo-500" /> System Status
                </h3>
                <p className="text-2xl font-bold text-white tracking-tight">{currentStatus}</p>
              </div>
              <div className="flex gap-4">
                <div className="text-right">
                  <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Elapsed Time</div>
                  <div className="text-xl font-mono font-bold text-indigo-400 flex items-center gap-2 justify-end">
                    <Clock className="w-4 h-4" /> {formatTime(elapsedTime)}
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-600">
                <span>Engine Initialized</span>
                <span>{progress}% Completed</span>
              </div>
              <div className="relative h-3 bg-black rounded-full border border-[#1f1f1f] overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-700 via-indigo-500 to-indigo-400 transition-all duration-1000 ease-out"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.1)_50%,transparent_100%)] w-full animate-beam" />
                </div>
              </div>
            </div>

            {/* Sub-metrics */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-[#1f1f1f]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg"><Cpu className="w-4 h-4 text-indigo-500" /></div>
                <div>
                  <div className="text-[9px] text-gray-500 font-bold uppercase">Threads</div>
                  <div className="text-sm font-bold text-white">Active (8)</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg"><Zap className="w-4 h-4 text-indigo-500" /></div>
                <div>
                  <div className="text-[9px] text-gray-500 font-bold uppercase">Intensity</div>
                  <div className="text-sm font-bold text-white capitalize">High Performance</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20"><Shield className="w-4 h-4 text-indigo-500" /></div>
                <div>
                  <div className="text-[9px] text-gray-500 font-bold uppercase">Protection</div>
                  <div className="text-sm font-bold text-white">Active</div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Terminal View */}
      <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[350px]">
        <div className="px-6 py-3 bg-[#111111] border-b border-[#1f1f1f] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30" />
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30" />
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Terminal className="w-3 h-3" /> System Execution Stream
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-green-500/70 uppercase">Live Stream</span>
          </div>
        </div>

        <div 
          ref={terminalRef}
          className="flex-1 p-6 overflow-y-auto font-mono text-sm scrollbar-thin scrollbar-thumb-indigo-600/20 scrollbar-track-transparent"
        >
          {logs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 animate-pulse">
              <Shield className="w-12 h-12 mb-4 opacity-10" />
              <p className="text-lg">Awaiting feedback from scanner...</p>
            </div>
          )}
          {logs.map((log, idx) => (
            <div
              key={idx}
              className={`flex gap-4 mb-2 animate-fadeIn border-l-2 pl-2 transition-colors ${
                log.isError ? 'border-red-500/60' : 'border-transparent hover:border-indigo-500/30'
              }`}
            >
              <span className="text-indigo-500/50 font-bold min-w-[80px]">{log.timestamp}</span>
              <span className="text-gray-600">»</span>
              <span className={log.isError ? 'text-red-400 font-bold' : log.percentage === 100 ? 'text-green-400 font-bold' : 'text-gray-300'}>
                {log.message}
              </span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

      {progress === 100 && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center animate-bounceIn shadow-lg shadow-green-500/5">
          <p className="text-green-400 font-bold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Mission Complete: All security modules reporting safe or identified.
          </p>
        </div>
      )}
    </div>
  );
};

export default ScanProgress;
