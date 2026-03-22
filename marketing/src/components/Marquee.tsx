import { motion } from 'framer-motion';

const logos = [
  'OWASP ZAP', 'Nuclei', 'Semgrep', 'Gitleaks', 'Trivy', 
  'SQLMap', 'XSStrike', 'Bandit', 'Nmap', 'Nikto',
  'ModSecurity', 'AWS WAF', 'Cloudflare', 'Postman'
];

const Marquee = () => {
  return (
    <div className="relative w-full overflow-hidden flex flex-col items-center">
      <div className="flex gap-16 py-12 whitespace-nowrap overflow-hidden select-none">
        <motion.div
           animate={{ x: [0, -1000] }}
           transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
           className="flex gap-16 shrink-0"
        >
          {logos.concat(logos).map((logo, i) => (
            <span 
              key={`${logo}-${i}`} 
              className="text-2xl font-head font-extrabold text-[#4a4a6a] hover:text-accent transition-colors duration-300 cursor-default uppercase tracking-wider"
            >
              {logo}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Layer to fade edges */}
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-bg to-transparent pointer-events-none z-10" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-bg to-transparent pointer-events-none z-10" />
    </div>
  );
};

export default Marquee;
