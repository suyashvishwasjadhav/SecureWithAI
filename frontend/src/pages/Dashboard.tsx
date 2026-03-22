import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, Activity, 
  AlertTriangle, CheckCircle2, Clock, Globe, 
  FileCode, ExternalLink, BarChart, Zap, Target, Trash2, Download, StopCircle
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import api, { getDashboard, deleteScan, downloadReport } from '../lib/api';
import Navbar from '../components/Navbar';

const Dashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = () => {
      getDashboard().then(res => {
        setData(res);
        setLoading(false);
      }).catch((err) => {
        console.error("Failed to fetch dashboard data:", err);
        setLoading(false);
      });
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000); // Pulse every 10s
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Confirm termination and deletion of this scan operation?")) return;
    try {
      await deleteScan(id);
      setData((prev: any) => ({
        ...prev,
        recent_scans: prev.recent_scans.filter((s: any) => s.id !== id)
      }));
    } catch (err) {
      alert("Failed to delete scan.");
    }
  };

  const handleDownload = async (id: string) => {
    try {
      await downloadReport(id, 'pdf');
    } catch (err) {
      alert("Failed to download PDF report.");
    }
  };

  const handleAbort = async (id: string) => {
    if (!window.confirm("ARE YOU SURE YOU WANT TO ABORT THIS OPERATION?")) return;
    try {
      await api.post(`/api/scans/${id}/abort`);
      setData((prev: any) => ({
        ...prev,
        recent_scans: prev.recent_scans.map((s: any) => 
          s.id === id ? { ...s, status: 'failed', error_message: 'Aborted by user.' } : s
        )
      }));
    } catch (err) {
      alert("Failed to abort scan.");
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">Loading Intelligence...</p>
        </div>
      </div>
    );
  }

  const chartData = (data?.risk_score_trend || []).map((score: number, i: number) => ({
    name: `Scan ${i+1}`,
    score
  }));

  const stats = [
    { label: 'Total Scans', value: data?.total_scans || 0, icon: Activity, color: 'text-indigo-500' },
    { label: 'Confirmed Vulns', value: data?.total_findings || 0, icon: AlertTriangle, color: 'text-orange-500' },
    { label: 'Avg Risk Score', value: `${data?.avg_risk_score || 0}/100`, icon: BarChart, color: 'text-yellow-500' },
    { label: 'Critical Issues', value: data?.critical_open || 0, icon: Shield, color: 'text-red-500', pulse: (data?.critical_open || 0) > 0 },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-indigo-500/30">
      <Navbar />

      <main className="pt-32 pb-20 px-8 max-w-[1400px] mx-auto space-y-12">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <div key={i} className="bg-[#111111] border border-[#1f1f1f] p-6 rounded-2xl hover:border-indigo-500/30 transition-all group relative overflow-hidden">
               <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 bg-black/40 rounded-lg ${s.color}`}>
                     <s.icon className="w-5 h-5" />
                  </div>
                  {s.pulse && (
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </div>
                  )}
               </div>
               <div>
                  <h4 className="text-3xl font-black mb-1 group-hover:translate-x-1 transition-transform">{s.value}</h4>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{s.label}</p>
               </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Charts Section */}
            <div className="lg:col-span-2 bg-[#111111] border border-[#1f1f1f] rounded-3xl p-8 relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-lg font-bold">Security Posture Trend</h3>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Weighted Risk Score Across Last 10 Scans</p>
                    </div>
                </div>
                
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                            </defs>
                            <Tooltip 
                            contentStyle={{ backgroundColor: '#111111', border: '1px solid #1f1f1f', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff', fontSize: '12px' }}
                            />
                            <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Most Common Box */}
            <div className="lg:col-span-1 bg-[#111111] border border-[#1f1f1f] rounded-3xl p-8 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                        <Target className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tight">Top Threat Vectors</h3>
                </div>
                <div className="space-y-4">
                    {data?.most_common_vulnerabilities?.map((v: any, i: number) => (
                        <div key={i} className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="text-gray-400">{v.type}</span>
                                <span className="text-white">{v.count}</span>
                            </div>
                            <div className="h-1.5 bg-black rounded-full overflow-hidden border border-[#1f1f1f]">
                                <div 
                                    className="h-full bg-orange-500" 
                                    style={{ width: `${(v.count / (data.most_common_vulnerabilities[0]?.count || 1)) * 100}%` }}
                                />
                            </div>
                        </div>
                    )) || <p className="text-gray-600 italic text-sm">No vulnerability data yet.</p>}
                </div>
            </div>
        </div>

        {/* Tools effectiveness */}
        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-3xl p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                        <Zap className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tight">Automated Scanners Effectiveness</h3>
                </div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Confirmed findings vs Total payload hits</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {data?.tool_effectiveness?.map((t: any, i: number) => (
                    <div key={i} className="p-4 bg-black/40 border border-[#1f1f1f] rounded-2xl flex flex-col items-center text-center group hover:border-indigo-500/40 transition-all">
                        <div className="text-xl font-black mb-1 text-indigo-400 group-hover:scale-110 transition-transform">{t.pct}%</div>
                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{t.tool}</div>
                    </div>
                )) || <p className="text-gray-600 text-xs">Waiting for scan data...</p>}
            </div>
        </div>

        {/* Recent Scans Table */}
        <div className="space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                 <Activity className="w-5 h-5 text-indigo-500" /> Recent Operations
              </h3>
              <p className="text-xs font-bold text-gray-500 uppercase">Live Statistics Feed • Auto-refreshing</p>
           </div>

           <div className="bg-[#111111] border border-[#1f1f1f] rounded-3xl overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-[#151515] border-b border-[#1f1f1f] text-[10px] uppercase font-black tracking-[0.2em] text-gray-500">
                       <th className="px-8 py-5">Target Source</th>
                       <th className="px-8 py-5">Scan Level</th>
                       <th className="px-8 py-5">Operational Status</th>
                       <th className="px-8 py-5">Threat Exposure</th>
                       <th className="px-8 py-5">Findings</th>
                       <th className="px-8 py-5">Timeframe</th>
                       <th className="px-8 py-5"></th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-[#1f1f1f]">
                    {data?.recent_scans?.map((scan: any) => (
                       <tr key={scan.id} className="hover:bg-[#1a1a1a] transition-colors group cursor-pointer">
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-4">
                                <div className="p-3 bg-black/40 rounded-xl border border-[#1f1f1f]">
                                   {scan.scan_type === 'url' ? <Globe className="w-4 h-4 text-indigo-400" /> : <FileCode className="w-4 h-4 text-green-400" />}
                                </div>
                                <div className="flex flex-col">
                                   <span className="font-bold text-sm truncate max-w-[200px]">{scan.target}</span>
                                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">{scan.scan_type} Scan</span>
                                </div>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md text-[9px] font-black uppercase tracking-widest">
                                {scan.intensity || 'ZIP'}
                             </span>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-2">
                                {scan.status === 'running' ? (
                                   <div className="flex items-center gap-2 text-indigo-400">
                                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-lg shadow-indigo-500/50"></div>
                                      <span className="text-[10px] font-black uppercase tracking-widest">Active</span>
                                   </div>
                                ) : scan.status === 'complete' ? (
                                   <div className="flex items-center gap-2 text-green-500">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Verified</span>
                                   </div>
                                ) : (
                                   <div className="flex items-center gap-2 text-red-500">
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Failed</span>
                                   </div>
                                )}
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <div className="w-32 bg-black/40 h-1.5 rounded-full overflow-hidden border border-[#1f1f1f]">
                                <div 
                                  className={`h-full transition-all duration-1000 ${
                                    (scan.risk_score || 0) < 30 ? 'bg-red-500' :
                                    (scan.risk_score || 0) < 60 ? 'bg-orange-500' :
                                    (scan.risk_score || 0) < 80 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${scan.risk_score || 0}%` }}
                                ></div>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex gap-3">
                                {scan.critical_count > 0 && <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter" title="Critical Findings">{scan.critical_count} CR</span>}
                                {scan.high_count > 0 && <span className="text-[10px] font-black text-orange-500 uppercase tracking-tighter" title="High Findings">{scan.high_count} HI</span>}
                                {scan.medium_count > 0 && <span className="text-[10px] font-black text-yellow-500 uppercase tracking-tighter" title="Medium Findings">{scan.medium_count} MD</span>}
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5">
                                <Clock className="w-3 h-3" /> {new Date(scan.created_at).toLocaleDateString()}
                             </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                             <div className="flex items-center justify-end gap-2">
                               {scan.status === 'complete' && (
                                 <button onClick={(e) => { e.stopPropagation(); handleDownload(scan.id); }} className="p-2 hover:bg-green-600/20 hover:text-green-500 rounded-lg transition-all text-gray-500" title="Download PDF Report">
                                    <Download className="w-4 h-4" />
                                 </button>
                               )}
                               {(scan.status === 'running' || scan.status === 'queued') && (
                                 <button onClick={(e) => { e.stopPropagation(); handleAbort(scan.id); }} className="p-2 hover:bg-red-600/20 hover:text-red-500 rounded-lg transition-all text-gray-500" title="Abort Operation">
                                    <StopCircle className="w-4 h-4" />
                                 </button>
                               )}
                               <button onClick={(e) => { e.stopPropagation(); handleDelete(scan.id); }} className="p-2 hover:bg-red-600/20 hover:text-red-500 rounded-lg transition-all text-gray-500" title="Delete Scan">
                                  <Trash2 className="w-4 h-4" />
                               </button>
                               <Link to={scan.scan_type === 'github' && scan.status === 'running' && scan.session_id ? `/ide/${scan.session_id}` : `/scan/${scan.id}`} title="View Details">
                                  <button className="p-2 hover:bg-indigo-600 hover:text-white rounded-lg transition-all text-gray-400">
                                     <ExternalLink className="w-4 h-4" />
                                  </button>
                               </Link>
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
              {(!data?.recent_scans || data.recent_scans.length === 0) && (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                   <Shield className="w-20 h-20 text-gray-800 mb-6 animate-pulse" />
                   <h3 className="text-2xl font-black uppercase tracking-tight">No Shield Operations</h3>
                   <p className="text-gray-600 max-w-xs mt-2 text-sm">Deploy your first security scan and watch the data flow in real-time.</p>
                </div>
              )}
           </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
