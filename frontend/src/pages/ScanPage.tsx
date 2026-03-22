import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Globe, Upload, ArrowLeft, CheckCircle } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { startUrlScan, startZipScan, startCombinedScan } from '../lib/api';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function ScanPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'url' | 'zip' | 'github'>('url');
  const [url, setUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [githubError, setGithubError] = useState('');
  const [intensity, setIntensity] = useState<'quick' | 'standard' | 'deep'>('standard');
  const [confirmed, setConfirmed] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [fileError, setFileError] = useState('');

  const validateUrl = (val: string) => {
    setUrl(val);
    if (!val) {
      setUrlError('');
      return;
    }
    if (!val.startsWith('http://') && !val.startsWith('https://')) {
      setUrlError('Must start with https:// or http://');
      return;
    }
    const privateIpRegex = /^(https?:\/\/)(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.|localhost)/;
    if (privateIpRegex.test(val)) {
      setUrlError('Private/local IPs are not allowed');
      return;
    }
    setUrlError('');
  };

  const validateGithubUrl = (val: string) => {
    setGithubUrl(val);
    if (!val) {
      setGithubError('');
      return;
    }
    if (!val.startsWith('https://github.com/')) {
      setGithubError('Must be a public https://github.com/ URL');
      return;
    }
    setGithubError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    if (!selected.name.endsWith('.zip')) {
      setFileError('Only .zip files are accepted');
      setFile(null);
      return;
    }
    if (selected.size > 50 * 1024 * 1024) {
      setFileError('File too large. Maximum 50MB');
      setFile(null);
      return;
    }
    setFileError('');
    setFile(selected);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const selected = e.dataTransfer.files?.[0];
    if (!selected) return;
    
    if (!selected.name.endsWith('.zip')) {
      setFileError('Only .zip files are accepted');
      setFile(null);
      return;
    }
    if (selected.size > 50 * 1024 * 1024) {
      setFileError('File too large. Maximum 50MB');
      setFile(null);
      return;
    }
    setFileError('');
    setFile(selected);
  };

  const handleStartScan = async () => {
    try {
      setLoading(true);
      
      if (tab === 'github') {
        if (!githubUrl || githubError) return;
        const res = await api.post('/api/ide/clone', { repo_url: githubUrl });
        toast.success('Cloning repository...');
        navigate(`/ide/${res.data.session_id}`);
        return;
      }
      
      let res;
      if (isDemo) {
        const { startDemoScan } = await import('../lib/api');
        res = await startDemoScan();
      } else if (tab === 'url') {
        if (!url || urlError) return;
        if (file) {
           res = await startCombinedScan(url, file, intensity);
        } else {
           res = await startUrlScan(url, intensity);
        }
      } else {
        if (!file || fileError) return;
        res = await startZipScan(file);
      }
      toast.success(isDemo ? 'Demo simulation started!' : 'Scan started! Redirecting...');
      navigate(`/scan/${res.scan_id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.error || err.response?.data?.error || 'Failed to start scan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white p-4">
      <div className="max-w-2xl mx-auto mt-12">
        <Link to="/" className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>
        
        <Card className="p-8">
          <h1 className="text-2xl font-semibold mb-2 tracking-tight">New Security Scan</h1>
          <p className="text-gray-400 mb-8">Analyze URLs for live vulnerabilities or upload source code for static analysis</p>

          <div className="flex border-b border-border mb-8">
            <button
              className={`flex-1 pb-4 text-center font-medium transition-colors ${tab === 'url' ? 'border-b-2 border-accent text-white' : 'text-gray-500 hover:text-gray-300'}`}
              onClick={() => setTab('url')}
            >
              🌐 Scan URL
            </button>
            <button
              className={`flex-1 pb-4 text-center font-medium transition-colors ${tab === 'zip' ? 'border-b-2 border-accent text-white' : 'text-gray-500 hover:text-gray-300'}`}
              onClick={() => setTab('zip')}
            >
              📁 Analyze Code
            </button>
            <button
              className={`flex-1 pb-4 text-center font-medium transition-colors ${tab === 'github' ? 'border-b-2 border-accent text-white' : 'text-gray-500 hover:text-gray-300'}`}
              onClick={() => setTab('github')}
            >
              🐙 GitHub Repo
            </button>
          </div>

          {tab === 'url' ? (
            <div className="space-y-6">
              <div>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => validateUrl(e.target.value)}
                    className={`w-full bg-[#161616] border ${urlError.includes('Private') ? 'border-orange-500 focus:ring-orange-500' : urlError ? 'border-red-500 focus:ring-red-500' : 'border-[#2a2a2a] focus:ring-accent'} rounded-lg pl-10 pr-4 py-3 outline-none focus:ring-1 transition-all`}
                  />
                </div>
                {urlError && <p className={`mt-2 text-sm ${urlError.includes('Private') ? 'text-orange-400' : 'text-red-400'}`}>{urlError}</p>}
              </div>

              <div>
                <p className="mb-3 font-medium text-sm text-gray-300">Scan Intensity</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'quick', icon: '⚡', label: 'Quick', desc: '~5 minutes', check: 'Basic checks' },
                    { id: 'standard', icon: '🎯', label: 'Standard', desc: '~15 minutes', check: 'Full scan' },
                    { id: 'deep', icon: '🔬', label: 'Deep', desc: '~30 minutes', check: 'All attacks' },
                  ].map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => setIntensity(inv.id as any)}
                      className={`cursor-pointer rounded-xl border p-3 transition-colors ${intensity === inv.id ? 'border-accent bg-accent/10' : 'border-[#2a2a2a] hover:border-gray-600 bg-[#161616]'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span>{inv.icon}</span>
                        <span className="font-medium">{inv.label}</span>
                      </div>
                      <p className="text-xs text-gray-400 mb-1">{inv.desc}</p>
                      <p className="text-xs text-gray-500">{inv.check}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#1f1f1f]">
                <details className="group">
                  <summary className="flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-400 hover:text-white transition-colors">
                     <span className="text-accent">▶</span> 📁 Also upload source code for enhanced analysis (optional)
                  </summary>
                  <div className="mt-4 border-2 border-dashed border-[#2a2a2a] hover:border-accent hover:bg-accent/5 rounded-xl p-6 transition-colors flex flex-col items-center justify-center cursor-pointer relative group-open:block">
                     <input 
                       type="file" 
                       accept=".zip" 
                       className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                       onChange={handleFileChange}
                     />
                     {!file ? (
                       <>
                         <Upload className="w-6 h-6 text-gray-500 mb-2" />
                         <p className="text-sm font-medium mb-1">Drop your frontend/backend .zip file here</p>
                       </>
                     ) : (
                       <>
                         <CheckCircle className="w-6 h-6 text-green-500 mb-2" />
                         <p className="font-medium text-green-400 mb-1">{file.name}</p>
                         <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                       </>
                     )}
                  </div>
                  {fileError && <p className="mt-2 text-red-400 text-sm">{fileError}</p>}
                </details>
              </div>
            </div>
          ) : tab === 'zip' ? (
            <div className="space-y-6">
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-[#2a2a2a] hover:border-accent hover:bg-accent/5 rounded-xl p-8 transition-colors flex flex-col items-center justify-center cursor-pointer relative"
              >
                <input 
                  type="file" 
                  accept=".zip" 
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                  onChange={handleFileChange}
                />
                {!file ? (
                  <>
                    <Upload className="w-8 h-8 text-gray-500 mb-3" />
                    <p className="font-medium mb-1">Drop your .zip file here</p>
                    <p className="text-sm text-gray-500">or click to browse • .zip files only • max 50MB</p>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-8 h-8 text-green-500 mb-3" />
                    <p className="font-medium text-green-400 mb-1">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </>
                )}
              </div>
              {fileError && <p className="text-red-400 text-sm">{fileError}</p>}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border border-[#2a2a2a] bg-[#161616] rounded-xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 relative z-10"><span className="text-2xl">🐙</span> Import from GitHub</h3>
                <ul className="text-sm text-gray-400 space-y-2 mb-8 relative z-10">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500"/> Clones the repo securely</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500"/> Opens in full IDE view</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500"/> Deep SAST scan on all files</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500"/> Click any vulnerability to see code</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500"/> AI fixes inline in the editor</li>
                </ul>

                <div className="relative z-10">
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="https://github.com/owner/repo"
                      value={githubUrl}
                      onChange={(e) => validateGithubUrl(e.target.value)}
                      className={`w-full bg-[#0a0a0a] border ${githubError ? 'border-red-500 focus:ring-red-500' : 'border-[#2a2a2a] focus:ring-accent'} rounded-lg pl-10 pr-4 py-3 outline-none focus:ring-1 transition-all text-white placeholder-gray-600 font-mono text-sm`}
                    />
                  </div>
                  {githubError && <p className="mt-2 text-sm text-red-400">{githubError}</p>}
                  <p className="mt-3 text-xs text-gray-500 uppercase font-black tracking-widest">Supported: Public GitHub repos only</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-center justify-between p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl mb-6 group hover:bg-indigo-500/10 transition-all">
               <div className="flex items-center gap-3">
                  <span className="text-xl">🛠️</span>
                  <div>
                    <p className="text-xs font-black uppercase text-indigo-400 tracking-widest">Demo / Simulation Mode</p>
                    <p className="text-[10px] text-gray-500 italic">No live traffic. Generates high-quality mock findings.</p>
                  </div>
               </div>
               <button 
                 onClick={() => setIsDemo(!isDemo)}
                 className={`w-12 h-6 rounded-full transition-all relative ${isDemo ? 'bg-indigo-500' : 'bg-gray-700'}`}
               >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isDemo ? 'left-7' : 'left-1'}`} />
               </button>
            </div>

            <label className="flex items-start gap-3 cursor-pointer group mb-6">
              <div className="relative flex items-center mt-0.5">
                <input
                  type="checkbox"
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-600 bg-transparent checked:border-accent checked:bg-accent transition-all"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <svg
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                I confirm I own this target or have explicit written permission to scan it
              </span>
            </label>

            <Button
              className="w-full h-12 text-lg"
              onClick={handleStartScan}
              disabled={!confirmed || (tab === 'url' ? (!url || !!urlError) : tab === 'zip' ? (!file || !!fileError) : (!githubUrl || !!githubError))}
              isLoading={loading}
            >
              {loading ? "Initiating..." : (tab === 'url' ? "🚀 Start Security Scan" : tab === 'zip' ? "🔍 Analyze Code" : "🐙 Import Repository →")}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
