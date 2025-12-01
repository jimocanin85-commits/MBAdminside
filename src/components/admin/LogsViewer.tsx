import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Search } from "lucide-react";
import { logger, type LogEntry } from "@/lib/logger";
import { format } from "date-fns";

interface LogsViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LogsViewer = ({ open, onOpenChange }: LogsViewerProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info' | 'log'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // Get initial logs
    setLogs(logger.getLogs());

    // Subscribe to new logs
    const unsubscribe = logger.subscribe((newLogs) => {
      setLogs(newLogs);
    });

    return unsubscribe;
  }, [open]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filter !== 'all' && log.level !== filter) return false;
    if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warn':
        return 'default';
      case 'info':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getLevelBgColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'bg-destructive/10 border-destructive/20';
      case 'warn':
        return 'bg-yellow-500/10 border-yellow-500/20';
      case 'info':
        return 'bg-blue-500/10 border-blue-500/20';
      default:
        return 'bg-muted/50 border-border';
    }
  };

  const handleExport = () => {
    const exportData = logger.exportLogs();
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl">Frontend Logs</DialogTitle>
          <DialogDescription>
            Viser alle console logs, errors og warnings fra frontend
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Controls */}
          <div className="px-6 py-4 border-b flex flex-col sm:flex-row gap-3 flex-shrink-0 bg-muted/30">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Søg i logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex gap-1 border rounded-md p-1 bg-background">
                <Button
                  variant={filter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter('all')}
                  className="h-8 text-xs"
                >
                  Alle
                </Button>
                <Button
                  variant={filter === 'error' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter('error')}
                  className="h-8 text-xs text-destructive"
                >
                  Errors
                </Button>
                <Button
                  variant={filter === 'warn' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter('warn')}
                  className="h-8 text-xs"
                >
                  Warnings
                </Button>
                <Button
                  variant={filter === 'info' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter('info')}
                  className="h-8 text-xs"
                >
                  Info
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setAutoScroll(!autoScroll)}
                className={`gap-2 h-10 ${autoScroll ? 'bg-primary/10' : ''}`}
              >
                {autoScroll ? 'Auto-scroll: ON' : 'Auto-scroll: OFF'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 h-10">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>

          {/* Logs Container */}
          <div 
            ref={logsContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 bg-background"
            style={{ maxHeight: 'calc(95vh - 280px)' }}
          >
            <div className="space-y-3">
              {filteredLogs.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <p className="text-lg font-medium">Ingen logs fundet</p>
                  <p className="text-sm mt-2">
                    {searchTerm ? 'Prøv at ændre søgeordet eller filteret' : 'Logs vil blive vist her når de opstår'}
                  </p>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`border rounded-lg p-4 transition-all hover:shadow-md ${getLevelBgColor(log.level)}`}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <Badge 
                        variant={getLevelColor(log.level)} 
                        className="text-xs font-semibold shrink-0"
                      >
                        {log.level.toUpperCase()}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-muted-foreground">
                            {format(log.timestamp, 'HH:mm:ss.SSS')}
                          </span>
                          {log.source && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {log.source.split('/').pop()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-mono break-words whitespace-pre-wrap text-foreground leading-relaxed">
                      {log.message}
                    </div>
                    {log.data && (
                      <details className="mt-3 group">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none">
                          <span className="inline-flex items-center gap-1">
                            <span>📦</span>
                            <span>Vis data ({Array.isArray(log.data) ? log.data.length : 1} elementer)</span>
                          </span>
                        </summary>
                        <div className="mt-2 bg-muted/80 border rounded-md p-3 overflow-auto max-h-60">
                          <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                    {log.stack && (
                      <details className="mt-3 group">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none">
                          <span className="inline-flex items-center gap-1">
                            <span>🔍</span>
                            <span>Vis stack trace</span>
                          </span>
                        </summary>
                        <div className="mt-2 bg-muted/80 border rounded-md p-3 overflow-auto max-h-60">
                          <pre className="text-xs font-mono whitespace-pre-wrap break-words text-destructive">
                            {log.stack}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t bg-muted/30 flex items-center justify-between flex-shrink-0">
            <div className="text-xs text-muted-foreground">
              Viser <strong className="text-foreground">{filteredLogs.length}</strong> af <strong className="text-foreground">{logs.length}</strong> logs
            </div>
            <div className="text-xs text-muted-foreground">
              {filteredLogs.length > 0 && (
                <span>
                  Seneste: {format(filteredLogs[filteredLogs.length - 1].timestamp, 'HH:mm:ss')}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Logs gemmes i 7 dage
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LogsViewer;
