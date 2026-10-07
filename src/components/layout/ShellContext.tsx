import { createContext, useContext } from "react";

/**
 * Actions the app frame offers to anything rendered inside it (pages, the
 * user menu, the navigation).
 */
export interface ShellActions {
  /** Switch admin mode on (asking for the code if needed) or off. */
  toggleAdminMode: () => void;
  openLogs: () => void;
  openClearCache: () => void;
}

export const ShellContext = createContext<ShellActions | null>(null);

export const useShell = (): ShellActions => {
  const context = useContext(ShellContext);
  if (!context) throw new Error("useShell must be used inside <AppShell>");
  return context;
};
