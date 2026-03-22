import { motion } from 'framer-motion';

interface BillingToggleProps {
  billing: 'monthly' | 'annual';
  onToggle: (v: 'monthly' | 'annual') => void;
}

const BillingToggle = ({ billing, onToggle }: BillingToggleProps) => {
  return (
    <div className="flex flex-col items-center gap-4 mb-16">
      <div className="relative p-1.5 flex bg-card border border-border rounded-full w-fit">
        <motion.div
           layout
           transition={{ type: "spring", stiffness: 400, damping: 30 }}
           className={`absolute top-1.5 bottom-1.5 rounded-full bg-accent shadow-[0_0_15px_rgba(99,102,241,0.4)] ${
             billing === 'monthly' ? 'left-1.5 w-[100px]' : 'left-[115px] w-[130px]'
           }`}
        />
        
        <button
          onClick={() => onToggle('monthly')}
          className={`relative z-10 px-6 py-2 text-sm font-bold tracking-tight uppercase transition-colors duration-200 ${
            billing === 'monthly' ? 'text-white' : 'text-dim hover:text-muted'
          }`}
        >
          Monthly
        </button>
        
        <button
          onClick={() => onToggle('annual')}
          className={`relative z-10 px-6 py-2 text-sm font-bold tracking-tight uppercase transition-colors duration-200 flex items-center gap-2 ${
            billing === 'annual' ? 'text-white' : 'text-dim hover:text-muted'
          }`}
        >
          Annual
          {billing === 'monthly' && (
             <motion.span 
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               className="px-1.5 py-0.5 rounded bg-success/20 text-success text-[9px] font-bold border border-success/20 animate-pulse"
             >
               SAVE 30%
             </motion.span>
          )}
        </button>
      </div>
    </div>
  );
};

export default BillingToggle;
