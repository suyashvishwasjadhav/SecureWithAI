import { motion } from 'framer-motion';
import { Target, Users, Code, Award, Terminal, LayoutDashboard, ArrowRight, Shield, Globe, Monitor, Zap, Command, Check, X, Star, Bot, Cpu, Lock } from 'lucide-react';
import Button from '../components/ui/Button';
import SectionLabel from '../components/ui/SectionLabel';
import GlowCard from '../components/ui/GlowCard';
import Badge from '../components/ui/Badge';
import TerminalPreview from '../components/TerminalPreview';
import InstallationTabs from '../components/InstallationTabs';
import ToolGrid from '../components/ToolGrid';
import ComparisonTable from '../components/ComparisonTable';
import ScrollReveal from '../components/ScrollReveal';

const About = () => {
  return (
    <div className="relative isolate py-40 overflow-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 grid-bg -z-10 opacity-30 mask-radial pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] spotlight -z-10 pointer-events-none" />

      {/* PART A: PAGE HERO */}
      <section className="relative px-6 sm:px-12 text-center flex flex-col items-center mb-32">
        <ScrollReveal delay={0}>
           <SectionLabel>About</SectionLabel>
        </ScrollReveal>
        <ScrollReveal delay={0.1} scale={0.9}>
           <h1 className="text-5xl sm:text-7xl font-head font-extrabold mb-8 tracking-tighter text-white">
              Security intelligence, <br /> built different.
           </h1>
        </ScrollReveal>
        <ScrollReveal delay={0.2}>
           <p className="text-muted text-lg sm:text-xl max-w-2xl leading-relaxed">
              We built ShieldSentinel because we were frustrated with security tools 
              that find problems but never help you fix them.
           </p>
        </ScrollReveal>
      </section>

      {/* PART B: MISSION STATEMENT SECTION */}
      <section className="py-24 sm:py-32 relative isolate border-y border-border bg-surface/20">
        <div className="max-w-[1280px] mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            {/* Left: Pull Quote */}
            <div className="lg:col-span-7 relative">
                <span className="absolute -top-16 -left-8 text-[240px] font-head font-extrabold text-white/[0.04] leading-none pointer-events-none select-none">
                  "
                </span>
                <ScrollReveal x={-20} delay={0.1}>
                   <p className="text-2xl sm:text-3xl lg:text-4xl font-head font-bold text-white relative z-10 leading-[1.4] tracking-tight">
                     Every vulnerability scanner told us what was wrong. 
                     None of them told us how to fix it, what WAF rule to 
                     deploy, or how it affected our compliance posture. 
                     We built the tool we always wanted.
                   </p>
                </ScrollReveal>
            </div>

            {/* Right: Supporting Text */}
            <div className="lg:col-span-5 flex flex-col gap-8 text-muted text-base leading-relaxed">
                {[
                   { title: "The Gap", text: "Traditional tools prioritize volume over value, resulting in endless PDF reports that developers ignore because they lack critical context for remediation." },
                   { title: "Our Approach", text: "ShieldSentinel bridges the gap between identification and remediation by leveraging AI to generate exact patches and WAF rules for every detected threat." },
                   { title: "For the Modern Elite", text: "Designed for specialized security teams and rapid-release engineering departments that take identity and asset integrity seriously." }
                ].map((item, i) => (
                   <ScrollReveal key={item.title} x={20} delay={0.2 + i * 0.1}>
                      <div className="space-y-2">
                         <h4 className="text-white font-bold text-sm uppercase tracking-widest">{item.title}</h4>
                         <p>{item.text}</p>
                      </div>
                   </ScrollReveal>
                ))}
            </div>
        </div>
      </section>

      {/* PART C: TWO PRODUCTS SECTION */}
      <section className="py-24 sm:py-32" id="products">
         <div className="max-w-[1280px] mx-auto px-6 w-full">
            <ScrollReveal className="flex flex-col items-center text-center mb-24">
               <SectionLabel>Products</SectionLabel>
               <h2 className="text-4xl sm:text-6xl font-head font-bold text-white mb-6 tracking-tighter">
                  Two ways to use ShieldSentinel.
               </h2>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
               {/* CARD 1: Web Platform */}
               <ScrollReveal delay={0.1} y={40} className="h-full">
                  <GlowCard className="flex flex-col h-full bg-accent/[0.02] border-accent/20">
                     <div className="flex flex-col h-full">
                        <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 w-fit mb-8">
                           <Globe className="w-10 h-10 text-accent" />
                        </div>
                        <h3 className="text-3xl font-head font-bold text-white mb-4 tracking-tight">Shield Web Console</h3>
                        <div className="h-px bg-border mb-8 w-full" />
                        
                        <p className="text-muted text-lg leading-relaxed mb-10">
                           The full platform in your browser. Scan URLs, upload code, 
                           get AI fixes, and download reports instantly.
                        </p>

                        <div className="space-y-4 mb-12 flex-grow">
                           {[
                             'Real-time fleet dashboard',
                             'Expert AI security chatbot',
                             'Universal PDF + WAF exports',
                             'Zero local installation required'
                           ].map(f => (
                             <div key={f} className="flex items-center gap-3">
                                <Check className="w-4 h-4 text-accent" strokeWidth={3} />
                                <span className="text-sm font-medium text-text">{f}</span>
                             </div>
                           ))}
                        </div>

                        <div className="flex gap-4 pt-8 border-t border-border mt-auto">
                           <Button className="flex-1">Open Web App</Button>
                           <Button variant="secondary" className="flex-1">View Pricing</Button>
                        </div>
                        <p className="mt-8 text-[10px] font-bold text-dim uppercase tracking-[0.2em] pt-4 border-t border-dashed border-border/40">
                          Best for: Teams, non-technical users, quick scans
                        </p>
                     </div>
                  </GlowCard>
               </ScrollReveal>

               {/* CARD 2: CLI Tool */}
               <ScrollReveal delay={0.2} y={40} className="h-full">
                  <GlowCard className="flex flex-col h-full bg-teal-500/[0.03] border-teal-500/20" glowColor="rgba(20,184,166,0.15)">
                     <div className="flex flex-col h-full">
                        <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 w-fit mb-8">
                           <Terminal className="w-10 h-10 text-teal-400" />
                        </div>
                        <h3 className="text-3xl font-head font-bold text-white mb-4 tracking-tight">Shield CLI Engine</h3>
                        <div className="h-px bg-border mb-8 w-full" />
                        
                        <p className="text-muted text-lg leading-relaxed mb-10">
                           Run enterprise scans from your terminal. Integrate into CI/CD 
                           pipelines with same power, zero browser needed.
                        </p>

                        <div className="mb-10 flex-grow">
                           <TerminalPreview />
                        </div>

                        <div className="space-y-4 mb-12 flex-grow-0">
                           {[
                             'Seamless CI/CD integration',
                             'Streaming JSON + PDF output',
                             'Fully custom scan profiling',
                             'Native GitHub Actions support'
                           ].map(f => (
                             <div key={f} className="flex items-center gap-3">
                                <Check className="w-4 h-4 text-teal-400" strokeWidth={3} />
                                <span className="text-sm font-medium text-text">{f}</span>
                             </div>
                           ))}
                        </div>

                        <div className="flex gap-4 pt-8 border-t border-border mt-auto">
                           <Button className="flex-1 bg-teal-500 hover:bg-teal-400">Install CLI</Button>
                           <Button variant="secondary" className="flex-1 border-teal-500/20">View Docs</Button>
                        </div>
                        <p className="mt-8 text-[10px] font-bold text-dim uppercase tracking-[0.2em] pt-4 border-t border-dashed border-border/40">
                          Best for: DevOps, automation, monitoring
                        </p>
                     </div>
                  </GlowCard>
               </ScrollReveal>
            </div>
         </div>
      </section>

      {/* PART D: CLI INSTALLATION SECTION */}
      <section className="py-24 sm:py-32 relative bg-surface/20 border-y border-border isolate">
         <div className="max-w-[1280px] mx-auto px-6 w-full text-center">
            <ScrollReveal>
               <SectionLabel>Installation</SectionLabel>
               <h2 className="text-4xl sm:text-6xl font-head font-bold text-white mb-16 tracking-tighter">
                  Get started in 30 seconds.
               </h2>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
               <InstallationTabs />
            </ScrollReveal>
         </div>
      </section>

      {/* PART E: UNDER THE HOOD TOOLS SECTION */}
      <section className="py-24 sm:py-48">
         <div className="max-w-[1280px] mx-auto px-6 w-full text-center">
            <ScrollReveal>
               <SectionLabel>Under the Hood</SectionLabel>
               <h2 className="text-4xl sm:text-6xl font-head font-bold text-white mb-6 tracking-tighter">
                  Powered by the best.
               </h2>
               <p className="text-muted text-lg max-w-2xl leading-relaxed mx-auto">
                  We don't reinvent the wheel — we weaponize it. ShieldSentinel 
                  orchestrates the industry's most powerful open-source security engines.
               </p>
            </ScrollReveal>
            
            <ScrollReveal delay={0.3} y={40}>
               <ToolGrid />
            </ScrollReveal>
         </div>
      </section>

      {/* PART F: COMPARISON TABLE */}
      <section className="py-24 sm:py-32 bg-surface/20 border-t border-border isolate">
         <div className="max-w-[1280px] mx-auto px-6 w-full text-center mb-24">
            <ScrollReveal>
               <SectionLabel>Comparison</SectionLabel>
               <h2 className="text-4xl sm:text-6xl font-head font-bold text-white mb-6 tracking-tighter">
                  Shield vs The Others.
               </h2>
               <p className="text-muted text-lg max-w-xl mx-auto">
                  See why the most secure engineering teams are moving away 
                  from traditional, passive vulnerability scanners.
               </p>
            </ScrollReveal>
         </div>
         
         <ScrollReveal delay={0.2} y={30} className="px-6 max-w-[1280px] mx-auto">
            <ComparisonTable />
         </ScrollReveal>
      </section>
    </div>
  );
};

export default About;
