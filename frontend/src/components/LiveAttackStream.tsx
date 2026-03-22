import React, { useEffect, useState, useRef } from 'react';
import { Shield, Zap, Target, Search, Sword } from 'lucide-react';

interface AttackEvent {
  timestamp: string;
  tool: string;
  target_url: string;
  result: string;
  pct: number;
}

interface LiveAttackStreamProps {
  scanId: string;
}

const LiveAttackStream: React.FC<LiveAttackStreamProps> = ({ scanId }) => {
  const [attacks, setAttacks] = useState<AttackEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const apiBase = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
    const socketUrl = apiBase.replace(/^http/, 'ws').replace(/\/$/, '');
    const ws = new WebSocket(`${socketUrl}/ws/scan/${scanId}`);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.event_type === 'attack') {
        setAttacks((prev) => [...prev, {
          timestamp: data.timestamp || new Date().toLocaleTimeString(),
          tool: data.tool || 'Unknown',
          target_url: data.target_url || '/',
          result: data.result || 'SENT',
          pct: data.pct || 0
        }].slice(-50)); // Keep last 50
      }
    };

    return () => {
      if (socketRef.current) {
        const ws = socketRef.current;
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
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [attacks]);

  const getToolIcon = (tool: string) => {
    const t = tool.toLowerCase();
    if (t.includes('sqlmap')) return <Zap className="w-3 h-3 text-yellow-500" />;
    if (t.includes('xsstrike')) return <Target className="w-3 h-3 text-orange-500" />;
    if (t.includes('zap')) return <Sword className="w-3 h-3 text-indigo-500" />;
    return <Search className="w-3 h-3 text-gray-400" />;
  };

  const getResultStyle = (result: string) => {
    const r = result.toLowerCase();
    if (r.includes('vulnerable')) return 'text-red-500 font-black animate-pulse';
    if (r.includes('blocked')) return 'text-green-500 font-bold';
    if (r.includes('no vuln')) return 'text-gray-500';
    return 'text-blue-400';
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl overflow-hidden flex flex-col h-full shadow-2xl">
      <div className="px-5 py-3 bg-[#111111] border-b border-[#1f1f1f] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ActivityIndicator />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Live Attack Stream</span>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-[11px] space-y-1.5 scrollbar-thin scrollbar-thumb-indigo-500/20 scrollbar-track-transparent bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"
      >
        {attacks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-700 opacity-30">
             <Shield className="w-12 h-12 mb-2" />
             <p className="uppercase tracking-widest font-black">Awaiting Payloads</p>
          </div>
        ) : (
          attacks.map((atk, i) => (
            <div key={i} className="flex gap-3 hover:bg-white/5 p-1 rounded transition-colors group">
              <span className="text-gray-600 shrink-0">{atk.timestamp}</span>
              <span className="flex items-center gap-1 shrink-0 w-24">
                {getToolIcon(atk.tool)}
                <span className="text-indigo-400 font-bold truncate">{atk.tool}</span>
              </span>
              <span className="text-gray-400 shrink-0">→</span>
              <span className="text-gray-300 truncate flex-1 group-hover:text-white" title={atk.target_url}>{atk.target_url}</span>
              <span className={`shrink-0 uppercase tracking-tighter ${getResultStyle(atk.result)}`}>
                {atk.result}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const ActivityIndicator = () => (
    <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter">Live</span>
    </div>
);

export default LiveAttackStream;
