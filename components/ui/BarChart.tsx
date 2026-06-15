'use client';

interface Bar {
  label: string;
  value: number;
}

interface BarChartProps {
  data: Bar[];
  title?: string;
  subtitle?: string;
  formatValue?: (v: number) => string;
  className?: string;
}

export default function BarChart({
  data,
  title,
  subtitle,
  formatValue = (v) => v.toLocaleString(),
  className = '',
}: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div
      className={['bg-white border border-[#ECECE8] rounded-2xl overflow-hidden', className].join(' ')}
      style={{ boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 10px 30px rgba(0,0,0,.04)' }}
    >
      {title && (
        <div className="px-6 pt-5 pb-4 border-b border-[#ECECE8]">
          <p className="text-[15px] font-semibold text-[#0B0B0C]">{title}</p>
          {subtitle && <p className="text-xs text-[#8C8C88] mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="px-6 pt-5 pb-6">
        <div className="flex items-end gap-2" style={{ height: '140px' }}>
          {data.map((bar, i) => {
            const pct = (bar.value / max) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-end" style={{ height: '116px' }}>
                  <div
                    className="w-full rounded-t-md origin-bottom"
                    title={formatValue(bar.value)}
                    style={{
                      height: `${Math.max(pct, 4)}%`,
                      background: 'linear-gradient(180deg, #6E5BFF 0%, #4D7CFF 100%)',
                      animation: `wvGrow 0.55s cubic-bezier(.22,.61,.36,1) ${i * 0.05}s both`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-[#8C8C88] font-medium leading-none">
                  {bar.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
