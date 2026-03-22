import { cn } from '../../lib/utils';

type BadgeVariant = 'new' | 'beta' | 'free' | 'pro';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const Badge = ({ variant = 'new', children, className }: BadgeProps) => {
  const variants = {
    new: "bg-accent/10 text-accent border border-accent/20",
    beta: "bg-warning/10 text-warning border border-warning/20",
    free: "bg-success/10 text-success border border-success/20",
    pro: "bg-accent/20 text-accent border border-accent/40 font-bold uppercase tracking-widest text-[10px]"
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide",
      variant === 'pro' 
        ? "gradient-text border-transparent shadow-[0_0_10px_rgba(99,102,241,0.2)] bg-surface-lighter" 
        : variants[variant],
      className
    )}>
      {children}
    </span>
  );
};

export default Badge;
