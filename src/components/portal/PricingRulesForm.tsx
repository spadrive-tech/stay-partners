import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { APARTMENT_TYPES, formatNaira, HOTEL_ROOM_TYPES, type CancellationPolicy, type CheckInDetails, type ExtraFee, type Listing, type PaymentTerms, type RoomType } from "@/lib/api";
import { savePolicies, saveRooms } from "@/lib/stay";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-b pb-8 last:border-0">
      <div>
        <h3 className="font-semibold">{title}</h3>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

const num = (s: string) => (s === "" ? 0 : Number(s));

export function PricingRulesForm({ listing, onSaved }: { listing: Listing; onSaved: () => void }) {
  const qc = useQueryClient();
  const isHotel = listing.type === "hotel_room";
  const [maxGuests, setMaxGuests] = useState(listing.max_guests ?? 2);
  const [minNightsOn, setMinNightsOn] = useState((listing.min_nights ?? 1) > 1);
  const [minNights, setMinNights] = useState(Math.max(2, listing.min_nights ?? 2));
  const [fees, setFees] = useState<ExtraFee[]>(listing.extra_fees ?? []);
  const [rooms, setRooms] = useState<RoomType[]>(listing.room_types ?? []);
  // Shortlets are saved as a single room type: apartment type + nightly rate + number of units.
  const firstRoom = listing.room_types?.[0];
  const [apt, setApt] = useState({ name: listing.apartment_type ?? firstRoom?.name ?? "", rate: firstRoom?.nightly_rate ?? 0, units: firstRoom?.units ?? 1 });
  const [pay, setPay] = useState<PaymentTerms>(listing.payment_terms ?? { full_payment: true, deposit: false, deposit_percent: 30, pay_on_arrival: false });
  const [cancel, setCancel] = useState<CancellationPolicy>(listing.cancellation ?? { allowed: true, free_until_days: 2, refund_percent: 100 });
  const [ci, setCi] = useState<CheckInDetails>(listing.check_in ?? { method: "front_desk", check_in_time: "14:00", check_out_time: "12:00" });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!pay.full_payment && !pay.deposit && !pay.pay_on_arrival) {
      toast.error("Pick at least one way guests can pay.");
      return;
    }
    if (pay.deposit && !(pay.deposit_percent && pay.deposit_percent > 0 && pay.deposit_percent < 100)) {
      toast.error("Deposit must be between 1% and 99%.");
      return;
    }
    if (!isHotel && (!apt.name || apt.rate <= 0 || apt.units < 1)) {
      toast.error("Choose the apartment type and set the nightly rate and number of units.");
      return;
    }
    if (isHotel && rooms.length === 0) {
      toast.error("Add at least one room type.");
      return;
    }
    if (fees.some((f) => !f.name.trim() || f.amount <= 0)) {
      toast.error("Give every extra fee a name and an amount.");
      return;
    }
    if (isHotel && rooms.some((r) => !r.name.trim() || r.nightly_rate <= 0 || r.max_guests < 1 || r.units < 1)) {
      toast.error("Complete every room type: name, rate, guests and number of rooms.");
      return;
    }
    setSaving(true);
    try {
      const roomTypes: RoomType[] = isHotel
        ? rooms
        : [{ ...(firstRoom?.id !== undefined ? { id: firstRoom.id } : {}), name: apt.name, nightly_rate: apt.rate, max_guests: maxGuests, units: apt.units }];
      await saveRooms(listing.id, { room_types: roomTypes, fees, max_guests: maxGuests, min_nights: minNightsOn ? minNights : 1 });
      await savePolicies(listing.id, pay, cancel, ci);
      qc.invalidateQueries({ queryKey: ["listings"] });
      qc.invalidateQueries({ queryKey: ["listing", listing.id] });
      qc.invalidateQueries({ queryKey: ["onboarding"] });
      toast.success("Pricing & rules saved");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-8">
      {isHotel && (
        <Section title="Room types" hint="Pick each kind of room you offer from the standard list, then set its own rate and capacity.">
          {rooms.map((r, i) => (
            <div key={i} className="grid items-end gap-3 rounded-lg border p-3 sm:grid-cols-[2fr_1.3fr_1fr_1fr_auto]">
              <div className="space-y-1">
                <Label className="text-xs">Room type</Label>
                <Select {...(r.name ? { value: r.name } : {})} onValueChange={(n) => setRooms(rooms.map((x, j) => (j === i ? { ...x, name: n } : x)))}>
                  <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
                  <SelectContent>
                    {HOTEL_ROOM_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                    {r.name && !HOTEL_ROOM_TYPES.includes(r.name) && <SelectItem value={r.name}>{r.name}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Nightly rate (₦)</Label><Input type="number" min={0} step={500} value={r.nightly_rate || ""} onChange={(e) => setRooms(rooms.map((x, j) => (j === i ? { ...x, nightly_rate: num(e.target.value) } : x)))} /></div>
              <div className="space-y-1"><Label className="text-xs">Max guests</Label><Input type="number" min={1} value={r.max_guests} onChange={(e) => setRooms(rooms.map((x, j) => (j === i ? { ...x, max_guests: num(e.target.value) } : x)))} /></div>
              <div className="space-y-1"><Label className="text-xs">No. of rooms</Label><Input type="number" min={1} value={r.units} onChange={(e) => setRooms(rooms.map((x, j) => (j === i ? { ...x, units: num(e.target.value) } : x)))} /></div>
              <Button type="button" variant="ghost" size="icon" aria-label="Remove room type" onClick={() => setRooms(rooms.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setRooms([...rooms, { name: "", nightly_rate: listing.nightly_rate || 0, max_guests: 2, units: 1 }])}>
            <Plus className="h-4 w-4" /> Add room type
          </Button>
        </Section>
      )}

      {!isHotel && (
        <Section title="Price" hint="What guests pay per night, and how many identical apartments you have.">
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Apartment type</Label>
              <Select {...(apt.name ? { value: apt.name } : {})} onValueChange={(n) => setApt({ ...apt, name: n })}>
                <SelectTrigger><SelectValue placeholder="Select apartment type" /></SelectTrigger>
                <SelectContent>
                  {APARTMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                  {apt.name && !APARTMENT_TYPES.includes(apt.name) && <SelectItem value={apt.name}>{apt.name}</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label htmlFor="apt-rate">Nightly rate (₦)</Label><Input id="apt-rate" type="number" min={1} step="any" value={apt.rate || ""} onChange={(e) => setApt({ ...apt, rate: num(e.target.value) })} required /></div>
            <div className="space-y-2"><Label htmlFor="apt-units">Number of units</Label><Input id="apt-units" type="number" min={1} value={apt.units} onChange={(e) => setApt({ ...apt, units: num(e.target.value) })} required /></div>
          </div>
        </Section>
      )}

      <Section title="Guests & stay length">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Maximum guests{isHotel ? " (per booking)" : ""}</Label>
            <Input type="number" min={1} max={50} value={maxGuests} onChange={(e) => setMaxGuests(num(e.target.value))} required />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label>Minimum nights</Label><Switch checked={minNightsOn} onCheckedChange={setMinNightsOn} /></div>
            {minNightsOn ? (
              <Input type="number" min={2} value={minNights} onChange={(e) => setMinNights(num(e.target.value))} />
            ) : (
              <p className="text-sm text-muted-foreground">One-night bookings are allowed.</p>
            )}
          </div>
        </div>
      </Section>

      <Section title="Extra fees" hint={`On top of the nightly rate${(isHotel ? listing.nightly_rate : apt.rate) ? ` of ${formatNaira(isHotel ? listing.nightly_rate : apt.rate)}` : ""}. Charged once per stay. Add cleaning, caution or any fee of your own.`}>
        {fees.map((f, i) => (
          <div key={i} className="grid items-end gap-3 rounded-lg border p-3 sm:grid-cols-[2fr_1.3fr_auto_auto]">
            <div className="space-y-1"><Label className="text-xs">Fee name</Label><Input value={f.name} placeholder="Cleaning fee" onChange={(e) => setFees(fees.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></div>
            <div className="space-y-1"><Label className="text-xs">Amount (₦)</Label><Input type="number" min={0} step={500} value={f.amount || ""} onChange={(e) => setFees(fees.map((x, j) => (j === i ? { ...x, amount: num(e.target.value) } : x)))} /></div>
            <label className="flex h-10 items-center gap-2 text-sm"><Checkbox checked={f.mandatory ?? true} onCheckedChange={(c) => setFees(fees.map((x, j) => (j === i ? { ...x, mandatory: !!c } : x)))} /> Required</label>
            <Button type="button" variant="ghost" size="icon" aria-label="Remove fee" onClick={() => setFees(fees.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {["Cleaning fee", "Caution fee"].filter((n) => !fees.some((f) => f.name === n)).map((n) => (
            <Button key={n} type="button" variant="outline" size="sm" onClick={() => setFees([...fees, { name: n, amount: 0, charge: "per_stay", fee_type: n === "Caution fee" ? "caution" : "cleaning", mandatory: true }])}><Plus className="h-4 w-4" /> {n}</Button>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setFees([...fees, { name: "", amount: 0, charge: "per_stay", fee_type: "custom", mandatory: true }])}><Plus className="h-4 w-4" /> Custom fee</Button>
        </div>
      </Section>

      <Section title="Payment terms" hint="Choose every way you accept payment.">
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={pay.full_payment} onCheckedChange={(c) => setPay({ ...pay, full_payment: !!c })} /> Full payment when booking</label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={pay.deposit} onCheckedChange={(c) => setPay({ ...pay, deposit: !!c })} /> Deposit now, balance later</label>
            {pay.deposit && (
              <div className="flex items-center gap-2 text-sm"><Input className="w-20" type="number" min={1} max={99} value={pay.deposit_percent ?? ""} onChange={(e) => setPay({ ...pay, deposit_percent: num(e.target.value) })} /> % deposit</div>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={pay.pay_on_arrival} onCheckedChange={(c) => setPay({ ...pay, pay_on_arrival: !!c })} /> Pay on arrival</label>
        </div>
      </Section>

      <Section title="Cancellation">
        <div className="flex items-center gap-3"><Switch checked={cancel.allowed} onCheckedChange={(v) => setCancel({ ...cancel, allowed: v })} /><span className="text-sm">{cancel.allowed ? "Guests can cancel" : "No cancellations — bookings are non-refundable"}</span></div>
        {cancel.allowed && (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2"><Label>Free cancellation up to (days before check-in)</Label><Input type="number" min={0} value={cancel.free_until_days ?? 0} onChange={(e) => setCancel({ ...cancel, free_until_days: num(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Refund within that window (%)</Label><Input type="number" min={0} max={100} value={cancel.refund_percent ?? 100} onChange={(e) => setCancel({ ...cancel, refund_percent: num(e.target.value) })} /></div>
          </div>
        )}
      </Section>

      <Section title="Check-in" hint="How guests get in when they arrive.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Check-in method</Label>
            <Select value={ci.method} onValueChange={(v) => setCi({ ...ci, method: v as CheckInDetails["method"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="front_desk">Front desk</SelectItem>
                <SelectItem value="meet_and_greet">Meet the host</SelectItem>
                <SelectItem value="self_check_in">Self check-in (code / smart lock)</SelectItem>
                <SelectItem value="other">Other (e.g. collect the key)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Arrival contact number</Label><Input required type="tel" placeholder="0803 123 4567" value={ci.contact_phone ?? ""} onChange={(e) => setCi({ ...ci, contact_phone: e.target.value })} /></div>
          <div className="space-y-2"><Label>Check-in from</Label><Input type="time" value={ci.check_in_time ?? ""} onChange={(e) => setCi({ ...ci, check_in_time: e.target.value })} /></div>
          <div className="space-y-2"><Label>Check-out by</Label><Input type="time" value={ci.check_out_time ?? ""} onChange={(e) => setCi({ ...ci, check_out_time: e.target.value })} /></div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Arrival instructions</Label>
            <Textarea rows={3} value={ci.instructions ?? ""} onChange={(e) => setCi({ ...ci, instructions: e.target.value })} placeholder="e.g. Key is with the security man at the gate. The door code is sent on the morning of arrival." />
          </div>
        </div>
      </Section>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save & continue <ArrowRight className="h-4 w-4" /></Button>
      </div>
    </form>
  );
}
