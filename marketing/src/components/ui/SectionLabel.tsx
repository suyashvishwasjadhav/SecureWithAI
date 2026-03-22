import { motion } from 'framer-motion';

const SectionLabel = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="flex items-center gap-2 mb-4"
    >
      <div className="w-1.5 h-1.5 rounded-full bg-accent glow-accent" />
      <span className="text-[10px] font-head font-bold uppercase tracking-[0.3em] text-accent">
        {children}
      </span>
    </motion.div>
  );
};

export default SectionLabel;
