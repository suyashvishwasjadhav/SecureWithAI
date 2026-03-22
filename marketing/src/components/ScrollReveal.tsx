import React from 'react';
import { motion } from 'framer-motion';

interface ScrollRevealProps {
    children: React.ReactNode;
    delay?: number;
    duration?: number;
    className?: string;
    y?: number;
    x?: number;
    scale?: number;
    once?: boolean;
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({ 
    children, 
    delay = 0, 
    duration = 0.6, 
    className = "",
    y = 24,
    x = 0,
    scale = 1,
    once = true
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y, x, scale }}
            whileInView={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            viewport={{ once, margin: "-80px" }}
            transition={{ 
                duration, 
                ease: [0.23, 1, 0.32, 1], 
                delay 
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

export default ScrollReveal;
