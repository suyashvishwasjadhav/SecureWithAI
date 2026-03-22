import { motion } from 'framer-motion';
import GlowCard from './ui/GlowCard';
import Badge from './ui/Badge';

type ToolCategory = 'DAST' | 'SAST' | 'SECRET' | 'NETWORK';

const tools: { name: string; desc: string; category: ToolCategory }[] = [
  { name: 'OWASP ZAP', desc: 'Industry-standard dynamic analysis.', category: 'DAST' },
  { name: 'Nuclei', desc: 'Template-based vulnerability scanner.', category: 'DAST' },
  { name: 'FFUF', desc: 'High-speed web fuzzer.', category: 'DAST' },
  { name: 'Nikto', desc: 'Web server vulnerability scanner.', category: 'DAST' },
  { name: 'Nmap', desc: 'Network discovery and service mapping.', category: 'NETWORK' },
  { name: 'SQLMap', desc: 'Automatic SQL injection exploit tool.', category: 'DAST' },
  { name: 'XSStrike', desc: 'Advanced XSS detection and analysis.', category: 'DAST' },
  { name: 'Commix', desc: 'OS command injection scanner.', category: 'DAST' },
  { name: 'Semgrep', desc: 'Source code analysis (SAST) engine.', category: 'SAST' },
  { name: 'Gitleaks', desc: 'Secret detection in source code.', category: 'SECRET' },
  { name: 'Bandit', desc: 'Python code security analysis.', category: 'SAST' },
  { name: 'Trivy', desc: 'Container image vulnerability scan.', category: 'SAST' },
  { name: 'TruffleHog', desc: 'Exposed secret detector for repos.', category: 'SECRET' },
  { name: 'SSLyze', desc: 'SSL/TLS configuration analysis.', category: 'NETWORK' },
  { name: 'jwt_tool', desc: 'JSON Web Token security testing.', category: 'DAST' },
];

const categoryColors: Record<ToolCategory, string> = {
  DAST: 'bg-danger/10 text-danger border-danger/20',
  SAST: 'bg-accent/10 text-accent border-accent/20',
  SECRET: 'bg-warning/10 text-warning border-warning/20',
  NETWORK: 'bg-success/10 text-success border-success/20',
};

const ToolGrid = () => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {tools.map((tool, i) => (
                <GlowCard 
                    key={tool.name} 
                    className="p-6 flex flex-col items-start gap-6 group hover:translate-y-[-4px] transition-all duration-300 border-white/5 bg-white/[0.02]"
                >
                    <div className="flex justify-between w-full items-center">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center font-head font-bold text-accent group-hover:scale-110 transition-transform">
                            {tool.name[0]}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${categoryColors[tool.category]}`}>
                            {tool.category}
                        </span>
                    </div>
                    <div>
                        <h4 className="text-white font-head font-bold text-base mb-1">{tool.name}</h4>
                        <p className="text-muted text-[12px] leading-relaxed line-clamp-2">
                        {tool.desc}
                        </p>
                    </div>
                </GlowCard>
            ))}
        </div>
    );
};

export default ToolGrid;
