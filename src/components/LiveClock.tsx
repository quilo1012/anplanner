import { useState, useEffect } from 'react';

export function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="flex items-center gap-3 text-right">
      <div className="hidden sm:block">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Date</p>
        <p className="text-sm font-medium text-foreground">{formatDate(time)}</p>
      </div>
      <div className="h-8 w-px bg-border hidden sm:block" />
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide hidden sm:block">Time</p>
        <p className="font-mono text-lg sm:text-xl font-bold tabular-nums text-primary">
          {formatTime(time)}
        </p>
      </div>
    </div>
  );
}
