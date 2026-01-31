import { ReactNode, ComponentType } from 'react';
import { LucideProps, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode | ComponentType<LucideProps>;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  trendDirection,
  variant = 'default' 
}: StatCardProps) {
  const getValueColor = () => {
    switch (variant) {
      case 'success': return 'text-success';
      case 'warning': return 'text-warning';
      case 'danger': return 'text-destructive';
      default: return 'text-foreground';
    }
  };

  const getTrendIcon = () => {
    switch (trendDirection) {
      case 'up': return <TrendingUp size={14} className="text-success" />;
      case 'down': return <TrendingDown size={14} className="text-destructive" />;
      case 'neutral': return <Minus size={14} className="text-muted-foreground" />;
      default: return null;
    }
  };

  // Render icon - handle both ReactNode and Component types
  const renderIcon = () => {
    if (!Icon) return null;
    
    // If it's a component (function), render it
    if (typeof Icon === 'function') {
      const IconComponent = Icon as ComponentType<LucideProps>;
      return <IconComponent size={24} className="text-primary" />;
    }
    
    // If it's already a ReactNode, return it directly
    return Icon;
  };

  return (
    <div className="card p-3 sm:p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className={`text-xl sm:text-3xl font-bold mt-1 sm:mt-2 ${getValueColor()}`}>
            {value}
          </p>
          {(subtitle || trend) && (
            <div className="flex items-center gap-2 mt-1 sm:mt-2">
              {trendDirection && getTrendIcon()}
              {trend && (
                <span className={`text-xs ${
                  trendDirection === 'up' ? 'text-success' : 
                  trendDirection === 'down' ? 'text-destructive' : 
                  'text-muted-foreground'
                }`}>
                  {trend}
                </span>
              )}
              {subtitle && (
                <span className="text-xs text-muted-foreground truncate">{subtitle}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-2 sm:p-3 bg-muted rounded-lg flex-shrink-0 ml-2">
            {renderIcon()}
          </div>
        )}
      </div>
    </div>
  );
}
