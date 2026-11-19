import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Landmark, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/portal/shared";
import { api, asList, formatDate, formatNaira, type Earning, type Payout } from "@/lib/api";
import { bankAccountQuery } from "@/lib/queries";
import { summaryQuery } from "@/lib/stay";

export const Route = createFileRoute("/_portal/payouts")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Payouts — Kiataka Stays Partners" },
      { name: "description", content: "See your earnings per booking and request payouts." },
      { property: "og:title", content: "Payouts — Kiataka Stays Partners" },
      { property: "og:description", content: "See your earnings and request payouts." },
    ],
  }),
  component: PayoutsPage,
});

function PayoutsPage() {
  const summary = useQuery(summaryQuery);
  const bankAccount = useQuery(bankAccountQuery);
  const earnings = useQuery({ queryKey: ["earnings"], queryFn: async () => asList<Earning>(await api("/stays/partner/earnings"), "earnings") });
  const payouts = useQuery({ queryKey: ["payouts"], queryFn: async () => asList<Payout>(await api("/stays/partner/payouts"), "payouts") });
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const balance = summary.data?.pending_payout_balance ?? 0;
  const acct = bankAccount.data;

  async function request() {
    setSending(true);
    try {
      await api("/stays/partner/payouts", { body: { amount: balance } });
      toast.success("Payout requested");
      setOpen(false);
      payouts.refetch();
      summary.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't request payout");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageHeader title="Payouts & earnings" description="Your earnings after Kiataka's commission, and payout history." />
      <div className="mb-8 flex flex-col gap-4 rounded-2xl bg-brand-gradient p-6 text-primary-foreground shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <div className="text-sm opacity-80">Available balance</div>
          <div className="mt-1 text-4xl font-semibold">{summary.isLoading ? "…" : formatNaira(balance)}</div>
        </div>
        <Button variant="secondary" size="lg" disabled={!balance} onClick={() => setOpen(true)}>Request payout</Button>
      </div>

      <h2 className="mb-3 font-semibold">Earnings per booking</h2>
      {earnings.isLoading ? <LoadingState /> : earnings.error ? <ErrorState error={earnings.error} onRetry={() => earnings.refetch()} /> : !earnings.data?.length ? (
        <EmptyState title="No earnings yet" description="Completed bookings will appear here with your net earnings." />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader><TableRow><TableHead>Booking</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Gross</TableHead><TableHead className="text-right">Kiataka commission</TableHead><TableHead className="text-right">Net to you</TableHead></TableRow></TableHeader>
            <TableBody>
              {earnings.data.map((e) => (
                <TableRow key={e.booking_id}>
                  <TableCell><div className="font-medium">{e.guest_name ?? e.reference}</div><div className="text-xs text-muted-foreground">{e.listing_title}</div></TableCell>
                  <TableCell>{formatDate(e.date)}</TableCell>
                  <TableCell className="text-right">{formatNaira(e.gross)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">−{formatNaira(e.commission)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatNaira(e.net)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <h2 className="mb-3 mt-10 font-semibold">Payout history</h2>
      {payouts.isLoading ? <LoadingState /> : payouts.error ? <ErrorState error={payouts.error} onRetry={() => payouts.refetch()} /> : !payouts.data?.length ? (
        <EmptyState title="No payouts yet" description="Request a payout once you have an available balance." />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader><TableRow><TableHead>Requested</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {payouts.data.map((p) => (
                <TableRow key={p.id}><TableCell>{formatDate(p.created_at)}</TableCell><TableCell className="text-right font-medium">{formatNaira(p.amount)}</TableCell><TableCell><StatusBadge status={p.status} /></TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request payout of {formatNaira(balance)}</DialogTitle>
            <DialogDescription>We'll send it to the bank account on file.</DialogDescription>
          </DialogHeader>
          {acct?.account_number_masked ? (
            <div className="flex items-center gap-3 rounded-lg border bg-muted p-4">
              <Landmark className="h-5 w-5 text-primary" />
              <div className="text-sm"><div className="font-medium">{acct.account_name}</div><div className="text-muted-foreground">{acct.bank_name} · {acct.account_number_masked}</div></div>
            </div>
          ) : (
            <p className="text-sm">You haven't added a bank account yet. <Link to="/profile" className="font-medium text-primary underline">Add one in Profile</Link>.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={request} disabled={sending || !acct?.account_number_masked}>{sending && <Loader2 className="h-4 w-4 animate-spin" />} Confirm request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
