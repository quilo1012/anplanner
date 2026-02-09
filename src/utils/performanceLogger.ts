const isDev = import.meta.env.DEV;

interface PerfLog {
  operation: string;
  duration: number;
  timestamp: Date;
}

// Keep last 50 logs for debugging
const perfLogs: PerfLog[] = [];
const MAX_LOGS = 50;

/**
 * Log performance of an operation (dev only)
 */
export const perfLog = (operation: string, startTime: number) => {
  if (!isDev) return;
  
  const duration = Date.now() - startTime;
  const log: PerfLog = {
    operation,
    duration,
    timestamp: new Date(),
  };
  
  perfLogs.push(log);
  if (perfLogs.length > MAX_LOGS) {
    perfLogs.shift();
  }
  
  // Color-coded console output
  if (duration > 2000) {
    console.error(`[PERF] ❌ ${operation}: ${duration}ms (CRITICAL - > 2s)`);
  } else if (duration > 1000) {
    console.warn(`[PERF] ⚠️ ${operation}: ${duration}ms (SLOW - > 1s)`);
  } else if (duration > 500) {
    console.log(`[PERF] 🟡 ${operation}: ${duration}ms`);
  } else {
    console.log(`[PERF] ✅ ${operation}: ${duration}ms`);
  }
};

/**
 * Create a timer for performance measurement
 */
export const createPerfTimer = (operation: string) => {
  const startTime = Date.now();
  
  return {
    end: () => perfLog(operation, startTime),
    elapsed: () => Date.now() - startTime,
  };
};

/**
 * Get recent performance logs (dev only)
 */
export const getPerfLogs = (): PerfLog[] => {
  if (!isDev) return [];
  return [...perfLogs];
};

/**
 * Get performance summary (dev only)
 */
export const getPerfSummary = () => {
  if (!isDev || perfLogs.length === 0) return null;
  
  const byOperation = new Map<string, number[]>();
  
  perfLogs.forEach(log => {
    const existing = byOperation.get(log.operation) || [];
    existing.push(log.duration);
    byOperation.set(log.operation, existing);
  });
  
  const summary: Record<string, { avg: number; max: number; count: number }> = {};
  
  byOperation.forEach((durations, operation) => {
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);
    summary[operation] = { avg: Math.round(avg), max, count: durations.length };
  });
  
  return summary;
};

/**
 * Clear performance logs (dev only)
 */
export const clearPerfLogs = () => {
  perfLogs.length = 0;
};
