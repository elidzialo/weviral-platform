import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  className?: string;
  trend?: { value: string; up: boolean };
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  sub,
  icon,
  className = '',
  trend,
}) => (
  <div
    className={['bg-white border border-[#ECECE8] rounded-2xl px-5 py-5', className]
      .filter(Boolean)
      .join(' ')}
    style={{ boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 10px 30px rgba(0,0,0,.04)' }}
  >
    <div className="flex items-start justify-between gap-3 mb-3">
      <p className="text-[13px] font-medium text-[#8C8C88] leading-tight">{label}</p>
      {icon && (
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(110,91,255,0.08)', color: '#6E5BFF' }}
        >
          {icon}
        </div>
      )}
    </div>
    <p
      className="text-[28px] font-black leading-none text-[#0B0B0C] tracking-tight"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {value}
    </p>
    {(sub || trend) && (
      <div className="flex items-center gap-2 mt-2">
        {trend && (
          <span
            className="text-xs font-semibold"
            style={{ color: trend.up ? '#1FD3A3' : '#F87171' }}
          >
            {trend.up ? '↑' : '↓'} {trend.value}
          </span>
        )}
        {sub && <p className="text-xs text-[#8C8C88] truncate">{sub}</p>}
      </div>
    )}
  </div>
);

export default StatCard;
