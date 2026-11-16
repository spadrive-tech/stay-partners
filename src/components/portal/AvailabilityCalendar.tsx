import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isBefore, isSameMonth, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState, LoadingState } from "@/components/portal/shared";
import { api, asList, type AvailabilityDay, type DayState } from "@/lib/api";
import { cn } from "@/lib/utils";

const key = (d: Date) => format(d, "yyyy-MM-dd");

export function AvailabilityCalendar({ listingId }: { listingId: string }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [edits, setEdits] = useState<Record<string, DayState>>({});
  const [saving, setSaving] = useState(false);
  const from = key(startOfMonth(month));
  const to = key(endOfMonth(addMonths(month, 1)));
  const q = useQuery({
    queryKey: ["availability", listingId, from],
    queryFn: async () => asList<AvailabilityDay>(await api(`/stays/partner/listings/${listingId}/availability?from=${from}&to=${to}`), "days"),
  });
  const server = useMemo(() => Object.fromEntries((q.data ?? []).map((d) => [d.date.slice(0, 10), d.status])), [q.data]);
  const statusOf = (k: string): DayState => edits[k] ?? (server[k] as DayState) ?? "available";
  const today = startOfDay(new Date());

  function toggle(d: Date) {
    const k = key(d);
    const s = statusOf(k);
    if (s === "booked" || isBefore(d, today)) return;
    setEdits((p) => ({ ...p, [k]: s === "available" ? "blocked" : "available" }));
  }

  const [rFrom, setRFrom] = useState("");
  const [rTo, setRTo] = useState("");
  function applyRange(status: DayState) {
    if (!rFrom || !rTo) { toast.error("Pick a start and end date."); return; }
    const a = new Date(rFrom), b = new Date(rTo);
    if (isBefore(b, a)) { toast.error("End date must be after the start date."); return; }
    const start = isBefore(a, today) ? today : a;
    const days = eachDayOfInterval({ start, end: b });
    if (days.length > 731) { toast.error("Pick a range of two years or less."); return; }
    const next: Record<string, DayState> = {};
    let skipped = 0;
    for (const d of days) {
      const k = key(d);
      if (statusOf(k) === "booked") skipped++;
      else next[k] = status;
    }
    setEdits((p) => ({ ...p, ...next }));
    setMonth(startOfMonth(start));
    toast.success(`${Object.keys(next).length} dates marked ${status === "blocked" ? "occupied" : "available"}${skipped ? ` (${skipped} Kiataka bookings left as they are)` : ""}. Save to apply.`);
  }

  async function save() {
    setSaving(true);
    try {
      await api(`/stays/partner/listings/${listingId}/availability`, {
        method: "PUT",
        body: { days: Object.entries(edits).map(([date, status]) => ({ date, status })) },
      });
      toast.success("Availability updated");
      setEdits({});
      q.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save availability");
    } finally {
      setSaving(false);
    }
  }

  if (q.isLoading) return <LoadingState />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, -1))} disabled={isSameMonth(month, today)} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <Legend className="bg-card border" label="Available" />
          <Legend className="bg-muted-foreground/30" label="Occupied" />
          <Legend className="bg-primary" label="Booked on Kiataka" />
        </div>
        <Button onClick={save} disabled={!Object.keys(edits).length || saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes{Object.keys(edits).length ? ` (${Object.keys(edits).length})` : ""}
        </Button>
      </div>
      <div className="mt-5 rounded-xl border bg-muted/40 p-4">
        <div className="mb-3 text-sm font-medium">Mark a date range</div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" min={key(today)} value={rFrom} onChange={(e) => setRFrom(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" min={rFrom || key(today)} value={rTo} onChange={(e) => setRTo(e.target.value)} /></div>
          <Button type="button" variant="secondary" onClick={() => applyRange("blocked")}>Mark occupied</Button>
          <Button type="button" variant="outline" onClick={() => applyRange("available")}>Mark available</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Use this for stays already booked outside Kiataka, even months or years ahead. You can also tap single dates below.</p>
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {[month, addMonths(month, 1)].map((m) => (
          <Month key={key(m)} month={m} statusOf={statusOf} edits={edits} today={today} onToggle={toggle} />
        ))}
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={cn("h-3 w-3 rounded", className)} />{label}</span>;
}

function Month({ month, statusOf, edits, today, onToggle }: { month: Date; statusOf: (k: string) => DayState; edits: Record<string, DayState>; today: Date; onToggle: (d: Date) => void }) {
  const days = eachDayOfInterval({ start: startOfWeek(month, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) });
  const weekdays = Array.from({ length: 7 }, (_, i) => format(addDays(startOfWeek(today, { weekStartsOn: 1 }), i), "EEEEE"));
  return (
    <div>
      <h3 className="mb-3 font-semibold">{month.toLocaleDateString("en-NG", { month: "long", year: "numeric" })}</h3>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {weekdays.map((w, i) => <div key={i} className="py-1">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const k = key(d);
          const inMonth = isSameMonth(d, month);
          if (!inMonth) return <div key={k} />;
          const s = statusOf(k);
          const past = isBefore(d, today);
          return (
            <button
              key={k}
              type="button"
              onClick={() => onToggle(d)}
              disabled={past || s === "booked"}
              className={cn(
                "aspect-square rounded-md border text-sm transition",
                s === "available" && "bg-card hover:border-primary",
                s === "blocked" && "border-transparent bg-muted-foreground/30 text-foreground line-through",
                s === "booked" && "cursor-not-allowed border-transparent bg-primary text-primary-foreground",
                past && "opacity-40",
                edits[k] && "ring-2 ring-accent ring-offset-1",
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
