import { Check, X } from 'lucide-react';

const groups = [
  {
    name: 'Scanning',
    features: [
      { name: 'URL (DAST) scanning', free: '5/mo', pro: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'ZIP (SAST) scanning', free: '3/mo', pro: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Scan intensity levels', free: '1', pro: '3', enterprise: '3' },
      { name: 'Concurrent scans', free: '1', pro: '5', enterprise: 'Unlimited' },
    ]
  },
  {
    name: 'Reports',
    features: [
      { name: 'PDF export', free: true, pro: true, enterprise: true },
      { name: 'JSON export', free: true, pro: true, enterprise: true },
      { name: 'AI executive summary', free: false, pro: true, enterprise: true },
      { name: 'Compliance mapping', free: false, pro: true, enterprise: true },
    ]
  },
  {
    name: 'AI Features',
    features: [
      { name: 'AI code fixes', free: '5/scan', pro: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'WAF rule generation', free: false, pro: true, enterprise: true },
      { name: 'AI chatbot', free: false, pro: true, enterprise: true },
      { name: 'IDE prompt generator', free: true, pro: true, enterprise: true },
    ]
  },
  {
    name: 'Enterprise',
    features: [
      { name: 'API access', free: false, pro: true, enterprise: true },
      { name: 'SSO/SAML', free: false, pro: false, enterprise: true },
      { name: 'On-premise deployment', free: false, pro: false, enterprise: true },
      { name: 'SLA support', free: false, pro: false, enterprise: true },
    ]
  }
];

const DetailedComparisonTable = () => {
  const renderValue = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="w-4 h-4 text-accent inline-block" strokeWidth={3} />
      ) : (
        <X className="w-4 h-4 text-danger inline-block opacity-40" strokeWidth={3} />
      );
    }
    return <span className="text-xs sm:text-sm font-bold text-white tracking-wide">{value}</span>;
  };

  return (
    <div className="w-full max-w-5xl mx-auto overflow-hidden rounded-3xl border border-white/5 bg-[#0a0a0a] shadow-2xl relative">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/5">
              <th className="px-8 py-8 text-xs font-bold text-dim uppercase tracking-[.3em] w-1/3">Feature Breakdown</th>
              <th className="px-8 py-8 text-xs font-bold text-dim uppercase tracking-[.3em] text-center w-1/4">Free</th>
              <th className="px-8 py-8 text-xs font-bold text-accent uppercase tracking-[.3em] text-center w-1/4 bg-accent/10 relative">
                Pro
                <div className="absolute inset-y-0 left-0 w-px bg-accent/20" />
                <div className="absolute inset-y-0 right-0 w-px bg-accent/20" />
              </th>
              <th className="px-8 py-8 text-xs font-bold text-dim uppercase tracking-[.3em] text-center w-1/4">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <React.Fragment key={group.name}>
                <tr className="bg-white/[0.02]">
                  <td colSpan={4} className="px-8 py-4 text-[10px] font-bold text-muted uppercase tracking-[0.4em]">
                    Group: {group.name}
                  </td>
                </tr>
                {group.features.map((feature, i) => (
                  <tr key={feature.name} className={`border-b border-white/5 transition-colors hover:bg-white/[0.01] ${i % 2 === 0 ? '' : 'bg-white/[0.005]'}`}>
                    <td className="px-8 py-6 text-sm sm:text-base font-medium text-white max-w-[200px]">{feature.name}</td>
                    <td className="px-8 py-6 text-center">{renderValue(feature.free)}</td>
                    <td className="px-8 py-6 text-center bg-accent/[0.03] border-x border-accent/5">{renderValue(feature.pro)}</td>
                    <td className="px-8 py-6 text-center">{renderValue(feature.enterprise)}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DetailedComparisonTable;

import React from 'react';
