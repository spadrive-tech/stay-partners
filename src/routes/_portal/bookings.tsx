import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Search, UserRound, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { GuestProfile } from "@/components/portal/GuestProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/portal/shared";
import { api, asList, formatDate, formatNaira, type Booking } from "@/lib/api";

export const Route = createFileRoute("/_portal/bookings")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Bookings — Kiataka Stays Partners" },
      { name: "description", content: "Review, accept and track guest bookings." },
      { property: "og:title", content: "Bookings — Kiataka Stays Partners" },
      { property: "og:description", content: "Review, accept and track guest bookings." },
    ],
  }),
  component: BookingsPage,
});

function BookingsPage() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState<Booking | null>(null);
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const q = useQuery({
    queryKey: ["bookings", status, from, to],
    queryFn: async () => asList<Booking>(await api(`/stays/partner/bookings?${params}`), "bookings"),
  });
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter((b) => (kind === "all" || (b.request_type ?? "booking") === kind) && (!s || b.guest_name?.toLowerCase().includes(s) || b.reference?.toLowerCase().includes(s)));
  }, [q.data, search, kind]);

  async function respond(id: string, action: "accept" | "decline") {
    try {
      await api(`/stays/partner/bookings/${id}/${action}`, { method: "POST" });
      toast.success(action === "accept" ? "Booking accepted" : "Booking declined");
      setOpen(null);
      q.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <>
      <PageHeader title="Bookings & requests" description="Review stay bookings, rental applications and inspection requests." />
      <div className="mb-4 max-w-xs"><Select value={kind} onValueChange={setKind}><SelectTrigger aria-label="Request type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All requests</SelectItem><SelectItem value="booking">Stay bookings</SelectItem><SelectItem value="rental_application">Rental applications</SelectItem><SelectItem value="inspection">Inspection requests</SelectItem></SelectContent></Select></div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Guest or reference" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["all", "pending", "confirmed", "checked_in", "completed", "cancelled"].map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s === "all" ? "All statuses" : s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
      </div>
      {q.isLoading ? (
        <LoadingState />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !rows.length ? (
        <EmptyState title="No bookings yet" description="When guests book your listings on Kiataka, they'll show up here." />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Listing</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id} className="cursor-pointer" onClick={() => setOpen(b)}>
                  <TableCell>
                    <div className="font-medium">{b.guest_name}</div>
                    <div className="text-xs text-muted-foreground">{b.reference}</div>
                  </TableCell>
                  <TableCell className="max-w-48 truncate">{b.listing_title}</TableCell>
                  <TableCell>{b.request_type === "inspection" ? "Inspection" : b.request_type === "rental_application" ? "Rental application" : "Stay booking"}</TableCell>
                  <TableCell className="whitespace-nowrap">{b.request_type === "inspection" ? formatDate(b.inspection_at) : b.request_type === "rental_application" ? formatDate(b.check_in) : `${formatDate(b.check_in)} – ${formatDate(b.check_out)}`}</TableCell>
                  <TableCell className="text-right font-medium">{b.request_type === "inspection" ? "—" : formatNaira(b.amount)}{b.request_type === "rental_application" && <span className="block text-xs font-normal text-muted-foreground">Yearly rent</span>}</TableCell>
                  <TableCell><StatusBadge status={b.status} /></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setOpen(b)}><UserRound className="h-4 w-4" /> Profile</Button>
                    {b.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => respond(b.id, "accept")}><Check className="h-4 w-4" /> Accept</Button>
                        <Button size="sm" variant="outline" onClick={() => respond(b.id, "decline")} aria-label="Decline"><X className="h-4 w-4" /></Button>
                      </>
                    )}
                    </div>
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
              <SheetTitle className="mb-1">{open.request_type === "inspection" ? "Inspection request" : open.request_type === "rental_application" ? "Rental application" : "Guest profile"}</SheetTitle>
              <p className="mb-5 text-sm text-muted-foreground">{open.listing_title}{open.request_type === "inspection" ? ` · ${open.inspection_at ? new Date(open.inspection_at).toLocaleString("en-NG") : "Date to be agreed"}` : ` · ${formatDate(open.check_in)}${open.request_type === "rental_application" ? " · Proposed move-in" : ` – ${formatDate(open.check_out)}`} · ${formatNaira(open.amount)}`}</p>
              {open.message && <p className="mb-4 border-l-2 border-primary pl-3 text-sm">{open.message}</p>}
              {(open.contact_phone || open.contact_email) && <div className="mb-5 flex flex-wrap gap-2">{open.contact_phone && <Button variant="outline" size="sm" asChild><a href={`tel:${open.contact_phone}`}>Call tenant</a></Button>}{open.contact_email && <Button variant="outline" size="sm" asChild><a href={`mailto:${open.contact_email}`}>Email tenant</a></Button>}</div>}
              <GuestProfile tenantId={open.tenant_id} />
              {open.status === "pending" && (
                <div className="mt-6 flex gap-2">
                  <Button className="flex-1" onClick={() => respond(open.id, "accept")}><Check className="h-4 w-4" /> Accept</Button>
                  <Button className="flex-1" variant="outline" onClick={() => respond(open.id, "decline")}><X className="h-4 w-4" /> Decline</Button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
