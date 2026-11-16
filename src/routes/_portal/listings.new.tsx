import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/portal/shared";
import { ListingForm } from "@/components/portal/ListingForm";
import { api, type Listing } from "@/lib/api";

export const Route = createFileRoute("/_portal/listings/new")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "New listing — Kiataka Stays Partners" },
      { name: "description", content: "Create a new hotel room or shortlet listing." },
      { property: "og:title", content: "New listing — Kiataka Stays Partners" },
      { property: "og:description", content: "Create a new hotel room or shortlet listing." },
    ],
  }),
  component: NewListing,
});

function NewListing() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return (
    <div className="max-w-3xl">
      <PageHeader title="New listing" description="Hotel rooms, shortlets and yearly rental apartments." />
      <div className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
        <ListingForm
          submitLabel="Create draft"
          onSubmit={async (v) => {
            try {
              const l = await api<Listing>("/stays/partner/listings", { body: v });
              qc.invalidateQueries({ queryKey: ["listings"] });
              toast.success("Draft created");
              if (l?.id) navigate({ to: "/listings/$id", params: { id: String(l.id) }, search: { tab: "pricing" } });
              else navigate({ to: "/listings" });
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Couldn't create listing");
            }
          }}
        />
      </div>
    </div>
  );
}
