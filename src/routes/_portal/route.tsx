import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useSyncExternalStore } from "react";
import { BedDouble, CalendarCheck, CalendarDays, LayoutDashboard, LogOut, Menu, User, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Logo } from "@/components/portal/shared";
import { logout as endSession, session } from "@/lib/api";
import { meQuery } from "@/lib/queries";

export const Route = createFileRoute("/_portal")({
  ssr: false,
  beforeLoad: () => {
    if (!session.getToken()) throw redirect({ to: "/login" });
  },
  component: PortalLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/listings", label: "Listings", icon: BedDouble },
  { to: "/availability", label: "Availability", icon: CalendarDays },
  { to: "/bookings", label: "Bookings & requests", icon: CalendarCheck },
  { to: "/payouts", label: "Payouts", icon: Wallet },
  { to: "/profile", label: "Profile", icon: User },
] as const;



function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar p-5">
      <Logo inverted className="mb-10 px-2" />
      <nav className="flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
          >
            <Icon className="h-4 w-4" /> {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto rounded-lg border border-sidebar-border p-4 text-xs text-sidebar-foreground">
        Need help? <a className="font-medium text-sidebar-primary underline" href="mailto:support@usekiataka.com">support@usekiataka.com</a>
      </div>
    </div>
  );
}

function PortalLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const cached = useSyncExternalStore(session.subscribe, session.getPartner, () => null);
  const me = useQuery(meQuery);
  const name = me.data?.business_name ?? cached?.business_name ?? "Partner";

  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await endSession();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <SideNav />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 border-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SideNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur sm:px-8">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex-1 truncate">
          <div className="text-xs text-muted-foreground">Signed in as</div>
          <div className="truncate text-sm font-semibold">{name}</div>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" /> Log out
        </Button>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}