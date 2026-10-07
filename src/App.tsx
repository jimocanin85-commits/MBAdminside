import { Component, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PortalProvider, usePortal } from "@/context/PortalContext";
import Aarshjul from "@/pages/Aarshjul";
import Dashboard from "@/pages/Dashboard";
import Filer from "@/pages/Filer";
import Frivillige from "@/pages/Frivillige";
import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/NotFound";
import Referater from "@/pages/Referater";
import Brugere from "@/pages/admin/Brugere";
import Fillager from "@/pages/admin/Fillager";
import Tilpas from "@/pages/admin/Tilpas";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="heading-display text-4xl">Noget gik galt</h1>
            <p className="text-muted-foreground">
              Siden kunne ikke vises. Prøv at genindlæse - hvis det sker igen, så giv en administrator besked.
            </p>
            {this.state.error?.message && (
              <p className="break-words rounded-lg bg-muted p-3 font-mono text-xs">{this.state.error.message}</p>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-12 rounded-lg bg-primary px-6 font-semibold text-primary-foreground"
            >
              Genindlæs siden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const FullScreenMessage = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-screen items-center justify-center bg-background px-4 text-lg text-muted-foreground" role="status">
    {children}
  </div>
);

interface SectionRouteProps {
  /** The section this page belongs to (also the permission it needs). */
  section: "frivillig" | "referater" | "aarshjul";
  children: ReactNode;
}

/** A page that is only there when its section is switched on and the user has access. */
const SectionRoute = ({ section, children }: SectionRouteProps) => {
  const { hasPermission } = useAuth();
  const { isSectionEnabled, isLoading } = usePortal();

  if (isLoading) return <FullScreenMessage>Indlæser...</FullScreenMessage>;
  if (!isSectionEnabled(section) || !hasPermission(section)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

/** Admin pages need admin mode; user management also needs an admin account. */
const AdminRoute = ({ children, adminAccountOnly = false }: { children: ReactNode; adminAccountOnly?: boolean }) => {
  const { isAdmin, isAdminMode } = useAuth();
  if (!isAdminMode || (adminAccountOnly && !isAdmin)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

/** Login page until signed in, then the portal. */
const Portal = () => {
  const { status } = useAuth();
  const { isLoading: isPortalLoading } = usePortal();

  if (status === "loading") return <FullScreenMessage>Indlæser...</FullScreenMessage>;
  if (status === "anonymous") return <LoginPage />;
  // Wait for the chosen sections, so switched-off ones never flash by.
  if (isPortalLoading) return <FullScreenMessage>Indlæser...</FullScreenMessage>;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route
          path="frivillige"
          element={
            <SectionRoute section="frivillig">
              <Frivillige />
            </SectionRoute>
          }
        />
        <Route
          path="filer"
          element={
            <SectionRoute section="frivillig">
              <Filer />
            </SectionRoute>
          }
        />
        <Route
          path="aarshjul"
          element={
            <SectionRoute section="aarshjul">
              <Aarshjul />
            </SectionRoute>
          }
        />
        <Route
          path="referater"
          element={
            <SectionRoute section="referater">
              <Referater />
            </SectionRoute>
          }
        />
        <Route
          path="admin/brugere"
          element={
            <AdminRoute adminAccountOnly>
              <Brugere />
            </AdminRoute>
          }
        />
        <Route
          path="admin/fillager"
          element={
            <AdminRoute>
              <Fillager />
            </AdminRoute>
          }
        />
        <Route
          path="admin/tilpas"
          element={
            <AdminRoute>
              <Tilpas />
            </AdminRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="mb-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <PortalProvider>
                  <Portal />
                </PortalProvider>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
