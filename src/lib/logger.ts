/**
 * Frontend Logging Service
 * Captures console logs, errors, and warnings
 * Logs are kept for 7 days based on date
 */

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
  stack?: string;
  source?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 10000; // Keep up to 10000 logs (will be filtered by date)
  private retentionDays = 7; // Keep logs for 7 days
  private listeners: Array<(logs: LogEntry[]) => void> = [];
  private originalConsole: {
    log: typeof console.log;
    info: typeof console.info;
    warn: typeof console.warn;
    error: typeof console.error;
    debug: typeof console.debug;
  };

  constructor() {
    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
    };

    // Override console methods
    this.setupConsoleOverrides();
  }

  private setupConsoleOverrides() {
    console.log = (...args: any[]) => {
      this.addLog('log', args);
      this.originalConsole.log(...args);
    };

    console.info = (...args: any[]) => {
      this.addLog('info', args);
      this.originalConsole.info(...args);
    };

    console.warn = (...args: any[]) => {
      this.addLog('warn', args);
      this.originalConsole.warn(...args);
    };

    console.error = (...args: any[]) => {
      this.addLog('error', args);
      this.originalConsole.error(...args);
    };

    console.debug = (...args: any[]) => {
      this.addLog('debug', args);
      this.originalConsole.debug(...args);
    };

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.addLog('error', [
        event.message,
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error,
        },
      ]);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.addLog('error', [
        'Unhandled Promise Rejection',
        {
          reason: event.reason,
          error: event.reason instanceof Error ? event.reason.stack : event.reason,
        },
      ]);
    });
  }

  private addLog(level: LogEntry['level'], args: any[]) {
    const message = args
      .map((arg) => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return arg.message;
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      })
      .join(' ');

    const data = args.length > 1 ? args.slice(1) : undefined;
    const error = args.find((arg) => arg instanceof Error);
    const stack = error?.stack;

    const logEntry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      message,
      data,
      stack,
      source: this.getSource(),
    };

    this.logs.push(logEntry);

    // Clean up old logs (older than retentionDays)
    this.cleanupOldLogs();

    // Keep only last maxLogs entries (if still too many after cleanup)
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Notify listeners
    this.notifyListeners();
  }

  private cleanupOldLogs() {
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
    
    // Filter out logs older than retentionDays
    const initialLength = this.logs.length;
    this.logs = this.logs.filter((log) => {
      const logDate = new Date(log.timestamp);
      return logDate >= cutoffDate;
    });
    
    const removedCount = initialLength - this.logs.length;
    if (removedCount > 0) {
      console.log(`[Logger] Cleaned up ${removedCount} old logs (older than ${this.retentionDays} days)`);
    }
  }

  private getSource(): string {
    const stack = new Error().stack;
    if (!stack) return 'unknown';

    const lines = stack.split('\n');
    // Skip first 3 lines (Error, getSource, addLog)
    if (lines.length > 3) {
      const line = lines[3];
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/) || line.match(/at\s+(.+?):(\d+):(\d+)/);
      if (match) {
        return match[2] || match[1] || 'unknown';
      }
    }
    return 'unknown';
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener([...this.logs]));
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getLogs(): LogEntry[] {
    // Clean up old logs before returning
    this.cleanupOldLogs();
    return [...this.logs];
  }

  getLogsForDate(date: Date): LogEntry[] {
    this.cleanupOldLogs();
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    return this.logs.filter((log) => {
      const logDate = new Date(log.timestamp);
      return logDate >= targetDate && logDate < nextDay;
    });
  }

  clearLogs() {
    this.logs = [];
    this.notifyListeners();
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Manual logging methods
  log(message: string, data?: any) {
    this.addLog('log', [message, data]);
  }

  info(message: string, data?: any) {
    this.addLog('info', [message, data]);
  }

  warn(message: string, data?: any) {
    this.addLog('warn', [message, data]);
  }

  error(message: string, error?: Error | any) {
    this.addLog('error', [message, error]);
  }
}

// Export singleton instance
export const logger = new Logger();
