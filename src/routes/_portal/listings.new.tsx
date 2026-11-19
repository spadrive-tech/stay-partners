import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/portal/shared";
import { ListingForm } from "@/components/portal/ListingForm";
import { createStayListing, saveDetails } from "@/lib/stay";

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
      <PageHeader title="New listing" description="Hotels and shortlet apartments." />
      <div className="rounded-2xl border border-input bg-card p-6 sm:p-8">
        <ListingForm
          submitLabel="Create draft"
          onSubmit={async (v) => {
            let id: string;
            try {
              id = await createStayListing();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Couldn't create listing");
              return;
            }
            qc.invalidateQueries({ queryKey: ["listings"] });
            qc.invalidateQueries({ queryKey: ["onboarding"] });
            try {
              await saveDetails(id, v);
              toast.success("Draft created");
              navigate({ to: "/listings/$id", params: { id }, search: { tab: "pricing" } });
            } catch (err) {
              // The draft exists; send them to it so nothing typed is wasted.
              toast.error(err instanceof Error ? `Draft created, but details didn't save: ${err.message}` : "Draft created, but details didn't save");
              navigate({ to: "/listings/$id", params: { id }, search: { tab: "details" } });
            }
          }}
        />
      </div>
    </div>
  );
}
