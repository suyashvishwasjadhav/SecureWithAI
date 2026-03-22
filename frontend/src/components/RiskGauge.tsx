import React, { useEffect, useState } from 'react';

interface RiskGaugeProps {
  score: number;
  size?: number;
}

const RiskGauge: React.FC<RiskGaugeProps> = ({ score, size = 160 }) => {
  const [offset, setOffset] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    // Progress bar animation
    const targetOffset = ((100 - score) / 100) * circumference;
    setOffset(targetOffset);

    // Number count-up animation
    let start = 0;
    const duration = 1000;
    const increment = score / (duration / 10);
    const timer = setInterval(() => {
      start += increment;
      if (start >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(start));
      }
    }, 10);
    return () => clearInterval(timer);
  }, [score, circumference]);

  const getColor = (s: number) => {
    if (s <= 20) return '#22c55e'; // Green (Safe)
    if (s <= 40) return '#eab308'; // Yellow (Warning)
    if (s <= 70) return '#f97316'; // Orange (High Risk)
    return '#ef4444'; // Red (Critical)
  };

  const color = getColor(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1f1f1f"
          strokeWidth="12"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ 
            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: `drop-shadow(0 0 6px ${color}44)`
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-5xl font-black text-white mb-0 leading-tight">
          {displayScore}
        </span>
        <span className="text-[9px] uppercase tracking-[0.2em] font-black text-gray-500">Risk Level</span>
      </div>
    </div>
  );
};

export default RiskGauge;
