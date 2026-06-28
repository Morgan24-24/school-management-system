import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

export default function StatsCard({ icon: Icon, label, value, trend, trendLabel, iconBg = 'bg-primary-100', iconColor = 'text-primary-700', subtitle }) {
  const isPositive = trend >= 0;
  return (
    <div className="stat-card">
      <div className={`stat-icon ${iconBg}`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="stat-label truncate">{label}</p>
        <p className="stat-value">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        {trendLabel && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
            {Math.abs(trend)}% {trendLabel}
          </div>
        )}
      </div>
    </div>
  );
}
