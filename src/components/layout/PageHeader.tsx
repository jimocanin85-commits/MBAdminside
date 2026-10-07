import type { ReactNode } from "react";
import mbLogo from "@/assets/mb-logo.png";
import UserMenu from "@/components/layout/UserMenu";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Small line above the title. */
  eyebrow?: string;
  title: string;
  /** Buttons shown to the right of the title (use the "inverse" variants). */
  actions?: ReactNode;
}

/**
 * The red band at the top of every page. On phones it also carries the
 * club mark and the user menu, which live in the sidebar on larger screens.
 */
export const PageHeader = ({ eyebrow, title, actions }: PageHeaderProps) => (
  <header className="bg-primary text-primary-foreground">
    <div className="flex items-center gap-3 px-4 pt-4 md:hidden">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white">
        <img src={mbLogo} alt="" className="h-9 w-9 object-contain" />
      </span>
      <span className="heading-display min-w-0 flex-1 truncate text-xl">Måløv Boldklub</span>
      <UserMenu />
    </div>
    <div className="flex flex-wrap items-end justify-between gap-4 px-4 pb-16 pt-5 md:px-10 md:pb-20 md:pt-8">
      <div className="min-w-0 space-y-1.5">
        {eyebrow && <p className="text-[15px] font-medium text-primary-foreground/90">{eyebrow}</p>}
        <h1 className="heading-display text-[2.75rem] md:text-6xl">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 md:gap-3">{actions}</div>}
    </div>
  </header>
);

/** Page content. Pulls the first card up over the red band. */
export const PageBody = ({ children, className }: { children: ReactNode; className?: string }) => (
  <main className={cn("-mt-10 space-y-6 px-4 pb-10 md:-mt-12 md:px-10", className)}>{children}</main>
);

interface PanelProps {
  title?: string;
  /** Link or button shown opposite the title. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Dark variant, for one panel that should stand out. */
  tone?: "default" | "ink";
}

/** A titled white card - the basic building block of every page. */
export const Panel = ({ title, action, children, className, tone = "default" }: PanelProps) => (
  <section
    className={cn(
      "min-w-0 rounded-xl border p-5 md:p-6",
      tone === "ink"
        ? "border-transparent bg-secondary text-secondary-foreground"
        : "bg-card text-card-foreground",
      className,
    )}
  >
    {(title || action) && (
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        {title && <h2 className="heading-display text-2xl md:text-[1.65rem]">{title}</h2>}
        {action}
      </div>
    )}
    {children}
  </section>
);

/** Centered message for "nothing here yet" and loading states. */
export const EmptyState = ({ children }: { children: ReactNode }) => (
  <div className="rounded-lg border border-dashed px-4 py-10 text-center text-muted-foreground">{children}</div>
);
