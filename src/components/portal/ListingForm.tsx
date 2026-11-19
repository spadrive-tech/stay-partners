import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DescriptionAssistant } from "./DescriptionAssistant";
import { AMENITIES, type Listing } from "@/lib/api";
import type { DetailsInput } from "@/lib/stay";

/**
 * Listing details (PUT /stay/partners/listings/{id}/details).
 * Prices, units and apartment type are on the Pricing tab, because the
 * backend stores them on room types.
 */
export type ListingInput = DetailsInput & { type: "hotel_room" | "shortlet"; nightly_rate?: number; units?: number };

export function ListingForm({ initial, onSubmit, submitLabel, disabled }: { initial?: Partial<Listing>; onSubmit: (v: ListingInput) => Promise<void>; submitLabel: string; disabled?: boolean }) {
  const [v, setV] = useState<ListingInput>({
    title: initial?.title ?? "",
    type: initial?.type === "hotel_room" ? "hotel_room" : "shortlet",
    description: initial?.description ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    address: initial?.address ?? "",
    amenities: initial?.amenities ?? [],
    house_rules: initial?.house_rules ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ListingInput>(k: K, val: ListingInput[K]) => setV((p) => ({ ...p, [k]: val }));

  return (
    <form
      className="grid gap-5 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await onSubmit(v);
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="space-y-2 sm:col-span-2">
        <Label>Title</Label>
        <Input required maxLength={200} value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Deluxe 2-bed apartment, Lekki Phase 1" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Type</Label>
        <Select value={v.type} onValueChange={(t) => set("type", t as ListingInput["type"])}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hotel_room">Hotel</SelectItem>
            <SelectItem value="shortlet">Shortlet apartment</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>City</Label>
        <Input required maxLength={100} value={v.city} onChange={(e) => set("city", e.target.value)} placeholder="Lagos" />
      </div>
      <div className="space-y-2">
        <Label>State</Label>
        <Input required maxLength={100} value={v.state ?? ""} onChange={(e) => set("state", e.target.value)} placeholder="Lagos" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Address</Label>
        <Input required maxLength={500} value={v.address} onChange={(e) => set("address", e.target.value)} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Description</Label>
        <Textarea rows={5} maxLength={5000} value={v.description} onChange={(e) => set("description", e.target.value)} />
        <DescriptionAssistant values={v} onUse={(t) => set("description", t)} />
      </div>
      <div className="space-y-3 sm:col-span-2">
        <Label>Amenities</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {AMENITIES.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={!!v.amenities?.includes(a)}
                onCheckedChange={(c) => set("amenities", c ? [...(v.amenities ?? []), a] : (v.amenities ?? []).filter((x) => x !== a))}
              />
              {a}
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>House rules</Label>
        <Textarea rows={4} value={v.house_rules} onChange={(e) => set("house_rules", e.target.value)} placeholder={"One rule per line, e.g.\nNo parties\nNo smoking indoors"} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving || disabled}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} {submitLabel}
        </Button>
      </div>
    </form>
  );
}
