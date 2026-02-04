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
    });
  };

  return (
    <div className="flex items-center gap-2 text-right">
      <span className="hidden sm:inline text-xs text-muted-foreground">{formatDate(time)}</span>
      <span className="font-mono text-sm sm:text-base font-bold tabular-nums text-primary">
        {formatTime(time)}
      </span>
    </div>
  );
}
