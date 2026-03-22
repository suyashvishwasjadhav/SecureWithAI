import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ArrowRight } from 'lucide-react';
import GlowCard from './ui/GlowCard';
import Button from './ui/Button';

interface PricingCardProps {
  name: string;
  price: string;
  annualPrice?: string;
  unit?: string;
  desc: string;
  features: { text: string; included: boolean }[];
  isPopular?: boolean;
  ctaText: string;
  billing: 'monthly' | 'annual';
}

const PricingCard = ({ 
  name, 
  price, 
  annualPrice, 
  unit = '/ month', 
  desc, 
  features, 
  isPopular, 
  ctaText,
  billing 
}: PricingCardProps) => {
  const currentPrice = billing === 'annual' && annualPrice ? annualPrice : price;

  return (
    <motion.div
        whileHover={isPopular ? {} : { translateY: -4 }}
        className={`relative flex flex-col h-full ${
            isPopular ? 'lg:-translate-y-8 z-20' : 'z-10'
        }`}
    >
      <GlowCard 
        className={`flex flex-col h-full bg-surface/30 p-10 relative overflow-visible ${
          isPopular ? 'border-accent/40 shadow-[0_0_60px_rgba(99,102,241,0.12)] bg-[#12122b]' : 'border-white/5'
        }`}
        glowColor={isPopular ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.02)"}
      >
        {isPopular && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
            className="absolute -top-[14px] left-1/2 -translate-x-1/2 bg-accent text-[10px] font-bold text-white px-4 py-1.5 rounded-full uppercase tracking-widest whitespace-nowrap z-30 shadow-[0_4px_10px_rgba(99,102,241,0.3)]"
          >
            Most Popular
          </motion.div>
        )}

        <div className="flex flex-col gap-2 mb-8">
            <h3 className="text-xl font-head font-bold text-white tracking-tight uppercase tracking-widest opacity-80">{name}</h3>
            <div className="flex items-baseline gap-2 h-14">
                <AnimatePresence mode="wait">
                    <motion.span
                        key={currentPrice}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="text-5xl font-head font-extrabold text-white"
                    >
                        {currentPrice}
                    </motion.span>
                </AnimatePresence>
                <div className="flex flex-col">
                    <span className="text-dim text-xs font-bold uppercase tracking-widest">{unit}</span>
                    {billing === 'annual' && annualPrice && (
                       <span className="text-success text-[10px] font-bold uppercase tracking-widest">Billed Annually</span>
                    )}
                </div>
            </div>
            <p className="text-muted text-sm leading-relaxed mt-4 max-w-[240px]">
                {desc}
            </p>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-10 shrink-0" />

        <div className="flex flex-col gap-6 flex-grow mb-12">
            {features.map((f, i) => (
                <div key={i} className="flex items-start gap-4 group">
                    <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center border ${
                        f.included ? 'bg-accent/10 border-accent/30' : 'bg-red-500/5'
                    }`}>
                        {f.included ? (
                            <Check className="w-2.5 h-2.5 text-accent" strokeWidth={4} />
                        ) : (
                            <X className="w-2.5 h-2.5 text-danger opacity-40" strokeWidth={4} />
                        )}
                    </div>
                    <span className={`text-sm tracking-tight leading-tight ${
                        f.included ? 'text-white font-medium' : 'text-dim line-through decoration-dim/30'
                    }`}>
                        {f.text}
                    </span>
                </div>
            ))}
        </div>

        <Button 
            variant={isPopular ? 'primary' : 'secondary'} 
            className={`w-full py-5 text-sm font-bold uppercase tracking-widest ${
                isPopular ? '' : 'bg-white/5 border-white/5 hover:bg-white/10'
            }`}
            icon={ArrowRight}
        >
            {ctaText}
        </Button>
      </GlowCard>
    </motion.div>
  );
};

export default PricingCard;
