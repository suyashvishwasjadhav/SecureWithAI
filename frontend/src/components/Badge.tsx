import React from 'react';

interface BadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ severity }) => {
  const styles = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    info: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${styles[severity]}`}>
      {severity.toUpperCase()}
    </span>
  );
};
