import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Pause, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/portal/shared";
import { ListingForm } from "@/components/portal/ListingForm";
import { PricingRulesForm } from "@/components/portal/PricingRulesForm";
import { MediaManager } from "@/components/portal/MediaManager";
import { AvailabilityCalendar } from "@/components/portal/AvailabilityCalendar";
import { ShareListing } from "@/components/portal/ShareListing";
import { RentalDetailsForm } from "@/components/portal/RentalDetailsForm";
import { api, listingTypeLabel, SUPPORT_EMAIL, type Listing } from "@/lib/api";

export const Route = createFileRoute("/_portal/listings/$id")({
  validateSearch: z.object({ tab: z.enum(["details", "pricing", "media", "availability"]).optional() }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Edit listing — Kiataka Stays Partners" },
      { name: "description", content: "Edit listing details, photos, videos and availability." },
      { property: "og:title", content: "Edit listing — Kiataka Stays Partners" },
      { property: "og:description", content: "Edit listing details, media and availability." },
    ],
  }),
  component: ListingDetail,
});

function ListingDetail() {
  const { id } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["listing", id], queryFn: () => api<Listing>(`/stays/partner/listings/${id}`) });
  const [busy, setBusy] = useState(false);

  async function action(path: string, ok: string) {
    setBusy(true);
    try {
      await api(`/stays/partner/listings/${id}/${path}`, { method: "POST" });
      toast.success(ok);
      q.refetch();
      qc.invalidateQueries({ queryKey: ["listings"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  type Tab = "details" | "pricing" | "media" | "availability";
  const go = (t: Tab) => { navigate({ search: { tab: t }, replace: true }); window.scrollTo({ top: 0 }); };
  const Next = ({ to, label }: { to: Tab; label: string }) => (
    <div className="mt-8 flex justify-end border-t pt-6"><Button onClick={() => go(to)}>{label} <ArrowRight className="h-4 w-4" /></Button></div>
  );

  if (q.isLoading) return <LoadingState />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const l = q.data;

  return (
    <>
      <Link to="/listings" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> All listings
      </Link>
      <PageHeader
        title={l.title}
        description={`${listingTypeLabel(l.type)} · ${l.city ?? ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={l.status} />
            <ShareListing listing={l} />
            {l.status === "draft" && (
              <Button onClick={() => action("submit", "Sent to Kiataka for review")} disabled={busy}>
                <Send className="h-4 w-4" /> Submit for review
              </Button>
            )}
            {l.status === "live" && (
              <Button variant="outline" onClick={() => action("pause", "Listing paused (moved to draft)")} disabled={busy}>
                <Pause className="h-4 w-4" /> Pause
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-destructive hover:text-destructive" disabled={busy}>
                  <Trash2 className="h-4 w-4" /> Request removal
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Request removal?</AlertDialogTitle>
                  <AlertDialogDescription>The Kiataka team will review and remove this listing. Existing confirmed bookings will still be honoured.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => action("request-removal", "Removal requested")}>Request removal</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />

      {l.status === "suspended" && (
        <div className="mb-6 flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">This listing has been suspended by Kiataka</p>
            <p className="mt-1 text-muted-foreground">
              {l.suspension_reason ? `${l.suspension_reason} ` : ""}Guests can't book it right now. Contact{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-primary underline">{SUPPORT_EMAIL}</a> to resolve this.
            </p>
          </div>
        </div>
      )}

      <Tabs value={tab ?? "details"} onValueChange={(t) => go(t as Tab)}>
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="pricing">{l.type === "yearly_rental" ? "Rental terms" : "Pricing & rules"}</TabsTrigger>
          <TabsTrigger value="media">Photos & videos</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
        </TabsList>
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-card sm:p-8">
          <TabsContent value="details" className="mt-0">
            <ListingForm
              key={l.id}
              initial={l}
              submitLabel="Save & continue"
              onSubmit={async (v) => {
                try {
                  await api(`/stays/partner/listings/${id}`, { method: "PUT", body: v });
                  toast.success("Listing saved");
                  q.refetch();
                  go("pricing");
                  qc.invalidateQueries({ queryKey: ["listings"] });
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Couldn't save");
                }
              }}
            />
          </TabsContent>
          <TabsContent value="pricing" className="mt-0">
            {l.type === "yearly_rental" ? <RentalDetailsForm listing={l} key={l.id} onSaved={() => { q.refetch(); go("media"); }} /> : <PricingRulesForm
              key={l.id}
              listing={l}
              onSaved={() => { q.refetch(); go("media"); }}
            />}
          </TabsContent>
          <TabsContent value="media" className="mt-0">
            <MediaManager listingId={id} media={l.media ?? []} roomTypes={l.type === "hotel_room" ? (l.room_types ?? []).map((r) => r.name).filter(Boolean) : undefined} />
            <Next to="availability" label="Continue to availability" />
          </TabsContent>
          <TabsContent value="availability" className="mt-0">
            {l.type === "yearly_rental" ? <RentalDetailsForm key={l.id} listing={l} availabilityOnly onSaved={() => { q.refetch(); }} /> : <AvailabilityCalendar listingId={id} />}
            <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t pt-6">
              {l.status === "draft" && <span className="text-sm text-muted-foreground">All set? Send it to Kiataka for review.</span>}
              {l.status === "draft" ? (
                <Button onClick={() => action("submit", "Sent to Kiataka for review")} disabled={busy}><Send className="h-4 w-4" /> Submit for review</Button>
              ) : (
                <Button asChild><Link to="/listings"><CheckCircle2 className="h-4 w-4" /> Done</Link></Button>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </>
  );
}
