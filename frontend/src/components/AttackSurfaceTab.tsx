import React, { useEffect, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { getAttackSurface } from '../lib/api';
import { 
  Loader2, Globe, ShieldAlert, Cpu, Server, 
  Database, Network, Shield, ExternalLink, 
  Activity, Search
} from 'lucide-react';

interface AttackSurfaceTabProps {
  scanId: string;
}

const AttackSurfaceTab: React.FC<AttackSurfaceTabProps> = ({ scanId }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => {
    getAttackSurface(scanId).then(res => {
      setData(res);
      setLoading(false);
    });
  }, [scanId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Constructing Attack Topology...</p>
    </div>
  );

  if (!data || data.nodes.length === 0) return (
    <div className="p-12 text-center text-gray-500 bg-[#111111] rounded-3xl border border-[#1f1f1f]">
      No attack surface data available for this scan type.
    </div>
  );

  // Map backend JSON to Cytoscape elements
  const elements = [
    ...data.nodes.map((n: any) => ({
      data: {
        id: n.id,
        label: n.label,
        vuln_count: n.vuln_count || 0,
        risk: n.risk || 'safe',
        vulns: n.vulns || [],
        full_url: n.full_url,
        attacks_succeeded: n.attacks_succeeded || []
      }
    })),
    ...data.edges.map((e: any) => ({
      data: { source: e.source, target: e.target, id: `${e.source}-${e.target}` }
    }))
  ];

  const cyStylesheet: any[] = [
    {
      selector: 'node',
      style: {
        'label': 'data(label)',
        'background-color': (ele: any) => {
          const risk = ele.data('risk');
          if (risk === 'critical') return '#ef4444';
          if (risk === 'high') return '#f97316';
          if (risk === 'medium') return '#eab308';
          if (risk === 'low') return '#3b82f6';
          return '#22c55e';
        },
        'color': '#fff',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': '8px',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 4,
        'width': (ele: any) => Math.min(60, 30 + ele.data('vuln_count') * 6),
        'height': (ele: any) => Math.min(60, 30 + ele.data('vuln_count') * 6),
        'border-width': 2,
        'border-color': '#000',
        'overlay-opacity': 0,
      }
    },
    {
        selector: 'node:selected',
        style: {
            'border-width': 4,
            'border-color': '#6366f1'
        }
    },
    {
      selector: 'edge',
      style: {
        'width': 1.5,
        'line-color': '#1f1f1f',
        'target-arrow-color': '#1f1f1f',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'opacity': 0.4
      }
    }
  ];

  const handleNodeClick = (event: any) => {
    setSelectedNode(event.target.data());
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* SECTION 1 — Tech Stack */}
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-[2rem] p-8 space-y-6 flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Cpu className="w-40 h-40 text-indigo-500" />
            </div>
            <div className="flex items-center gap-3 relative z-10">
                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                    <Server className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-gray-500 italic">Technology Stack Detected</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 relative z-10">
                {[
                    { label: 'OS', val: data.os_guess, icon: Cpu },
                    { label: 'Server', val: data.tech_stack?.technologies?.find((t: any) => ['Nginx','Apache','IIS'].includes(t)) || 'Nginx', icon: Globe },
                    { label: 'Backend', val: data.tech_stack?.technologies?.find((t: any) => ['PHP','Python','Node','Java'].includes(t)) || 'Framework Detect', icon: Database },
                    { label: 'Protection', val: data.tech_stack?.technologies?.includes('Cloudflare') ? 'Cloudflare ✓' : 'Direct IP', icon: Shield },
                ].map((item, i) => (
                    <div key={i} className="p-4 bg-black/40 border border-[#1f1f1f] rounded-2xl flex items-center gap-4 hover:border-indigo-500/30 transition-all cursor-pointer">
                        <div className="p-2 rounded-lg bg-black text-indigo-500">
                            <item.icon className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-600 italic">{item.label}</div>
                            <div className="text-sm font-bold text-gray-200">{item.val}</div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-auto px-4 py-2 bg-indigo-500/5 rounded-lg border border-indigo-500/10 text-[9px] font-bold text-indigo-400/80 uppercase tracking-widest text-center">
                Deep Analysis via fingerprint algorithms & Nmap banner-grab
            </div>
        </div>

        {/* SECTION 2 — Open Ports */}
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-[2rem] p-8 space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Network className="w-40 h-40 text-orange-500" />
            </div>
            <div className="flex items-center gap-3 relative z-10">
                <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-400">
                    <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-gray-500 italic">Open Ports & Services</h3>
            </div>
            
            <div className="overflow-hidden rounded-2xl border border-[#1f1f1f] bg-black/40 relative z-10">
                <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#111111] text-[10px] uppercase font-black tracking-widest text-gray-600">
                        <tr>
                            <th className="px-4 py-3">Port</th>
                            <th className="px-4 py-3">Service</th>
                            <th className="px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1f1f] text-gray-400">
                        {data.open_ports?.map((p: any, i: number) => (
                            <tr key={i} className="hover:bg-white/[0.02]">
                                <td className="px-4 py-3 font-bold text-white">{p.port || p}</td>
                                <td className="px-4 py-3 text-[10px]">{p.service || 'Unknown'}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded uppercase text-[9px] font-black tracking-tighter ${[22, 3306, 27017, 6379].includes(p.port) ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                                        {[22, 3306, 27017, 6379].includes(p.port) ? '🔴 Risk Detected' : '🟢 Open'}
                                    </span>
                                </td>
                            </tr>
                        )) || (
                            <tr><td colSpan={3} className="px-4 py-8 text-center italic opacity-30">No ports found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

      </div>

      {/* SECTION 3 — URL Graph */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-600 px-2 flex items-center gap-3 italic">
                <Globe className="w-4 h-4 text-indigo-500" /> Endpoint Dependency Graph
            </h3>
            <div className="flex gap-4">
                {['Critical', 'High', 'Medium', 'Safe'].map(v => (
                    <div key={v} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${v === 'Safe' ? 'bg-green-500' : v === 'Critical' ? 'bg-red-500' : 'bg-orange-500'}`} />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight italic">{v}</span>
                    </div>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="col-span-3 h-[500px] border border-[#1f1f1f] bg-[#0d0d0d] rounded-3xl overflow-hidden relative shadow-inner group">
                <div className="absolute top-4 left-4 z-10 space-y-2 opacity-50 group-hover:opacity-100 transition-all">
                    <div className="p-3 bg-black/80 rounded-xl border border-[#1f1f1f] text-gray-400">
                        <p className="text-[10px] font-black uppercase mb-1">Navigation</p>
                        <ul className="text-[9px] space-y-1">
                            <li>🖱️ Drag → Pan</li>
                            <li>📜 Scroll → Zoom</li>
                            <li>👉 Tap → Details</li>
                        </ul>
                    </div>
                </div>
                <CytoscapeComponent
                    elements={elements}
                    style={{ width: '100%', height: '100%' }}
                    stylesheet={cyStylesheet}
                    layout={{ name: 'breadthfirst', directed: true, spacingFactor: 1.5 }}
                    minZoom={0.5}
                    maxZoom={2}
                    cy={(cy) => {
                        cy.on('tap', 'node', handleNodeClick);
                        cy.on('tap', (e) => {
                            if(e.target === cy) setSelectedNode(null);
                        });
                    }}
                />
            </div>

            {/* Node Info Side Panel */}
            <div className="col-span-1 h-[500px] border border-[#1f1f1f] bg-[#111111] rounded-3xl p-8 overflow-y-auto flex flex-col justify-between">
                {selectedNode ? (
                    <div className="space-y-6">
                        <div className="space-y-2 pb-4 border-b border-[#1f1f1f]">
                            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Inspected Endpoint</div>
                            <h4 className="text-sm font-bold text-white break-all leading-tight font-mono">{selectedNode.label}</h4>
                        </div>

                        <div className="space-y-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex justify-between items-center">
                                Vulnerability Count
                                <span className={`px-2 py-1 rounded text-white font-black ${selectedNode.vuln_count > 0 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-green-500/20 text-green-500'}`}>{selectedNode.vuln_count}</span>
                            </div>
                            
                            {selectedNode.vulns && selectedNode.vulns.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 italic">Detected Anomalies</p>
                                    {selectedNode.vulns.map((v: string, idx: number) => (
                                        <div key={idx} className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-[10px] font-bold text-red-500 flex items-start gap-2 animate-in slide-in-from-right-2">
                                            <ShieldAlert className="w-3.5 h-3.5" />
                                            {v}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedNode.attacks_succeeded && selectedNode.attacks_succeeded.length > 0 && (
                                <div className="space-y-2 pt-4">
                                     <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 italic">Successful Payloads</p>
                                     <div className="flex flex-wrap gap-2">
                                        {selectedNode.attacks_succeeded.map((a: string, i: number) => (
                                            <span key={i} className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded text-[9px] font-black text-indigo-400 uppercase tracking-tighter italic">{a}</span>
                                        ))}
                                     </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-8">
                             <a 
                               href={selectedNode.full_url} 
                               target="_blank" 
                               rel="noreferrer"
                               className="w-full py-3 bg-[#0a0a0a] border border-[#1f1f1f] hover:border-indigo-500/50 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase text-gray-500 hover:text-white"
                             >
                                <ExternalLink className="w-3 h-3" /> Visit Endpoint
                             </a>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 text-center space-y-4 opacity-40">
                        <div className="p-6 bg-black border border-[#1f1f1f] rounded-full">
                            <Search className="w-8 h-8" />
                        </div>
                        <div>
                            <div className="text-xs font-black uppercase tracking-[0.2em] mb-2 leading-relaxed italic">Select Any Topology Node</div>
                            <p className="text-[10px] px-8 tracking-tight font-medium">Map vulnerability clustering and payload execution history along your architecture</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* SECTION 4 — API Endpoints */}
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-[2rem] p-8 space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                    <ExternalLink className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-gray-500 italic">API Discovery Summary</h3>
            </div>
            
            <div className="overflow-hidden rounded-2xl border border-[#1f1f1f] bg-black/40">
                <table className="w-full text-left font-mono">
                    <thead className="bg-[#111111] text-[10px] uppercase font-black tracking-widest text-gray-600 border-b border-[#1f1f1f]">
                        <tr>
                            <th className="px-4 py-4">Endpoint</th>
                            <th className="px-4 py-4">Method</th>
                            <th className="px-4 py-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1f1f] text-[11px] text-gray-400">
                        {data.api_endpoints?.map((api: any, i: number) => (
                            <tr key={i} className="group hover:bg-white/[0.02]">
                                <td className="px-4 py-3 font-bold text-gray-300 group-hover:text-white transition-colors">{api.path}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${api.method === 'POST' ? 'text-blue-400 bg-blue-500/10' : 'text-green-400 bg-green-500/10'}`}>{api.method}</span>
                                </td>
                                <td className="px-4 py-3 font-black text-[10px]">{api.status}</td>
                            </tr>
                        )) || (
                            <tr><td colSpan={3} className="px-4 py-6 text-center italic text-gray-600">No API endpoints discovered</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* SECTION 5 — Subdomains */}
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-[2rem] p-8 space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                    <Network className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-gray-500 italic">Subdomain Enumeration</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
                {(data.subdomains && data.subdomains.length > 0) ? data.subdomains.map((sub: any, i: number) => (
                    <div key={i} className="p-4 bg-black/40 border border-[#1f1f1f] rounded-xl flex items-center justify-between hover:border-emerald-500/20 transition-all">
                        <span className="text-sm font-bold text-gray-300 font-mono italic">{sub}</span>
                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase rounded">Analyzed</span>
                    </div>
                )) : (
                    <div className="p-12 text-center border border-dashed border-gray-800 rounded-3xl space-y-2">
                        <div className="text-lg opacity-20">📡</div>
                        <p className="text-xs font-bold text-gray-600 uppercase tracking-widest italic">No complex subdomain topology found</p>
                    </div>
                )}
            </div>
        </div>

      </div>

    </div>
  );
};

export default AttackSurfaceTab;
