import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/portal/shared";
import { ListingForm } from "@/components/portal/ListingForm";
import { PricingRulesForm } from "@/components/portal/PricingRulesForm";
import { MediaManager } from "@/components/portal/MediaManager";
import { AvailabilityCalendar } from "@/components/portal/AvailabilityCalendar";
import { ShareListing } from "@/components/portal/ShareListing";
import { listingTypeLabel, SUPPORT_EMAIL } from "@/lib/api";
import { listingQuery, missingSteps, saveDetails, submitStayListing } from "@/lib/stay";

export const Route = createFileRoute("/_portal/listings/$id")({
  validateSearch: z.object({ tab: z.enum(["details", "pricing", "media", "availability"]).optional() }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Edit listing — Kiataka Stays Partners" },
      { name: "description", content: "Edit listing details, pricing, photos and availability." },
      { property: "og:title", content: "Edit listing — Kiataka Stays Partners" },
      { property: "og:description", content: "Edit listing details, photos and availability." },
    ],
  }),
  component: ListingDetail,
});

function ListingDetail() {
  const { id } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const q = useQuery(listingQuery(id));
  const [busy, setBusy] = useState(false);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["listing", id] });
    qc.invalidateQueries({ queryKey: ["listings"] });
    qc.invalidateQueries({ queryKey: ["onboarding"] });
  };

  async function submit() {
    setBusy(true);
    try {
      await submitStayListing(id);
      toast.success("Sent to Kiataka for review");
      invalidateAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit");
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
  const canSubmit = l.status === "draft" || l.status === "rejected";
  const missing = missingSteps(l.progress);
  const submitButton = (
    <Button onClick={submit} disabled={busy || missing.length > 0} title={missing.length ? `Still to complete: ${missing.join(", ")}` : undefined}>
      <Send className="h-4 w-4" /> {l.status === "rejected" ? "Resubmit for review" : "Submit for review"}
    </Button>
  );

  return (
    <>
      <Link to="/listings" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> All listings
      </Link>
      <PageHeader
        title={l.title || "Untitled draft"}
        description={[listingTypeLabel(l.type), l.city].filter(Boolean).join(" · ")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={l.status} />
            <ShareListing listing={l} />
            {canSubmit && submitButton}
          </div>
        }
      />

      {l.status === "rejected" && (
        <Banner tone="destructive" icon={<AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />} title="Kiataka didn't approve this listing">
          {l.rejection_reason ? `${l.rejection_reason} ` : ""}Make the changes, then resubmit it for review.
        </Banner>
      )}
      {l.status === "pending_review" && (
        <Banner tone="muted" icon={<Clock className="h-5 w-5 shrink-0 text-warning" />} title="Under review">
          Our team is reviewing this listing. We'll email you once it's approved — usually within 2 business days.
        </Banner>
      )}
      {l.status === "suspended" && (
        <Banner tone="destructive" icon={<AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />} title="This listing has been suspended by Kiataka">
          {l.suspension_reason ? `${l.suspension_reason} ` : ""}Guests can't book it right now. Contact{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-primary underline">{SUPPORT_EMAIL}</a> to resolve this.
        </Banner>
      )}
      {canSubmit && missing.length > 0 && (
        <p className="mb-6 text-sm text-muted-foreground">Before you can submit, complete: <span className="font-medium text-foreground">{missing.join(", ")}</span>.</p>
      )}

      <Tabs value={tab ?? "details"} onValueChange={(t) => go(t as Tab)}>
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="pricing">Pricing & rules</TabsTrigger>
          <TabsTrigger value="media">Photos</TabsTrigger>
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
                  await saveDetails(id, v);
                  toast.success("Listing saved");
                  invalidateAll();
                  go("pricing");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Couldn't save");
                }
              }}
            />
          </TabsContent>
          <TabsContent value="pricing" className="mt-0">
            <PricingRulesForm key={`${l.id}-${l.type}`} listing={l} onSaved={() => { invalidateAll(); go("media"); }} />
          </TabsContent>
          <TabsContent value="media" className="mt-0">
            <MediaManager listingId={id} media={l.media ?? []} />
            <Next to="availability" label="Continue to availability" />
          </TabsContent>
          <TabsContent value="availability" className="mt-0">
            <AvailabilityCalendar listingId={id} />
            <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t pt-6">
              {canSubmit ? (
                <>
                  <span className="text-sm text-muted-foreground">
                    {missing.length ? `Still to complete: ${missing.join(", ")}` : "All set? Send it to Kiataka for review."}
                  </span>
                  {submitButton}
                </>
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

function Banner({ tone, icon, title, children }: { tone: "destructive" | "muted"; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className={tone === "destructive" ? "mb-6 flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm" : "mb-6 flex gap-3 rounded-xl border bg-muted/40 p-4 text-sm"}>
      {icon}
      <div>
        <p className={tone === "destructive" ? "font-semibold text-destructive" : "font-semibold"}>{title}</p>
        <p className="mt-1 text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
