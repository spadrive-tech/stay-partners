import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BedDouble, CalendarClock, DoorOpen, Plus, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState, PageHeader, StatCard } from "@/components/portal/shared";
import { api, formatNaira, type Summary } from "@/lib/api";

export const Route = createFileRoute("/_portal/dashboard")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Dashboard — Kiataka Stays Partners" },
      { name: "description", content: "Overview of your listings, check-ins and earnings." },
      { property: "og:title", content: "Dashboard — Kiataka Stays Partners" },
      { property: "og:description", content: "Overview of your listings, check-ins and earnings." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const q = useQuery({ queryKey: ["summary"], queryFn: () => api<Summary>("/stays/partner/summary") });
  const s = q.data;
  return (
    <>
      <PageHeader
        title="Dashboard"
        description={new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        actions={
          <Button asChild>
            <Link to="/listings/new"><Plus className="h-4 w-4" /> New listing</Link>
          </Button>
        }
      />
      {q.isLoading ? (
        <LoadingState />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Total listings" value={s?.total_listings ?? 0} icon={<BedDouble className="h-4 w-4" />} />
          <StatCard label="Units vacant today" value={s?.units_vacant_today ?? 0} icon={<DoorOpen className="h-4 w-4" />} />
          <StatCard label="Upcoming check-ins" value={s?.upcoming_checkins ?? 0} icon={<CalendarClock className="h-4 w-4" />} />
          <StatCard label="Earnings this month" value={formatNaira(s?.earnings_this_month)} icon={<TrendingUp className="h-4 w-4" />} />
          <div className="rounded-xl bg-brand-gradient p-5 text-primary-foreground shadow-card sm:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-80">Pending payout balance</span>
              <Wallet className="h-5 w-5 opacity-80" />
            </div>
            <div className="mt-4 text-3xl font-semibold">{formatNaira(s?.pending_payout_balance)}</div>
            <Button asChild variant="secondary" size="sm" className="mt-4">
              <Link to="/payouts">View payouts</Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
