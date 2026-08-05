import { cn } from '@/lib/utils';

interface BarChartProps {
  data: { label: string; value: number }[];
  max?: number;
  color?: string;
  height?: number;
  unit?: string;
  className?: string;
}

export function BarChart({ data, max, color = 'bg-primary-500', height = 160, unit = '', className }: BarChartProps) {
  const maxVal = max || Math.max(...data.map((d) => d.value)) * 1.1;

  return (
    <div className={cn('flex items-end justify-between gap-2', className)} style={{ height }}>
      {data.map((d, i) => {
        const h = (d.value / maxVal) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
            <div className="relative w-full flex items-end justify-center flex-1">
              <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-ink-900 text-white text-2xs font-bold px-2 py-1 rounded-md whitespace-nowrap">
                {d.value}{unit}
              </div>
              <div
                className={cn('w-full max-w-10 rounded-t-lg transition-all duration-500 ease-out hover:opacity-80', color)}
                style={{ height: `${h}%` }}
              />
            </div>
            <span className="text-2xs text-ink-500 font-medium">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  fill?: string;
  className?: string;
}

export function LineChart({ data, height = 160, color = '#10b981', fill = 'url(#grad)', className }: LineChartProps) {
  const max = Math.max(...data.map((d) => d.value)) * 1.1;
  const min = Math.min(...data.map((d) => d.value)) * 0.9;
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d.value - min) / range) * 100;
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L 100 100 L 0 100 Z`;

  return (
    <div className={cn('w-full', className)}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height }} className="w-full">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={fill} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.5" fill="white" stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" className="transition-all hover:r-2.5" />
        ))}
      </svg>
      <div className="flex justify-between mt-2">
        {data.map((d, i) => (
          <span key={i} className="text-2xs text-ink-500 font-medium">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

interface DonutChartProps {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
}

export function DonutChart({ segments, size = 160, thickness = 20, centerLabel, centerValue, className }: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={thickness} className="stroke-ink-100" />
        {segments.map((seg, i) => {
          const len = (seg.value / total) * circumference;
          const dash = `${len} ${circumference - len}`;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && <span className="text-2xl font-bold text-ink-900 font-display">{centerValue}</span>}
          {centerLabel && <span className="text-xs text-ink-500">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
}
