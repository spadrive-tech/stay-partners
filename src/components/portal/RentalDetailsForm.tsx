import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, session, type Listing, type RentalDetails } from "@/lib/api";

export function RentalDetailsForm({ listing, onSaved, availabilityOnly = false }: { listing: Listing; onSaved: () => void; availabilityOnly?: boolean }) {
  const partner = session.getPartner();
  const qc = useQueryClient();
  const [v, setV] = useState<RentalDetails>(listing.rental_details ?? {
    availability: "available", available_from: "", bathrooms: 1, furnished: false,
    agent_name: partner?.contact_person ?? "", agent_phone: partner?.phone ?? "", agent_email: partner?.email ?? "",
    applications_enabled: true, inspections_enabled: true, contact_enabled: true, inspection_notes: "", fees: [],
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof RentalDetails>(key: K, value: RentalDetails[K]) => setV((p) => ({ ...p, [key]: value }));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!availabilityOnly && v.fees.some((f) => !f.name.trim() || !Number.isFinite(f.amount) || f.amount <= 0)) {
      toast.error("Add a name and a positive amount for each fee."); return;
    }
    setSaving(true);
    try {
      await api(`/stays/partner/listings/${listing.id}`, { method: "PUT", body: { rental_details: v } });
      await qc.invalidateQueries({ queryKey: ["listings"] });
      await qc.invalidateQueries({ queryKey: ["listing", String(listing.id)] });
      toast.success(availabilityOnly ? "Rental availability saved" : "Rental terms saved"); onSaved();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Couldn't save rental details"); }
    finally { setSaving(false); }
  }
  return <form className="space-y-8" onSubmit={save}>
    <section className="space-y-4">
      <h2 className="font-semibold">Rental availability</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2"><Label>Apartment status</Label><Select value={v.availability} onValueChange={(s) => set("availability", s as RentalDetails["availability"])}><SelectTrigger aria-label="Apartment status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="available">Available</SelectItem><SelectItem value="occupied">Occupied</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="available-from">Available from</Label><Input id="available-from" required={v.availability === "available"} type="date" value={v.available_from} onChange={(e) => set("available_from", e.target.value)} /></div>
      </div>
    </section>
    {!availabilityOnly && <>
      <section className="space-y-4 border-t pt-6"><h2 className="font-semibold">Apartment details</h2><div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="bathrooms">Bathrooms</Label><Input id="bathrooms" type="number" min={1} required value={v.bathrooms} onChange={(e) => set("bathrooms", Number(e.target.value))} /></div>
        <div className="flex items-center justify-between gap-4"><Label htmlFor="furnished">Furnished</Label><Switch id="furnished" checked={v.furnished} onCheckedChange={(s) => set("furnished", s)} /></div>
      </div></section>
      <section className="space-y-4 border-t pt-6"><h2 className="font-semibold">Additional rental fees</h2>
        {v.fees.map((f, i) => <div key={i} className="grid items-end gap-3 sm:grid-cols-[2fr_1fr_auto_auto]">
          <div className="space-y-2"><Label htmlFor={`rental-fee-${i}`}>Fee name</Label><Input id={`rental-fee-${i}`} required value={f.name} onChange={(e) => set("fees", v.fees.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /></div>
          <div className="space-y-2"><Label htmlFor={`rental-amount-${i}`}>Amount (₦)</Label><Input id={`rental-amount-${i}`} required type="number" min={1} value={f.amount || ""} onChange={(e) => set("fees", v.fees.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) } : x))} /></div>
          <div className="flex h-10 items-center gap-2"><Label htmlFor={`refund-${i}`}>Refundable</Label><Switch id={`refund-${i}`} checked={f.refundable} onCheckedChange={(s) => set("fees", v.fees.map((x, j) => j === i ? { ...x, refundable: s } : x))} /></div>
          <Button type="button" size="icon" variant="ghost" aria-label="Remove rental fee" onClick={() => set("fees", v.fees.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
        </div>)}
        <div className="flex flex-wrap gap-2">{["Agency fee", "Legal fee", "Service charge", "Caution fee", "Custom fee"].map((name) => <Button key={name} type="button" size="sm" variant="outline" onClick={() => set("fees", [...v.fees, { name: name === "Custom fee" ? "" : name, amount: 0, refundable: name === "Caution fee" }])}><Plus className="h-4 w-4" />{name}</Button>)}</div>
      </section>
      <section className="space-y-4 border-t pt-6"><h2 className="font-semibold">Agent contact</h2><div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="agent-name">Agent name</Label><Input id="agent-name" required value={v.agent_name} onChange={(e) => set("agent_name", e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="agent-phone">Contact phone</Label><Input id="agent-phone" required type="tel" value={v.agent_phone} onChange={(e) => set("agent_phone", e.target.value)} /></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="agent-email">Contact email (optional)</Label><Input id="agent-email" type="email" value={v.agent_email} onChange={(e) => set("agent_email", e.target.value)} /></div>
      </div></section>
      <section className="space-y-4 border-t pt-6"><h2 className="font-semibold">Tenant enquiries</h2>
        {([ ["applications_enabled", "Accept rental applications"], ["inspections_enabled", "Accept inspection requests"], ["contact_enabled", "Allow direct agent contact"] ] as const).map(([key, label]) => <div key={key} className="flex items-center justify-between gap-4"><Label htmlFor={key}>{label}</Label><Switch id={key} checked={v[key]} onCheckedChange={(s) => set(key, s)} /></div>)}
        {v.inspections_enabled && <div className="space-y-2"><Label htmlFor="inspection-notes">Inspection arrangements</Label><Textarea id="inspection-notes" rows={3} value={v.inspection_notes} onChange={(e) => set("inspection_notes", e.target.value)} /></div>}
      </section>
    </>}
    <div className="flex justify-end"><Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{availabilityOnly ? "Save availability" : "Save & continue"}{!availabilityOnly && <ArrowRight className="h-4 w-4" />}</Button></div>
  </form>;
}