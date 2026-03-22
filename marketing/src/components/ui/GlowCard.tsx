import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

const GlowCard = ({ children, className, glowColor = 'rgba(99,102,241,0.15)' }: GlowCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={cn(
        "relative glass p-8 rounded-2xl overflow-hidden group transition-all duration-300",
        className
      )}
    >
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-500 opacity-0 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, ${glowColor}, transparent 70%)`
        }}
      />
      
      {/* Spotlight Effect helper CSS variable if needed, but the inline style works well */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default GlowCard;
