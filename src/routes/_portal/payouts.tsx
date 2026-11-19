import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Clock, Landmark, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/portal/shared";
import { KycForm } from "@/components/portal/KycForm";
import { formatDate, formatNaira } from "@/lib/api";
import { bankAccountQuery } from "@/lib/queries";
import {
  amount, cancelStayPayout, LEDGER_LABEL, listStayLedger, listStayPayouts, MIN_PAYOUT, requestStayPayout, walletQuery,
} from "@/lib/stay";

export const Route = createFileRoute("/_portal/payouts")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Payouts — Kiataka Stays Partners" },
      { name: "description", content: "See your earnings and request payouts." },
      { property: "og:title", content: "Payouts — Kiataka Stays Partners" },
      { property: "og:description", content: "See your earnings and request payouts." },
    ],
  }),
  component: PayoutsPage,
});

function PayoutsPage() {
  const qc = useQueryClient();
  const wallet = useQuery(walletQuery);
  const bankAccount = useQuery(bankAccountQuery);
  const ledger = useQuery({ queryKey: ["ledger"], queryFn: listStayLedger });
  const payouts = useQuery({ queryKey: ["payouts"], queryFn: listStayPayouts });
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState<number | null>(null);

  const w = wallet.data;
  const available = amount(w?.available_earnings);
  const kyc = w?.kyc_status ?? "not_started";
  const kycVerified = kyc === "verified";
  const owes = amount(w?.refund_liability);
  const acct = bankAccount.data;
  const bankReady = !!acct && acct.verification_status === "verified" && acct.is_active !== false;
  const canRequest = kycVerified && bankReady && owes <= 0 && available >= MIN_PAYOUT;

  const refreshMoney = () => {
    qc.invalidateQueries({ queryKey: ["wallet"] });
    qc.invalidateQueries({ queryKey: ["summary"] });
    qc.invalidateQueries({ queryKey: ["ledger"] });
    qc.invalidateQueries({ queryKey: ["payouts"] });
  };

  async function request() {
    const n = Number(value);
    if (!Number.isFinite(n) || n < MIN_PAYOUT) { toast.error(`The minimum payout is ${formatNaira(MIN_PAYOUT)}.`); return; }
    if (n > available) { toast.error(`You can withdraw up to ${formatNaira(available)}.`); return; }
    if (!acct) return;
    setSending(true);
    try {
      await requestStayPayout(Math.round(n * 100) / 100, acct.id);
      toast.success("Payout requested — Kiataka will review it shortly");
      setOpen(false);
      refreshMoney();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't request payout");
    } finally {
      setSending(false);
    }
  }

  async function cancel(id: number) {
    if (!confirm("Cancel this payout request? The amount goes back to your available balance.")) return;
    setCancelling(id);
    try {
      await cancelStayPayout(id);
      toast.success("Payout request cancelled");
      refreshMoney();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't cancel");
    } finally {
      setCancelling(null);
    }
  }

  const blocker = !kycVerified
    ? "Verify your identity below to withdraw."
    : !bankReady
      ? "Add a verified payout bank account to withdraw."
      : owes > 0
        ? `Settle the ${formatNaira(owes)} refund owed to Kiataka before withdrawing.`
        : available < MIN_PAYOUT
          ? `You can withdraw once you have at least ${formatNaira(MIN_PAYOUT)} available.`
          : null;

  return (
    <>
      <PageHeader title="Payouts & earnings" description="Your earnings after Kiataka's commission, and payout history." />

      {wallet.isLoading ? <LoadingState /> : wallet.error ? <ErrorState error={wallet.error} onRetry={() => wallet.refetch()} /> : (
        <>
          <div className="mb-4 flex flex-col gap-4 rounded-2xl bg-brand-gradient p-6 text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest opacity-80">Available to withdraw</div>
              <div className="mt-2 text-4xl font-bold">{formatNaira(available)}</div>
              {blocker && <div className="mt-2 text-sm opacity-90">{blocker}</div>}
            </div>
            <Button variant="accent" size="lg" disabled={!canRequest} onClick={() => { setValue(String(available)); setOpen(true); }}>Request payout</Button>
          </div>
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            <Mini label="Pending (stays not yet completed)" value={formatNaira(amount(w?.pending_earnings))} />
            <Mini label="Requested, awaiting payout" value={formatNaira(amount(w?.reserved_payout))} />
            <Mini label="Paid out so far" value={formatNaira(amount(w?.total_paid_out))} />
          </div>

          {owes > 0 && (
            <div className="mb-8 flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
              <p>You owe Kiataka <span className="font-semibold">{formatNaira(owes)}</span> from refunds on earnings already paid out. Payouts are paused until it's settled — contact support to arrange this.</p>
            </div>
          )}

          {!kycVerified && (
            <section className="mb-10 rounded-2xl border border-input bg-card p-6 sm:p-8">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">Verify your identity</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Kiataka needs this once before your first payout.</p>
                </div>
                <StatusBadge status={kyc} />
              </div>
              {kyc === "pending" ? (
                <p className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-warning" /> Your details are being reviewed. We'll email you once you're verified.</p>
              ) : (
                <>
                  {kyc === "rejected" && <p className="mb-4 text-sm text-destructive">We couldn't verify your previous details. Please check them and submit again.</p>}
                  <KycForm />
                </>
              )}
            </section>
          )}
          {kycVerified && (
            <p className="mb-8 flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-success" /> Identity verified for payouts.</p>
          )}
        </>
      )}

      <h2 className="mb-3 text-lg font-bold">Payout requests</h2>
      {payouts.isLoading ? <LoadingState /> : payouts.error ? <ErrorState error={payouts.error} onRetry={() => payouts.refetch()} /> : !payouts.data?.length ? (
        <EmptyState title="No payouts yet" description="Request a payout once you have an available balance." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-input bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Requested</TableHead><TableHead>To</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {payouts.data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDate(p.requested_at)}<div className="text-xs text-muted-foreground">{p.payout_reference}</div></TableCell>
                  <TableCell>{p.bank_name} · {p.account_number_masked}</TableCell>
                  <TableCell className="text-right font-medium">{formatNaira(amount(p.amount))}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                    {(p.rejection_reason || (p.status === "failed" && p.failure_reason)) && (
                      <div className="mt-1 max-w-56 text-xs text-muted-foreground">{p.rejection_reason ?? p.failure_reason}</div>
                    )}
                    {p.paid_at && <div className="mt-1 text-xs text-muted-foreground">Paid {formatDate(p.paid_at)}</div>}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.status === "pending" && (
                      <Button size="sm" variant="ghost" onClick={() => cancel(p.id)} disabled={cancelling === p.id}>
                        {cancelling === p.id && <Loader2 className="h-4 w-4 animate-spin" />} Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <h2 className="mb-3 mt-10 text-lg font-bold">Wallet activity</h2>
      {ledger.isLoading ? <LoadingState /> : ledger.error ? <ErrorState error={ledger.error} onRetry={() => ledger.refetch()} /> : !ledger.data?.length ? (
        <EmptyState title="No activity yet" description="Earnings from paid bookings, payouts and refunds will appear here." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-input bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Activity</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {ledger.data.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(t.created_at)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{LEDGER_LABEL[t.category] ?? t.category.replace(/_/g, " ")}</div>
                    {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
                  </TableCell>
                  <TableCell className={t.direction === "credit" ? "text-right font-semibold text-success" : "text-right font-medium text-muted-foreground"}>
                    {t.direction === "credit" ? "+" : "−"}{formatNaira(amount(t.amount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request payout</DialogTitle>
            <DialogDescription>Kiataka reviews each request, then sends it to your bank account. You have {formatNaira(available)} available.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="payout-amount">Amount (₦)</Label>
            <Input id="payout-amount" type="number" min={MIN_PAYOUT} max={available} step="any" value={value} onChange={(e) => setValue(e.target.value)} />
            <p className="text-xs text-muted-foreground">Minimum {formatNaira(MIN_PAYOUT)}.</p>
          </div>
          {acct ? (
            <div className="flex items-center gap-3 rounded-lg border bg-muted p-4">
              <Landmark className="h-5 w-5 text-primary" />
              <div className="text-sm"><div className="font-medium">{acct.account_name}</div><div className="text-muted-foreground">{acct.bank_name} · {acct.account_number_masked}</div></div>
            </div>
          ) : (
            <p className="text-sm">You haven't added a bank account yet. <Link to="/profile" className="font-medium text-primary underline">Add one in Profile</Link>.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={request} disabled={sending || !acct}>{sending && <Loader2 className="h-4 w-4 animate-spin" />} Confirm request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-input bg-card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-xl font-bold">{value}</div>
    </div>
  );
}
