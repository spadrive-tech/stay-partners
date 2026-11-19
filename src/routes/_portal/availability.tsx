import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/portal/shared";
import { AvailabilityCalendar } from "@/components/portal/AvailabilityCalendar";
import { listingsQuery } from "@/lib/stay";

export const Route = createFileRoute("/_portal/availability")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Availability — Kiataka Stays Partners" },
      { name: "description", content: "Mark dates as available or occupied for each of your listings." },
      { property: "og:title", content: "Availability — Kiataka Stays Partners" },
      { property: "og:description", content: "Mark dates as available or occupied for each listing." },
    ],
  }),
  component: AvailabilityPage,
});

function AvailabilityPage() {
  const q = useQuery(listingsQuery);
  const [picked, setPicked] = useState<string>();

  if (q.isLoading) return <LoadingState />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const listings = q.data ?? [];
  const id = picked ?? listings[0]?.id;

  return (
    <>
      <PageHeader title="Availability" description="Mark dates as occupied when a room is taken outside Kiataka, or open them up again." />
      {!id ? (
        <EmptyState title="No listings yet" description="Create a listing first, then manage its availability here." />
      ) : (
        <div className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
          <div className="mb-6 max-w-sm">
            <Select value={id} onValueChange={setPicked}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {listings.map((l) => <SelectItem key={l.id} value={l.id}>{l.title || "Untitled draft"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <AvailabilityCalendar key={id} listingId={id} />
        </div>
      )}
    </>
  );
}
