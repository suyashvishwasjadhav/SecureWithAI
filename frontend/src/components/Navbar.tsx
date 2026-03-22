import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Plus, User, LogOut, ChevronDown } from 'lucide-react';
import { handleLogout } from '../lib/auth';

const Navbar: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('ss_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user", e);
            }
        }
    }, []);

    return (
        <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#1f1f1f] px-8 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group cursor-pointer">
                <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
                    <Shield className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-black uppercase tracking-tighter">Shield<span className="text-indigo-500">Sentinel</span></span>
            </Link>
            
            <div className="flex items-center gap-6">
                <div className="hidden md:flex items-center gap-4">
                    <Link to="/scan/00000000-0000-0000-0000-000000000001">
                        <button className="flex items-center gap-2 px-6 py-2.5 bg-transparent border border-[#333] hover:border-indigo-500/50 hover:bg-indigo-500/10 text-gray-300 rounded-xl font-bold transition-all active:scale-95 text-xs uppercase tracking-widest">
                            🎮 Demo
                        </button>
                    </Link>
                    <Link to="/scan">
                        <button className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 text-xs uppercase tracking-widest">
                            <Plus className="w-4 h-4" /> New Scan
                        </button>
                    </Link>
                </div>

                <div className="h-8 w-px bg-[#1f1f1f] hidden md:block" />

                {user ? (
                    <div className="relative">
                        <button 
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center gap-3 p-1 rounded-xl hover:bg-white/5 transition-all group"
                        >
                            <div className="w-9 h-9 rounded-lg border border-indigo-500/30 overflow-hidden bg-indigo-500/10 flex items-center justify-center">
                                {user.avatar_url ? (
                                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-5 h-5 text-indigo-400" />
                                )}
                            </div>
                            <div className="hidden lg:flex flex-col items-start gap-0.5 pr-2">
                                <span className="text-sm font-bold text-white leading-none capitalize">{user.full_name?.split(' ')[0]}</span>
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">{user.plan || 'Free'} Plan</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown */}
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-3 w-64 bg-[#111] border border-[#1f1f1f] rounded-2xl shadow-2xl py-3 z-50 overflow-hidden">
                                <div className="px-5 py-4 border-b border-[#1f1f1f] mb-2 bg-black/20">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Authenticated as</p>
                                    <p className="text-sm font-bold text-white truncate">{user.email}</p>
                                </div>
                                <a 
                                    href="http://localhost:4000" 
                                    className="flex items-center gap-3 px-5 py-3 text-sm text-gray-400 hover:text-white hover:bg-indigo-600 group transition-all"
                                >
                                    <Shield className="w-4 h-4" />
                                    Marketing Home
                                </a>
                                <div className="h-px bg-[#1f1f1f] my-2 mx-3" />
                                <button 
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-500 hover:bg-red-500 hover:text-white transition-all group"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out Trace
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <a href="http://localhost:4000/login">
                        <button className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 text-xs uppercase tracking-widest">
                            Sign In
                        </button>
                    </a>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
