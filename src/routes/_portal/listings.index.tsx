import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ImageOff, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/portal/shared";
import { api, asList, listingPrice, listingTypeLabel, type Listing } from "@/lib/api";

export const Route = createFileRoute("/_portal/listings/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Listings — Kiataka Stays Partners" },
      { name: "description", content: "Manage your hotel rooms and shortlet apartments." },
      { property: "og:title", content: "Listings — Kiataka Stays Partners" },
      { property: "og:description", content: "Manage your hotel rooms and shortlet apartments." },
    ],
  }),
  component: ListingsPage,
});

function ListingsPage() {
  const q = useQuery({ queryKey: ["listings"], queryFn: async () => asList<Listing>(await api("/stays/partner/listings"), "listings") });
  const newBtn = (
    <Button asChild>
      <Link to="/listings/new"><Plus className="h-4 w-4" /> New listing</Link>
    </Button>
  );
  return (
    <>
      <PageHeader title="Listings" description="Your rooms and apartments on Kiataka Stays." actions={newBtn} />
      {q.isLoading ? (
        <LoadingState />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState title="Create your first listing" description="Add a hotel room or shortlet apartment, upload photos, and send it for review." action={newBtn} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {q.data.map((l) => {
            const cover = l.cover_url ?? l.media?.find((m) => m.is_cover)?.url ?? l.media?.find((m) => m.type === "photo")?.url;
            return (
              <Link key={l.id} to="/listings/$id" params={{ id: String(l.id) }} className="group overflow-hidden rounded-xl border bg-card shadow-card transition hover:-translate-y-0.5">
                <div className="aspect-[4/3] bg-muted">
                  {cover ? (
                    <img src={cover} alt={l.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground"><ImageOff className="h-6 w-6" /></div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-snug group-hover:text-primary">{l.title}</h3>
                    <StatusBadge status={l.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                     {listingTypeLabel(l.type)} · {l.city ?? "—"} · {l.units} unit{l.units === 1 ? "" : "s"}
                  </p>
                  <p className="mt-3 text-sm"><span className="font-semibold">{listingPrice(l)}</span> <span className="text-muted-foreground">/ {l.type === "yearly_rental" ? "year" : "night"}</span></p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
