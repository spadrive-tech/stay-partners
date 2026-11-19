import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Search } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/portal/shared";
import { formatDate, formatNaira } from "@/lib/api";
import { amount, bookingsQuery, canComplete, completeStayBooking, listingsQuery, type StayBooking } from "@/lib/stay";

export const Route = createFileRoute("/_portal/bookings")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Bookings — Kiataka Stays Partners" },
      { name: "description", content: "Track guest bookings and mark stays complete." },
      { property: "og:title", content: "Bookings — Kiataka Stays Partners" },
      { property: "og:description", content: "Track guest bookings and mark stays complete." },
    ],
  }),
  component: BookingsPage,
});

const STATUSES = ["confirmed", "checked_in", "pending_payment", "completed", "cancelled", "expired", "refunded"] as const;
const PAYMENT_OPTION: Record<StayBooking["payment_option"], string> = {
  full_payment: "Paid in full",
  deposit: "Deposit",
  pay_on_arrival: "Pay on arrival",
};

function BookingsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState<StayBooking | null>(null);
  const [completing, setCompleting] = useState<number | null>(null);
  const q = useQuery(bookingsQuery);
  const listings = useQuery(listingsQuery);
  const titleOf = (b: StayBooking) => listings.data?.find((l) => l.id === String(b.property_id))?.title || `Listing #${b.property_id}`;

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter(
      (b) =>
        (status === "all" || b.booking_status === status) &&
        (!from || b.check_out > from) &&
        (!to || b.check_in <= to) &&
        (!s || b.booking_reference.toLowerCase().includes(s) || titleOf(b).toLowerCase().includes(s)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data, listings.data, search, status, from, to]);

  async function complete(b: StayBooking) {
    setCompleting(b.id);
    try {
      const updated = await completeStayBooking(b.id);
      toast.success(`${b.booking_reference} marked complete`);
      if (open?.id === b.id) setOpen(updated);
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't complete this booking");
    } finally {
      setCompleting(null);
    }
  }

  const CompleteButton = ({ b, block }: { b: StayBooking; block?: boolean }) =>
    canComplete(b) ? (
      <Button size="sm" className={block ? "w-full" : undefined} onClick={() => complete(b)} disabled={completing === b.id}>
        {completing === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Mark complete
      </Button>
    ) : null;

  return (
    <>
      <PageHeader title="Bookings" description="Guests book and pay through Kiataka. Mark a stay complete after check-out to release your earnings." />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Reference or listing" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Staying from" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Staying to" />
      </div>
      {q.isLoading ? (
        <LoadingState />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !rows.length ? (
        <EmptyState
          title={q.data?.length ? "No bookings match these filters" : "No bookings yet"}
          description={q.data?.length ? "Try clearing the search or dates." : "When guests book your listings on Kiataka, they'll show up here."}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-input bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Listing</TableHead>
                <TableHead>Stay</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id} className="cursor-pointer" onClick={() => setOpen(b)}>
                  <TableCell>
                    <div className="whitespace-nowrap font-medium">{b.booking_reference}</div>
                    <div className="whitespace-nowrap text-xs text-muted-foreground">Booked {formatDate(b.created_at)}</div>
                  </TableCell>
                  <TableCell className="max-w-48 truncate">{titleOf(b)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(b.check_in)} – {formatDate(b.check_out)}
                    <div className="text-xs text-muted-foreground">{b.nights} night{b.nights === 1 ? "" : "s"}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{b.guests} guest{b.guests === 1 ? "" : "s"} · {b.rooms} room{b.rooms === 1 ? "" : "s"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatNaira(amount(b.total_amount))}
                    <span className="block text-xs font-normal text-muted-foreground">{PAYMENT_OPTION[b.payment_option] ?? b.payment_option}</span>
                  </TableCell>
                  <TableCell><StatusBadge status={b.booking_status} /></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end"><CompleteButton b={b} /></div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {open && (
            <>
              <SheetTitle className="mb-1">{open.booking_reference}</SheetTitle>
              <p className="mb-5 text-sm text-muted-foreground">{titleOf(open)}</p>
              <div className="mb-5 flex flex-wrap gap-2">
                <StatusBadge status={open.booking_status} />
                <StatusBadge status={open.payment_status} />
              </div>
              <dl className="space-y-3 text-sm">
                <Row label="Check-in" value={formatDate(open.check_in)} />
                <Row label="Check-out" value={formatDate(open.check_out)} />
                <Row label="Nights" value={String(open.nights)} />
                <Row label="Guests · rooms" value={`${open.guests} · ${open.rooms}`} />
                <Row label="Nightly rate" value={formatNaira(amount(open.nightly_rate))} />
                <Row label="Accommodation" value={formatNaira(amount(open.accommodation_amount))} />
                {amount(open.fees_amount) > 0 && <Row label="Fees" value={formatNaira(amount(open.fees_amount))} />}
                <Row label="Total" value={formatNaira(amount(open.total_amount))} strong />
                <Row label="Payment" value={PAYMENT_OPTION[open.payment_option] ?? open.payment_option} />
                {amount(open.amount_outstanding) > 0 && (
                  <Row label={open.payment_option === "pay_on_arrival" ? "To collect on arrival" : "Balance outstanding"} value={formatNaira(amount(open.amount_outstanding))} />
                )}
              </dl>
              {(open.booking_status === "confirmed" || open.booking_status === "checked_in") && (
                <div className="mt-6">
                  {canComplete(open) ? (
                    <CompleteButton b={open} block />
                  ) : (
                    <p className="text-sm text-muted-foreground">You can mark this stay complete from {formatDate(open.check_out)} (check-out day).</p>
                  )}
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-semibold" : "font-medium"}>{value}</dd>
    </div>
  );
}
