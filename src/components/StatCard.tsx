import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  trendValue,
  variant = 'default' 
}: StatCardProps) {
  const getValueColor = () => {
    switch (variant) {
      case 'success': return 'text-[hsl(var(--success))]';
      case 'warning': return 'text-[hsl(40,80%,35%)]';
      case 'danger': return 'text-[hsl(var(--destructive))]';
      default: return 'text-[hsl(var(--foreground))]';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp size={14} className="text-[hsl(var(--success))]" />;
      case 'down': return <TrendingDown size={14} className="text-[hsl(var(--destructive))]" />;
      case 'neutral': return <Minus size={14} className="text-[hsl(var(--muted-foreground))]" />;
      default: return null;
    }
  };

  return (
    <div className="card p-3 sm:p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-[hsl(var(--muted-foreground))] truncate">{title}</p>
          <p className={`text-xl sm:text-3xl font-bold mt-1 sm:mt-2 ${getValueColor()}`}>
            {value}
          </p>
          {(subtitle || trend) && (
            <div className="flex items-center gap-2 mt-1 sm:mt-2">
              {trend && (
                <div className="flex items-center gap-1">
                  {getTrendIcon()}
                  {trendValue && (
                    <span className={`text-xs ${
                      trend === 'up' ? 'text-[hsl(var(--success))]' : 
                      trend === 'down' ? 'text-[hsl(var(--destructive))]' : 
                      'text-[hsl(var(--muted-foreground))]'
                    }`}>
                      {trendValue}
                    </span>
                  )}
                </div>
              )}
              {subtitle && (
                <span className="text-xs text-[hsl(var(--muted-foreground))] truncate">{subtitle}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className="p-2 sm:p-3 bg-[hsl(var(--muted))] rounded-lg flex-shrink-0 ml-2">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
