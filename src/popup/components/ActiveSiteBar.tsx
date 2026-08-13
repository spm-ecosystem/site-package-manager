import React from 'react';

interface ActiveSiteBarProps {
  domain: string;
}

export const ActiveSiteBar: React.FC<ActiveSiteBarProps> = ({ domain }) => {
  return (
    <div className="px-4 py-2 border-b border-[#333333]">
      <div className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">Active Site</div>
      <div className="text-xs text-white font-mono truncate mt-0.5">{domain || '-'}</div>
    </div>
  );
};
