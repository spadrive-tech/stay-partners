import type { ReactNode } from "react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/kiataka-logo.png.asset.json";

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        aria-hidden
        className={cn("h-8 w-8 shrink-0", inverted ? "bg-primary-foreground" : "bg-primary")}
        style={{ maskImage: `url(${logoAsset.url})`, WebkitMaskImage: `url(${logoAsset.url})`, maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskPosition: "center", WebkitMaskPosition: "center" }}
      />
      <div className="leading-none">
        <div className={cn("text-lg font-bold tracking-tight", inverted ? "text-primary-foreground" : "text-primary")}>
          kiataka
        </div>
        <div className={cn("text-[10px] font-medium uppercase tracking-[0.2em]", inverted ? "text-sidebar-foreground" : "text-muted-foreground")}>
          Stays · Partners
        </div>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <h3 className="mt-3 font-semibold">We couldn't load this</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {error instanceof Error ? error.message : "Something went wrong. Please try again."}
      </p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft">
        <Inbox className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const tone: Record<string, string> = {
  live: "bg-success/15 text-success",
  approved: "bg-success/15 text-success",
  confirmed: "bg-success/15 text-success",
  paid: "bg-success/15 text-success",
  completed: "bg-secondary text-secondary-foreground",
  checked_in: "bg-primary/10 text-primary",
  pending: "bg-warning/25 text-warning-foreground",
  pending_review: "bg-warning/25 text-warning-foreground",
  under_review: "bg-warning/25 text-warning-foreground",
  requested: "bg-warning/25 text-warning-foreground",
  draft: "bg-muted text-muted-foreground",
  suspended: "bg-destructive/12 text-destructive",
  rejected: "bg-destructive/12 text-destructive",
  cancelled: "bg-destructive/12 text-destructive",
  declined: "bg-destructive/12 text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", tone[status] ?? "bg-muted text-muted-foreground")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-brand-gradient p-12 lg:flex">
        <Logo inverted />
        <div className="max-w-md">
          <h2 className="text-4xl font-semibold leading-tight text-primary-foreground">
            Your rooms. Your calendar. Your payouts.
          </h2>
          <p className="mt-4 text-sidebar-foreground">
            Manage your hotel rooms and shortlet apartments on Kiataka Stays — all in one calm, simple place.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground">© {new Date().getFullYear()} Kiataka</p>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function StatCard({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-primary">{icon}</span>
      </div>
      <div className="mt-4 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
