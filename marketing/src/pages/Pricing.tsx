import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ArrowRight, Play, CheckCircle2, ChevronRight, Globe, Zap, Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import SectionLabel from '../components/ui/SectionLabel';
import BillingToggle from '../components/BillingToggle';
import PricingCard from '../components/PricingCard';
import DetailedComparisonTable from '../components/DetailedComparisonTable';
import FAQAccordion from '../components/FAQAccordion';
import ScrollReveal from '../components/ScrollReveal';

const Pricing = () => {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  const pricingData = [
    {
      name: 'Free',
      price: '$0',
      desc: 'Perfect for individuals and personal projects.',
      ctaText: 'Get Started Free',
      features: [
        { text: '5 URL scans / month', included: true },
        { text: '3 ZIP scans / month', included: true },
        { text: 'Basic findings report', included: true },
        { text: 'PDF export', included: true },
        { text: 'AI code fixes (5/scan)', included: true },
        { text: 'WAF rules', included: false },
        { text: 'Compliance mapping', included: false },
        { text: 'API access', included: false },
        { text: 'Priority support', included: false },
      ]
    },
    {
      name: 'Pro',
      price: '$29',
      annualPrice: '$20',
      desc: 'For professional developers and small teams.',
      ctaText: 'Get Pro →',
      isPopular: true,
      features: [
        { text: 'Unlimited URL scans', included: true },
        { text: 'Unlimited ZIP scans', included: true },
        { text: 'Full findings report', included: true },
        { text: 'PDF + JSON export', included: true },
        { text: 'Unlimited AI code fixes', included: true },
        { text: 'WAF rules (all formats)', included: true },
        { text: 'Compliance mapping', included: true },
        { text: 'AI chatbot', included: true },
        { text: 'API access', included: true },
        { text: 'Priority support', included: false },
        { text: 'Custom integrations', included: false },
      ]
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      desc: 'For large teams and enterprise security needs.',
      ctaText: 'Contact Sales →',
      features: [
        { text: 'Everything in Pro', included: true },
        { text: 'Unlimited team members', included: true },
        { text: 'SSO / SAML', included: true },
        { text: 'Priority support (SLA)', included: true },
        { text: 'Custom integrations', included: true },
        { text: 'On-premise deployment', included: true },
        { text: 'Audit logs', included: true },
        { text: 'Dedicated account manager', included: true },
        { text: 'Custom AI fine-tuning', included: true },
      ]
    }
  ];

  return (
    <div className="relative isolate py-40 overflow-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 grid-bg -z-10 opacity-30 mask-radial pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] spotlight -z-10 pointer-events-none" />

      {/* PART A: PAGE HERO */}
      <section className="relative px-6 sm:px-12 text-center flex flex-col items-center mb-16">
        <ScrollReveal>
           <SectionLabel>Pricing</SectionLabel>
        </ScrollReveal>
        <ScrollReveal delay={0.1} scale={0.9}>
           <h1 className="text-5xl sm:text-7xl font-head font-extrabold mb-8 tracking-tighter text-white">
              Simple, transparent pricing.
           </h1>
        </ScrollReveal>
        <ScrollReveal delay={0.2}>
           <p className="text-muted text-lg sm:text-xl max-w-2xl leading-relaxed mb-12">
              Start free. Scale when you need to. No hidden fees, no surprise invoices.
           </p>
        </ScrollReveal>

        <ScrollReveal delay={0.3}>
           <BillingToggle billing={billing} onToggle={setBilling} />
        </ScrollReveal>
      </section>

      {/* PART B: PRICING CARDS */}
      <section className="py-12 sm:pb-32">
         <div className="max-w-[1280px] mx-auto px-6 w-full grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {pricingData.map((tier, i) => (
               <ScrollReveal key={tier.name} delay={0.4 + i * 0.1} y={40} className="h-full">
                  <PricingCard 
                      {...tier} 
                      billing={billing} 
                  />
               </ScrollReveal>
            ))}
         </div>
      </section>

      {/* PART C: DETAILED COMPARISON TABLE */}
      <section className="py-24 sm:py-32 border-y border-border bg-surface/20 isolate">
         <div className="max-w-[1280px] mx-auto px-6 w-full text-center">
            <ScrollReveal>
               <h2 className="text-4xl sm:text-5xl font-head font-bold text-white mb-16 tracking-tighter">
                  Full feature breakdown.
               </h2>
            </ScrollReveal>
            <ScrollReveal delay={0.2} y={30}>
               <DetailedComparisonTable />
            </ScrollReveal>
         </div>
      </section>

      {/* PART D: FAQ SECTION */}
      <section className="py-24 sm:py-32">
         <div className="max-w-[1280px] mx-auto px-6 w-full text-center">
            <ScrollReveal>
               <SectionLabel>FAQ</SectionLabel>
               <h2 className="text-4xl sm:text-6xl font-head font-bold text-white mb-16 tracking-tighter">
                  Common questions.
               </h2>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
               <FAQAccordion />
            </ScrollReveal>
         </div>
      </section>

      {/* PART E: FINAL CTA */}
      <section className="py-32 sm:py-48 relative overflow-hidden isolate">
         <motion.div 
            animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl max-h-4xl bg-accent/15 rounded-full blur-[160px] -z-10" 
         />
         
         <div className="max-w-[1280px] mx-auto px-6 w-full text-center relative z-10">
            <div className="flex flex-col items-center gap-12">
               <ScrollReveal>
                  <h2 className="text-5xl sm:text-8xl font-head font-extrabold text-white tracking-tighter leading-[0.95]">
                     Start securing your <br /> applications today.
                  </h2>
               </ScrollReveal>
               <ScrollReveal delay={0.2}>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                     <Button size="lg" className="px-12" icon={ArrowRight}>
                        Get Started Free
                     </Button>
                     <Button variant="secondary" size="lg" className="px-12">
                        Talk to Sales
                     </Button>
                  </div>
               </ScrollReveal>
            </div>
         </div>
         <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      </section>
    </div>
  );
};

export default Pricing;
