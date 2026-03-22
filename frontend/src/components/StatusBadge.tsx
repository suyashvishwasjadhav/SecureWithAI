import React from 'react';

interface StatusBadgeProps {
  status: 'queued' | 'running' | 'complete' | 'failed';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = {
    queued: { color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30', dot: 'bg-gray-400', animate: 'animate-pulse' },
    running: { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', dot: 'bg-blue-400', animate: 'animate-ping' },
    complete: { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30', dot: 'bg-green-400', animate: '' },
    failed: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', dot: 'bg-red-400', animate: '' },
  };

  const c = config[status] || config.queued;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.color} ${c.border}`}>
      <span className="relative flex h-2 w-2">
        {c.animate && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${c.dot}`}></span>}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${c.dot}`}></span>
      </span>
      {status.toUpperCase()}
    </span>
  );
};
