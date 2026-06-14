import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  sub,
  icon,
  className = '',
}) => (
  <div
    className={[
      'bg-white border border-gray-200 rounded-xl shadow-sm px-6 py-5 flex items-start gap-4',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {icon && (
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center text-violet-700 text-xl">
        {icon}
      </div>
    )}
    <div className="min-w-0">
      <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 leading-tight">
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs text-gray-400 truncate">{sub}</p>
      )}
    </div>
  </div>
);

export default StatCard;
