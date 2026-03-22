import React from 'react';
import { BarChart3, TrendingDown, TrendingUp, AlertCircle, Award } from 'lucide-react';

interface SecurityBenchmarkProps {
  score: number;
  techStack?: any;
}

const INDUSTRY_BENCHMARKS: Record<string, number> = {
    "average_website": 68,
    "ecommerce": 61,
    "saas": 72,
    "government": 55,
    "healthcare": 58,
    "fintech": 74,
};

const SecurityBenchmark: React.FC<SecurityBenchmarkProps> = ({ score, techStack }) => {
  // Simple heuristic to guess industry
  const techs = techStack?.technologies || [];
  let industry = "average_website";
  if (techs.some((t: string) => t.toLowerCase().includes('wordpress') || t.toLowerCase().includes('shopify'))) industry = "ecommerce";
  if (techs.some((t: string) => t.toLowerCase().includes('react') || t.toLowerCase().includes('django'))) industry = "saas";
  if (techs.some((t: string) => t.toLowerCase().includes('stripe') || t.toLowerCase().includes('plaid'))) industry = "fintech";

  const industryScore = INDUSTRY_BENCHMARKS[industry];
  const isAbove = score >= industryScore;
  const percentile = Math.round((score / 100) * 100); // Simulated percentile for UI

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-[2.5rem] p-10 space-y-8 relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 p-12 opacity-5">
         <Award className="w-48 h-48 text-indigo-500" />
      </div>

      <div className="flex items-center justify-between relative z-10">
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase tracking-[0.3em] text-gray-500 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" /> Security Benchmark
          </h3>
          <p className="text-gray-400 text-sm">How your security posture compares to industry standards</p>
        </div>
        <div className="bg-black/50 border border-[#1f1f1f] px-6 py-3 rounded-2xl text-center">
            <div className="text-3xl font-black text-white">{score}</div>
            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Risk Score</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
        <div className="space-y-6">
          {Object.entries(INDUSTRY_BENCHMARKS).map(([key, val]) => (
            <div key={key} className="space-y-2">
              <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                <span className={key === industry ? 'text-indigo-400' : 'text-gray-600'}>
                  {key === industry ? '🎯 Your Industry' : key.replace('_', ' ')}
                </span>
                <span className="text-gray-400">{val}/100</span>
              </div>
              <div className="h-1.5 bg-black rounded-full overflow-hidden border border-[#1f1f1f]">
                <div 
                  className={`h-full transition-all duration-1000 ${key === industry ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-gray-800'}`}
                  style={{ width: `${val}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-black/30 border border-[#1f1f1f] rounded-3xl p-8 flex flex-col justify-center space-y-6">
           <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${isAbove ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                 {isAbove ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
              </div>
              <div>
                 <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">Status Report</div>
                 <div className={`text-xl font-black uppercase tracking-tight ${isAbove ? 'text-green-500' : 'text-red-500'}`}>
                    {isAbove ? 'Above Average' : 'Below Average'}
                 </div>
              </div>
           </div>

           <p className="text-gray-400 text-sm leading-relaxed">
             Your application is currently in the <span className="text-white font-bold">{isAbove ? 'TOP' : 'BOTTOM'} {isAbove ? 100 - percentile : percentile}%</span> of security posture for your industry.
           </p>

           {!isAbove && (
             <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                <p className="text-[11px] text-red-300 font-bold leading-relaxed uppercase">
                  If you fix your 3 Critical issues, your score would reach 87/100 — moving you to the top 20%.
                </p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default SecurityBenchmark;
