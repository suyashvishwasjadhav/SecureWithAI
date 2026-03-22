import { motion } from 'framer-motion';
import { Shield, Zap, Lock, Globe, Terminal, Cpu, ArrowRight, Play, CheckCircle2, ChevronRight, Activity, Radar, Bot, Github, Twitter, Linkedin, Star, MousePointer2, MessageSquare, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import GlowCard from '../components/ui/GlowCard';
import SectionLabel from '../components/ui/SectionLabel';
import TypewriterText from '../components/ui/TypewriterText';
import AnimatedCounter from '../components/ui/AnimatedCounter';
import ThreatVisualization from '../components/ThreatVisualization';
import ScannerMockup from '../components/ScannerMockup';
import Marquee from '../components/Marquee';
import ContactForm from '../components/ContactForm';
import ScrollReveal from '../components/ScrollReveal';
import MagneticButton from '../components/MagneticButton';

const Home = () => {
  return (
    <div className="relative isolate overflow-hidden">
      {/* BACKGROUND LAYER STACK */}
      <div className="fixed inset-0 grid-bg -z-10 opacity-30 mask-radial pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1000px] spotlight -z-10 pointer-events-none" />
      <ThreatVisualization />

      {/* PART A: HERO SECTION */}
      <section className="relative min-h-screen flex flex-col items-center justify-start pt-40 px-6 sm:px-12 pb-32">
        <div className="max-w-[900px] w-full text-center flex flex-col items-center z-10">
          <ScrollReveal delay={0}>
             <div className="inline-flex items-center gap-2 px-4 py-2 mb-12 rounded-full glass border-border-hover shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                <span className="text-accent">✦</span>
                <span className="text-xs font-head font-bold text-white uppercase tracking-[0.2em] px-2 border-r border-border leading-none leading-none">Live</span>
                <span className="text-xs font-semibold text-muted uppercase tracking-widest pl-1">Now scanning 50,000+ endpoints</span>
             </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
             <h1 className="text-6xl sm:text-7xl lg:text-8xl font-head font-extrabold mb-8 max-w-5xl mx-auto leading-[0.9] tracking-tighter flex flex-wrap justify-center gap-x-[0.2em] gap-y-2 px-4">
                {"Find vulnerabilities before attackers do.".split(" ").map((word, i) => (
                   <span key={i} className={word === "attackers" || word === "do." ? "gradient-text" : "text-white"}>
                      {word}
                   </span>
                ))}
             </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
             <p className="text-muted text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
                ShieldSentinel scans your URLs and source code for vulnerabilities. 
                Get AI-powered fixes, WAF rules, and compliance reports — all in one platform.
             </p>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
             <div className="mb-12 flex items-center justify-center gap-2 font-mono">
                <span className="text-dim text-sm uppercase tracking-widest">Detecting:</span>
                <TypewriterText 
                    words={['SQL Injection attacks', 'XSS vulnerabilities', 'Exposed API endpoints', 'Hardcoded secrets', 'Path traversal exploits']} 
                    className="text-accent font-bold"
                />
             </div>
          </ScrollReveal>

          <ScrollReveal delay={0.4}>
             <div className="flex flex-col items-center gap-6 w-full">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                   <MagneticButton strength={0.4}>
                      <Link to="/signup">
                         <Button size="lg" className="px-12 py-5 text-base" icon={ArrowRight}>
                            Get Started Free
                         </Button>
                      </Link>
                   </MagneticButton>
                   <MagneticButton strength={0.3}>
                      <Button variant="secondary" size="lg" className="px-12 py-5 text-base border-accent/20 hover:border-accent/40" icon={Play} iconPosition="left">
                         Watch Demo
                      </Button>
                   </MagneticButton>
                </div>
                <p className="text-dim text-xs font-medium tracking-wide">
                   No credit card required <span className="mx-2 opacity-50">•</span> Free forever plan
                </p>
             </div>
          </ScrollReveal>

          <ScrollReveal delay={1} y={10}>
             <div className="absolute bottom-12 flex flex-col items-center gap-3 select-none">
                <div className="flex flex-col items-center gap-2">
                   <motion.div
                     animate={{ y: [0, 8, 0] }}
                     transition={{ duration: 1.5, repeat: Infinity }}
                     className="w-6 h-10 border-2 border-muted rounded-full flex justify-center p-1"
                   >
                     <div className="w-1 h-2 bg-accent rounded-full" />
                   </motion.div>
                   <span className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] font-head">Scroll to explore</span>
                </div>
             </div>
          </ScrollReveal>
        </div>
      </section>

      {/* PART B: LIVE DEMO PREVIEW SECTION */}
      <section className="relative py-24 sm:py-32 bg-surface/30 border-y border-border isolate overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-10 -z-10" />
        <div className="max-w-[1280px] mx-auto px-6 w-full">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <ScrollReveal x={-40} delay={0.1}>
                 <ScannerMockup />
              </ScrollReveal>

              <div className="flex flex-col gap-12">
                 <ScrollReveal delay={0.2}>
                    <div className="space-y-4">
                       <SectionLabel>Live Execution</SectionLabel>
                       <h2 className="text-4xl sm:text-6xl font-head font-bold text-white tracking-tighter">
                          Full-fidelity security <br /> for modern fleets.
                       </h2>
                       <p className="text-muted text-lg max-w-xl">
                          Our scan engine integrates world-class intelligence with AI-remediation 
                          to give you exact, tested code fixes instead of just descriptions.
                       </p>
                    </div>
                 </ScrollReveal>

                 <div className="flex flex-col gap-6">
                    {[
                      'Real ZAP + Nuclei attack simulation',
                      'AI-generated code fixes in 30 seconds',
                      'WAF rules for ModSecurity, AWS, Cloudflare',
                      'Compliance: OWASP, PCI-DSS, HIPAA, GDPR',
                      'Download PDF report instantly'
                    ].map((point, i) => (
                      <ScrollReveal key={point} delay={0.3 + i * 0.1}>
                         <div className="flex items-center gap-4 group">
                            <div className="p-1 rounded-full bg-accent/10 border border-accent/20 group-hover:border-accent/40 transition-colors">
                               <CheckCircle2 className="w-4 h-4 text-accent" />
                            </div>
                            <span className="text-muted group-hover:text-white transition-colors">{point}</span>
                         </div>
                      </ScrollReveal>
                    ))}
                 </div>
                 
                 <ScrollReveal delay={0.8}>
                    <MagneticButton strength={0.2}>
                       <Button variant="secondary" className="w-fit" icon={ArrowRight}>
                          Learn system architecture
                       </Button>
                    </MagneticButton>
                 </ScrollReveal>
              </div>
           </div>
        </div>
      </section>

      {/* PART C: STATS SECTION */}
      <section className="py-24 bg-surface border-b border-border relative overflow-hidden">
         <div className="max-w-[1280px] mx-auto px-6 w-full">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 text-center md:text-left">
               {[
                 { value: 50000, label: 'Endpoints Scanned', suffix: '+' },
                 { value: 235, label: 'Vulns Detected', suffix: '' },
                 { value: 4, label: 'Avg Scan Time', suffix: ' sec' },
                 { value: 10, label: 'Tools Integrated', suffix: '+' },
               ].map((stat, i) => (
                 <ScrollReveal key={stat.label} delay={i * 0.1}>
                    <div className="flex flex-col items-center md:items-start">
                       <AnimatedCounter 
                          value={stat.value} 
                          suffix={stat.suffix}
                          className="text-6xl sm:text-8xl font-head font-bold text-accent glow-text tracking-tight"
                       />
                       <span className="text-xs font-bold text-dim uppercase tracking-[0.3em] mt-4 ml-1">
                         {stat.label}
                       </span>
                    </div>
                 </ScrollReveal>
               ))}
            </div>
         </div>
      </section>

      <section className="py-24 sm:py-32" id="features">
         <div className="max-w-[1280px] mx-auto px-6 w-full">
            <ScrollReveal className="flex flex-col items-center text-center mb-24">
               <SectionLabel>Features</SectionLabel>
               <h2 className="text-4xl sm:text-6xl font-head font-bold text-white mb-6 tracking-tighter">Everything you need to <br /> secure your applications.</h2>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
               <ScrollReveal className="md:col-span-2 md:row-span-2" delay={0.1}>
                  <GlowCard className="h-full flex flex-col justify-between overflow-hidden group">
                     <div className="flex flex-col gap-6">
                        <h3 className="text-3xl font-head font-bold text-white tracking-tight">DAST Scanning</h3>
                        <p className="text-muted text-lg max-w-md">Real-world attack simulations identifying zero-day threats in real-time.</p>
                     </div>
                     <div className="mt-8 flex flex-col gap-6">
                         <div className="relative h-24 bg-bg rounded-xl border border-border flex items-center justify-around px-8 overflow-hidden">
                            <div className="absolute inset-0 grid-bg opacity-5" />
                            <div className="p-2 rounded-lg bg-surface border border-border z-10 text-xs">Target</div>
                            <motion.div animate={{ x: [0, 100, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-accent"><span className="h-px w-20 bg-accent/40 block relative"><span className="absolute -top-1 right-0 w-2 h-2 rounded-full bg-accent animate-ping" /></span></motion.div>
                            <div className="p-2 rounded-lg bg-surface border border-accent/40 z-10 text-accent text-xs">ZAP Core</div>
                         </div>
                         <div className="flex flex-wrap gap-3">
                            <Badge variant="pro">ZAP + Nuclei</Badge>
                            <Badge variant="new">FFUF v2</Badge>
                         </div>
                     </div>
                  </GlowCard>
               </ScrollReveal>

               {[
                  { icon: Bot, title: "AI Code Fix", desc: "Get exact secure code fixes generated specifically for your vulnerability context.", badge: "new", badgeText: "Proprietary LLM" },
                  { icon: Shield, title: "WAF Rules", desc: "Auto-generated protections for ModSecurity, AWS WAF, and Cloudflare Edge.", badge: "beta", badgeText: "Universal Export" },
                  { icon: Lock, title: "Compliance", desc: "Ready-to-audit compliance scores for OWASP, PCI-DSS, and HIPAA.", badge: "free", badgeText: "Audit Ready" },
                  { icon: Terminal, title: "PDF Reports", desc: "High-fidelity, boardroom-ready reports with AI executive summaries.", badge: "pro", badgeText: "Whitelabel" }
               ].map((feat, i) => (
                  <ScrollReveal key={feat.title} delay={0.2 + i * 0.1}>
                     <GlowCard className="group flex flex-col gap-6 h-full">
                        <feat.icon className="w-8 h-8 text-accent group-hover:scale-110 transition-transform" />
                        <div>
                          <h4 className="text-xl font-head font-bold text-white mb-2">{feat.title}</h4>
                          <p className="text-muted text-xs leading-relaxed">{feat.desc}</p>
                        </div>
                        <Badge variant={feat.badge as any} className="mt-auto w-fit">{feat.badgeText}</Badge>
                     </GlowCard>
                  </ScrollReveal>
               ))}

               <ScrollReveal className="md:col-span-2" delay={0.6}>
                  <GlowCard className="group flex flex-col md:flex-row gap-8 items-center bg-accent/[0.03] border-accent/20 h-full">
                      <div className="flex-1 space-y-4">
                         <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 w-fit">
                            <MessageSquare className="w-8 h-8 text-accent" />
                         </div>
                         <h4 className="text-2xl font-head font-bold text-white">Security AI Chatbot</h4>
                         <p className="text-muted text-sm">Ask about scan results in plain English. Get advice instantly.</p>
                         <MagneticButton strength={0.2}>
                            <Button variant="secondary" size="sm" className="bg-bg/40">Open Console Chat</Button>
                         </MagneticButton>
                      </div>
                      <div className="w-full md:w-1/3 flex flex-col gap-3">
                         <div className="p-3 rounded-lg glass text-[10px] text-muted italic">"How do I fix this XSS?"</div>
                         <div className="p-3 rounded-lg glass text-[10px] text-accent font-bold border-accent/20">"Add CSP headers..."</div>
                      </div>
                  </GlowCard>
               </ScrollReveal>

               <ScrollReveal delay={0.7}>
                  <GlowCard className="group flex flex-col gap-6 h-full">
                     <Cpu className="w-8 h-8 text-accent group-hover:scale-110 transition-transform" />
                     <div>
                       <h4 className="text-xl font-head font-bold text-white mb-2">SAST Analysis</h4>
                       <p className="text-muted text-xs">Static source code scanning using Semgrep and Gitleaks.</p>
                     </div>
                     <Badge variant="new" className="mt-auto w-fit">Deep AST</Badge>
                  </GlowCard>
               </ScrollReveal>
            </div>
         </div>
      </section>

      {/* PART E: HOW IT WORKS SECTION */}
      <section className="py-24 sm:py-32 relative bg-surface/20 border-y border-border isolate">
         <ScrollReveal className="max-w-[1280px] mx-auto px-6 w-full text-center mb-24">
            <SectionLabel>Process</SectionLabel>
            <h2 className="text-4xl sm:text-6xl font-head font-bold text-white tracking-tighter">From target to report <br /> in minutes.</h2>
         </ScrollReveal>
         
         <div className="max-w-[1280px] mx-auto px-6 w-full relative">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
               {[
                 { step: 1, name: 'Input', desc: 'Paste a URL or upload a ZIP. No configuration required.', icon: Globe },
                 { step: 2, name: 'Attack', desc: 'Real tools fire real payloads. SQLMap and ZAP work together.', icon: Zap },
                 { step: 3, name: 'Report', desc: 'AI generates your fix and a PDF report instantly.', icon: Terminal },
               ].map((step, i) => (
                 <ScrollReveal key={step.step} delay={i * 0.2}>
                    <GlowCard className="flex flex-col items-center text-center gap-8 pt-16 h-full">
                       <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[120px] font-head font-extrabold text-white/[0.02] leading-none pointer-events-none select-none">{step.step}</span>
                       <div className="p-4 rounded-2xl bg-accent/10 border border-accent/20 group-hover:border-accent/40 transition-colors"><step.icon className="w-8 h-8 text-accent" /></div>
                       <h3 className="text-2xl font-head font-bold text-white relative z-10">{step.name}</h3>
                       <p className="text-muted leading-relaxed relative z-10 text-sm">{step.desc}</p>
                    </GlowCard>
                 </ScrollReveal>
               ))}
            </div>
         </div>
      </section>

      {/* PART F: SOCIAL PROOF / TRUST SECTION */}
      <section className="py-24 border-b border-border bg-bg overflow-hidden isolate">
         <ScrollReveal className="max-w-[1280px] mx-auto px-6 w-full text-center mb-16">
            <p className="text-dim text-[10px] font-bold uppercase tracking-[0.4em]">Trusted by security teams</p>
         </ScrollReveal>
         <Marquee />
         <div className="max-w-[1280px] mx-auto px-6 w-full mt-24">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
               {[
                 { text: "Switching to ShieldSentinel was the best security decision this year.", author: "Marcus V.", role: "CTO @ TechCore" },
                 { text: "The board-ready reports changed how we approach security assessments.", author: "Elena R.", role: "SecOps Lead @ NodeSync" },
                 { text: "Best-in-class UI for complex penetration testing.", author: "Julian K.", role: "Sr. Dev @ Datalock" },
               ].map((quote, i) => (
                 <ScrollReveal key={i} delay={i * 0.1}>
                    <GlowCard className="flex flex-col gap-6 p-8 bg-surface/20 border-border/40 h-full">
                       <div className="flex gap-1">{[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-accent text-accent" />)}</div>
                       <p className="text-white text-lg italic leading-relaxed">"{quote.text}"</p>
                       <div className="flex flex-col gap-0.5 mt-auto pt-4 border-t border-border/20">
                          <span className="text-white font-bold text-sm tracking-tight">{quote.author}</span>
                          <span className="text-dim text-[10px] font-bold uppercase tracking-wider">{quote.role}</span>
                       </div>
                    </GlowCard>
                 </ScrollReveal>
               ))}
            </div>
         </div>
      </section>

      {/* PART G: CTA SECTION */}
      <section className="py-32 sm:py-48 relative overflow-hidden isolate">
         <motion.div 
            animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl max-h-4xl bg-accent/15 rounded-full blur-[160px] -z-10" 
         />
         <div className="max-w-[1280px] mx-auto px-6 w-full text-center relative z-10">
            <div className="flex flex-col items-center gap-12">
               <ScrollReveal><h2 className="text-5xl sm:text-7xl lg:text-8xl font-head font-extrabold text-white tracking-tighter leading-[0.95]">Start finding <br /> vulnerabilities today.</h2></ScrollReveal>
               <ScrollReveal delay={0.2}><p className="text-muted text-xl max-w-2xl leading-relaxed">Join elite fleets already protected by ShieldSentinel. Free plan forever.</p></ScrollReveal>
               <ScrollReveal delay={0.3}>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                     <MagneticButton strength={0.4}><Link to="/signup"><Button size="lg" className="px-12" icon={ArrowRight}>Get Started Free</Button></Link></MagneticButton>
                     <MagneticButton strength={0.3}><Link to="/pricing"><Button variant="secondary" size="lg" className="px-12">View Pricing</Button></Link></MagneticButton>
                  </div>
               </ScrollReveal>
               <ScrollReveal delay={0.5} className="w-full">
                  <div className="flex flex-wrap justify-center gap-8 items-center text-dim text-xs font-bold uppercase tracking-widest pt-8 border-t border-border mt-8 border-transparent bg-gradient-to-r from-transparent via-border to-transparent h-px shrink-0" />
                  <div className="flex flex-wrap justify-center gap-8 items-center text-dim text-xs font-bold uppercase tracking-widest mt-4">
                     {["🔒 SOC 2 Ready", "🛡️ OWASP Compliant", "🔑 Data encrypted"].map(t => <span key={t} className="flex items-center gap-2">{t}</span>)}
                  </div>
               </ScrollReveal>
            </div>
         </div>
      </section>

      {/* PART H: CONTACT SECTION */}
      <section className="py-24 border-t border-border bg-bg relative">
         <div className="max-w-[1280px] mx-auto px-6 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
               <div className="flex flex-col gap-10">
                  <ScrollReveal className="space-y-4">
                     <SectionLabel>Contact</SectionLabel>
                     <h2 className="text-4xl sm:text-6xl font-head font-bold text-white tracking-tighter">Get in touch.</h2>
                     <p className="text-muted text-lg max-w-md">Questions enterprise deployment? Our team is available 24/7.</p>
                  </ScrollReveal>
                  <div className="flex flex-col gap-6">
                     <ScrollReveal delay={0.2}><a href="mailto:security@shieldssentinel.com" className="flex items-center gap-4 group"><div className="p-3 rounded-xl glass border-border group-hover:border-accent/40 transition-colors"><Mail className="w-6 h-6 text-accent" /></div><span className="text-muted group-hover:text-white transition-colors">security@shieldssentinel.com</span></a></ScrollReveal>
                     <ScrollReveal delay={0.3} className="flex gap-4">
                        {[Github, Twitter, Linkedin].map((Icon, i) => (
                           <MagneticButton key={i} strength={0.5}><a href="#" className="p-3 rounded-xl glass border-border hover:border-accent/40 transition-colors text-dim hover:text-white flex items-center justify-center"><Icon className="w-5 h-5" /></a></MagneticButton>
                        ))}
                     </ScrollReveal>
                  </div>
               </div>
               <ScrollReveal delay={0.4}><ContactForm /></ScrollReveal>
            </div>
         </div>
      </section>
    </div>
  );
};

export default Home;
