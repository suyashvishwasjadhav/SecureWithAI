import { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { LucideIcon, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon: Icon,
  iconPosition = 'right',
  className,
  children,
  disabled,
  ...props
}, ref) => {
  const variants = {
    primary: "bg-accent text-white hover:bg-[#818cf8] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]",
    secondary: "bg-transparent border border-border text-text hover:border-accent hover:bg-surface/50 transition-all",
    ghost: "bg-transparent text-muted hover:text-white",
    danger: "bg-danger/20 border border-danger/40 text-danger hover:bg-danger/30"
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base"
  };

  return (
    <motion.button
      ref={ref}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      disabled={loading || disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-head font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed group",
        fullWidth && "w-full",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      
      {!loading && Icon && iconPosition === 'left' && (
        <Icon className={cn("w-4 h-4 mr-2", size === 'lg' ? 'w-5 h-5' : 'w-4 h-4')} />
      )}
      
      {children}
      
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className={cn("ml-2 group-hover:translate-x-0.5 transition-transform", size === 'lg' ? 'w-5 h-5' : 'w-4 h-4')} />
      )}
    </motion.button>
  );
});

Button.displayName = 'Button';

export default Button;
