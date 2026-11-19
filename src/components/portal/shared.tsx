import type { ReactNode } from "react";
import { AlertCircle, Inbox, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Kiataka house mark, from the brand pack (Icon/*.svg). Uses currentColor so it follows the text colour. */
export function KiatakaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 959.14 882.64" fill="currentColor" aria-hidden focusable="false" className={className}>
      <path d="M1.62,476.71Q242,335.56,479.14,189.37c3.14-2,5.54-2.39,7.16-1.35,150.49,98.48,299.67,188.3,467,289.44a7.19,7.19,0,0,0,3.3,1.11,1,1,0,0,0,1.1-1q1.08-81.94,1.38-163c0-8.35.57-14.07-5.84-18.2Q816.8,208.52,650.35,105.74C594.26,71.11,539,35.07,482.88.47A3.16,3.16,0,0,0,480,.26a101.68,101.68,0,0,0-12.93,7Q233.38,151.38,2.22,296.88a4.77,4.77,0,0,0-2.22,4l.15,175C.15,477,.63,477.28,1.62,476.71Z" />
      <path d="M590.13,362.67,487,297.45a4.05,4.05,0,0,0-4.34,0Q246.17,446.34,4.76,587.25a4.37,4.37,0,0,0-2.19,3.8L1.38,716.64a.3.3,0,0,0,.48.24Q95,655.37,191.59,601.11q29.82-16.75,51.81-30,172.91-104.27,346.67-205.6A1.65,1.65,0,0,0,590.13,362.67Z" />
      <path d="M686.18,425.47a3.49,3.49,0,0,0-3.8-.09l-99.71,55.31a2.55,2.55,0,0,0-.2,4.34q61.68,42.44,127,81.21c81.81,48.51,163.76,96.73,244.3,147.23a1.43,1.43,0,0,0,2.19-1.2l.09-121.7a3.63,3.63,0,0,0-1.83-3.14Q818.64,509.13,686.18,425.47Z" />
      <path d="M801,790.22c-.86,30.81-1.19,61.63-1.27,92.42H609.27q.08-43.49.27-87.07c.08-21.26-17.55-21-35.42-21.14-58.16-.49-116.47.21-174.58-1.26A168,168,0,0,0,354.81,778a7.69,7.69,0,0,0-5.88,7.51l.27,97.11H158.62L158.15,745a7.68,7.68,0,0,1,3.72-6.57L471.44,551.94a10.57,10.57,0,0,1,10.65-.12q154.32,87.66,308.23,179.92C803.71,739.78,801.42,776.72,801,790.22Z" />
    </svg>
  );
}

/**
 * Kiataka lockup, Property Manager style: the house mark on a rounded tile next to "KIATAKA".
 * - default: purple tile, white mark, dark text (light surfaces)
 * - inverted: yellow tile, purple mark, white text (dark purple panels)
 */
export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", inverted ? "bg-brand-yellow" : "bg-primary")}>
        <KiatakaMark className={cn("h-5 w-auto", inverted ? "text-primary" : "text-white")} />
      </span>
      <div className="leading-none">
        <div className={cn("text-lg font-bold tracking-tight", inverted ? "text-white" : "text-foreground")}>KIATAKA</div>
        <div className={cn("mt-0.5 text-[10px]", inverted ? "text-white/70" : "text-muted-foreground")}>Stays Partners</div>
      </div>
    </div>
  );
}

/**
 * Page title bar. Like the Property Manager console it spans the full content width
 * with a divider underneath; the negative margins cancel the layout's padding.
 */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="-mx-5 -mt-6 mb-6 flex flex-col gap-4 border-b px-5 py-5 sm:-mx-8 sm:px-8 sm:flex-row sm:items-center sm:justify-between xl:-mx-10 xl:px-10">
      <div className="min-w-0">
        <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-[28px] sm:leading-9">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin text-primary" /> {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-input bg-card px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </span>
      <h3 className="mt-3 font-bold">We couldn't load this</h3>
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

/** Property Manager empty state: soft yellow medallion, bold title, grey copy. */
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-input bg-card px-6 py-14 text-center">
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-yellow-soft ring-8 ring-brand-yellow-soft/60">
          <Inbox className="h-9 w-9 text-[#d9a507]" />
        </div>
        <Sparkles className="absolute -right-3 -top-1 h-4 w-4 text-brand-yellow" />
        <Sparkles className="absolute -bottom-1 -left-3 h-3 w-3 text-brand-yellow" />
      </div>
      <h3 className="mt-5 font-bold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// Outlined chips, as used for statuses in the Property Manager console.
const GOOD = "border-success/40 bg-success/10 text-success";
const WAIT = "border-warning/50 bg-warning/10 text-[#b45309]";
const BAD = "border-destructive/40 bg-destructive/10 text-destructive";
const INFO = "border-primary/30 bg-primary/5 text-primary";
const IDLE = "border-input bg-muted text-muted-foreground";
const tone: Record<string, string> = {
  live: GOOD,
  approved: GOOD,
  confirmed: GOOD,
  paid: GOOD,
  verified: GOOD,
  completed: INFO,
  checked_in: INFO,
  processing: INFO,
  pay_on_arrival: INFO,
  pending: WAIT,
  pending_review: WAIT,
  under_review: WAIT,
  requested: WAIT,
  pending_payment: WAIT,
  partially_paid: WAIT,
  draft: IDLE,
  expired: IDLE,
  refunded: IDLE,
  unpaid: IDLE,
  not_started: IDLE,
  suspended: BAD,
  rejected: BAD,
  cancelled: BAD,
  declined: BAD,
  failed: BAD,
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium capitalize", tone[status] ?? IDLE)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

const AUTH_POINTS = [
  "List hotel rooms and shortlet apartments in minutes.",
  "Guests book and pay through Kiataka — no chasing transfers.",
  "Block dates you've sold elsewhere so you're never double-booked.",
  "Withdraw your earnings to your verified bank account.",
];

/** Sign-in style layout from the Property Manager console: purple story panel + white form card. */
export function AuthLayout({ title, subtitle, eyebrow, children }: { title: string; subtitle?: string; eyebrow?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-3">
      <div className="hidden flex-col bg-gradient-to-t from-[#17003f] via-[#2c0e4e] to-[#4e1f70] px-10 py-10 text-white lg:flex">
        <Logo inverted className="mb-12" />
        <h2 className="mb-3 text-2xl font-bold">Your rooms. Your calendar. Your payouts.</h2>
        <p className="mb-10 text-sm text-[#ccc3db]">Manage your hotel rooms and shortlet apartments on Kiataka Stays — all in one place.</p>
        <ul className="mb-auto space-y-4">
          {AUTH_POINTS.map((t) => (
            <li key={t} className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#d9a507]" />
              <span className="text-sm text-[#ccc3db]">{t}</span>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-xs text-[#7963a1]">© {new Date().getFullYear()} Kiataka</p>
      </div>
      <div className="flex items-center justify-center px-5 py-10 lg:col-span-2 lg:bg-gray-50 lg:px-16 lg:py-16">
        <div className="w-full max-w-xl rounded-2xl py-4 lg:border lg:border-border lg:bg-white lg:px-10 lg:py-10 lg:shadow-sm">
          <Logo className="mb-8 lg:hidden" />
          {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>}
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Property Manager "operational snapshot" card. */
export function StatCard({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-input bg-card p-6">
      <div className="flex items-center gap-2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-4 text-[28px] font-bold leading-none tracking-tight">{value}</div>
    </div>
  );
}
