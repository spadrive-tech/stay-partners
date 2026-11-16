import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DescriptionAssistant } from "./DescriptionAssistant";
import { AMENITIES, APARTMENT_TYPES, type Listing } from "@/lib/api";

export type ListingInput = Pick<Listing, "title" | "type" | "description" | "city" | "address" | "nightly_rate" | "units" | "amenities" | "house_rules"> & { apartment_type?: string | undefined; annual_rent?: number | undefined };

export function ListingForm({ initial, onSubmit, submitLabel, disabled }: { initial?: Partial<Listing>; onSubmit: (v: ListingInput) => Promise<void>; submitLabel: string; disabled?: boolean }) {
  const [v, setV] = useState<ListingInput>({
    title: initial?.title ?? "",
    type: initial?.type ?? "shortlet",
    description: initial?.description ?? "",
    city: initial?.city ?? "",
    address: initial?.address ?? "",
    nightly_rate: initial?.nightly_rate ?? 0,
    units: initial?.units ?? 1,
    amenities: initial?.amenities ?? [],
    house_rules: initial?.house_rules ?? "",
    apartment_type: initial?.apartment_type ?? "",
    annual_rent: initial?.annual_rent ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ListingInput>(k: K, val: ListingInput[K]) => setV((p) => ({ ...p, [k]: val }));

  return (
    <form
      className="grid gap-5 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (v.type !== "hotel_room" && !v.apartment_type) {
          toast.error("Choose the apartment type.");
          return;
        }
        setSaving(true);
        try {
          await onSubmit({ ...v, nightly_rate: v.type === "yearly_rental" ? 0 : v.nightly_rate, annual_rent: v.type === "yearly_rental" ? v.annual_rent : undefined });
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="space-y-2 sm:col-span-2">
        <Label>Title</Label>
        <Input required value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Deluxe 2-bed apartment, Lekki Phase 1" />
      </div>
      <div className="space-y-2">
        <Label>Type</Label>
        <Select
          value={v.type}
          onValueChange={(t) => {
            const nt = t as ListingInput["type"];
            setV((p) => ({ ...p, type: nt, apartment_type: nt !== "hotel_room" ? p.apartment_type : "" }));
          }}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hotel_room">Hotel room</SelectItem>
            <SelectItem value="shortlet">Shortlet apartment</SelectItem>
            <SelectItem value="yearly_rental">Yearly rental apartment</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {v.type !== "hotel_room" && (
        <div className="space-y-2">
          <Label>Apartment type</Label>
          <Select {...(v.apartment_type ? { value: v.apartment_type } : {})} onValueChange={(t) => set("apartment_type", t)}>
            <SelectTrigger><SelectValue placeholder="Select apartment type" /></SelectTrigger>
            <SelectContent>
              {APARTMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
              {v.apartment_type && !APARTMENT_TYPES.includes(v.apartment_type) && (
                <SelectItem value={v.apartment_type}>{v.apartment_type}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label>City</Label>
        <Input required value={v.city} onChange={(e) => set("city", e.target.value)} placeholder="Lagos" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Address</Label>
        <Input required value={v.address} onChange={(e) => set("address", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="listing-price">{v.type === "yearly_rental" ? "Yearly rent (₦)" : "Nightly rate (₦)"}</Label>
        <Input id="listing-price" required type="number" min={1} step="any" value={(v.type === "yearly_rental" ? v.annual_rent : v.nightly_rate) || ""} onChange={(e) => set(v.type === "yearly_rental" ? "annual_rent" : "nightly_rate", Number(e.target.value))} />
      </div>
      <div className="space-y-2">
        <Label>Number of units</Label>
        <Input required type="number" min={1} value={v.units} onChange={(e) => set("units", Number(e.target.value))} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Description</Label>
        <Textarea rows={5} value={v.description} onChange={(e) => set("description", e.target.value)} />
        {v.type !== "yearly_rental" && <DescriptionAssistant values={{ ...v, type: v.type }} onUse={(t) => set("description", t)} />}
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
        <Textarea rows={4} value={v.house_rules} onChange={(e) => set("house_rules", e.target.value)} placeholder="No parties, check-in from 2pm…" />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving || disabled}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} {submitLabel}
        </Button>
      </div>
    </form>
  );
}
