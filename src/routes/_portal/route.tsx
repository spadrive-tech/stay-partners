import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";
import { BedDouble, CalendarCheck, CalendarDays, LayoutDashboard, LifeBuoy, LogOut, Menu, User, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LoadingState, Logo } from "@/components/portal/shared";
import { logout as endSession, session } from "@/lib/api";
import { onboardingQuery, profileQuery } from "@/lib/queries";

export const Route = createFileRoute("/_portal")({
  ssr: false,
  beforeLoad: () => {
    if (!session.getToken()) throw redirect({ to: "/login" });
  },
  component: PortalLayout,
});

const NAV_SECTIONS = [
  { label: "Primary", items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Stays",
    items: [
      { to: "/listings", label: "Listings", icon: BedDouble },
      { to: "/availability", label: "Availability", icon: CalendarDays },
      { to: "/bookings", label: "Bookings", icon: CalendarCheck },
    ],
  },
  { label: "Finances", items: [{ to: "/payouts", label: "Payouts", icon: Wallet }] },
  { label: "Account", items: [{ to: "/profile", label: "Profile", icon: User }] },
] as const;

/** Pages a partner can use before onboarding is complete; everything else sends them to /onboarding. */
const ONBOARDING_ALLOWED = ["/onboarding", "/listings", "/profile"];



function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "K";
}

/** Property Manager sidebar: logo card, grouped links, active pill with a yellow edge, account card. */
function SideNav({ name, email, onNavigate, onLogout }: { name: string; email?: string | undefined; onNavigate?: () => void; onLogout: () => void }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto border-r border-border bg-white px-4 py-6">
      <div className="rounded-xl border border-input p-3">
        <Logo />
      </div>
      <nav className="mt-10 flex-1 space-y-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="space-y-2">
            <p className="text-xs uppercase text-muted-foreground">{section.label}</p>
            <div className="space-y-1">
              {section.items.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={onNavigate}
                  className="flex items-center gap-3 rounded-xl border-l-4 border-transparent px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-gray-100"
                  activeProps={{ className: "!border-brand-yellow bg-primary !text-white font-semibold hover:bg-primary" }}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} /> {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <a href="mailto:support@usekiataka.com" className="mt-8 flex items-center gap-2 px-1 text-xs text-muted-foreground hover:text-primary">
        <LifeBuoy className="h-4 w-4" /> Help &amp; support
      </a>
      <div className="mt-3 space-y-4 rounded-2xl bg-primary p-4 text-white">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-yellow text-xs font-bold text-primary">{initials(name)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold uppercase">{name}</p>
            {email && <p className="truncate text-xs text-white/75">{email}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 py-2 text-sm font-medium transition-colors hover:bg-white/20"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </div>
  );
}

function PortalLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const cached = useSyncExternalStore(session.subscribe, session.getPartner, () => null);
  const onboarding = useQuery(onboardingQuery);
  const profile = useQuery(profileQuery);
  const name = onboarding.data?.business_name ?? profile.data?.business_name ?? cached?.business_name ?? "Partner";
  const email = profile.data?.email;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const allowed = ONBOARDING_ALLOWED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  // If the status can't be loaded, don't lock the partner out; the pages show their own errors.
  const mustOnboard = !allowed && onboarding.data?.onboarding.completed === false;
  const checking = !allowed && onboarding.isLoading;

  useEffect(() => {
    if (mustOnboard) navigate({ to: "/onboarding", replace: true });
  }, [mustOnboard, navigate]);

  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await endSession();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-white lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SideNav name={name} email={email} onLogout={logout} />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SideNav name={name} email={email} onNavigate={() => setOpen(false)} onLogout={logout} />
        </SheetContent>
      </Sheet>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/90 px-4 backdrop-blur lg:hidden">
        <Logo />
        <Button variant="outline" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </header>
      <main className="px-5 py-6 sm:px-8 xl:px-10">
        {checking || mustOnboard ? <LoadingState /> : <Outlet />}
      </main>
    </div>
  );
}
