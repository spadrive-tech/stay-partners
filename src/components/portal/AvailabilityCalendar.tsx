import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isBefore, isSameMonth, parseISO, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState, LoadingState } from "@/components/portal/shared";
import type { AvailabilityEntry, DayState } from "@/lib/api";
import { canEditListing, listingQuery, saveAvailability } from "@/lib/stay";
import { cn } from "@/lib/utils";

const key = (d: Date) => format(d, "yyyy-MM-dd");
/** How far ahead a saved calendar covers when nothing is marked further out. */
const HORIZON_DAYS = 365;

type EntryStatus = AvailabilityEntry["availability_status"];

/**
 * The backend stores ranges as inclusive start, EXCLUSIVE end:
 * a block on the night of 21 Nov is { start_date: "2026-11-21", end_date: "2026-11-22" }.
 */
export function expand(entries: AvailabilityEntry[]): Record<string, EntryStatus> {
  const out: Record<string, EntryStatus> = {};
  for (const e of entries) {
    if (e.room_type_id) continue; // whole-listing calendar only
    const a = parseISO(e.start_date), lastNight = addDays(parseISO(e.end_date), -1);
    if (isBefore(lastNight, a)) continue;
    for (const d of eachDayOfInterval({ start: a, end: lastNight })) out[key(d)] = e.availability_status;
  }
  return out;
}

/** Collapse consecutive days with the same status into [start, end) ranges. */
export function compress(days: { date: string; status: EntryStatus }[]): AvailabilityEntry[] {
  const out: AvailabilityEntry[] = [];
  for (const d of days) {
    const last = out[out.length - 1];
    if (last && last.availability_status === d.status && last.end_date === d.date) last.end_date = key(addDays(parseISO(d.date), 1));
    else out.push({ start_date: d.date, end_date: key(addDays(parseISO(d.date), 1)), availability_status: d.status, source: d.status === "externally_booked" ? "external_booking" : "partner" });
  }
  return out;
}

export function AvailabilityCalendar({ listingId }: { listingId: string }) {
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [edits, setEdits] = useState<Record<string, DayState>>({});
  const [saving, setSaving] = useState(false);
  const q = useQuery(listingQuery(listingId));
  const entries = q.data?.availability_entries ?? [];
  const server = useMemo(() => expand(entries), [entries]);
  const statusOf = (k: string): DayState => edits[k] ?? (server[k] && server[k] !== "available" ? "blocked" : "available");
  const today = startOfDay(new Date());
  const neverSaved = q.data ? !q.data.progress?.availability_completed && entries.length === 0 : false;
  // Kiataka only accepts availability changes on draft or rejected listings for now.
  const locked = q.data ? !canEditListing(q.data.status) : false;

  function toggle(d: Date) {
    if (locked) return;
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
    // Send the whole calendar from today to the horizon as non-overlapping ranges,
    // keeping past entries and dates booked outside Kiataka as they are.
    const todayKey = key(today);
    const marked = [...Object.keys(server), ...Object.keys(edits)].filter((k) => k >= todayKey).sort();
    const minEnd = addDays(today, HORIZON_DAYS);
    const lastMarked = marked.length ? parseISO(marked[marked.length - 1]!) : minEnd;
    const end = isBefore(lastMarked, minEnd) ? minEnd : lastMarked;
    const days = eachDayOfInterval({ start: today, end }).map((d) => {
      const k = key(d);
      const edited = edits[k];
      const status: EntryStatus = edited ? (edited === "available" ? "available" : "blocked") : server[k] ?? "available";
      return { date: k, status };
    });
    // Keep history before today (clipped so it never overlaps the ranges we send).
    const past = entries
      .filter((e) => !e.room_type_id && e.start_date < todayKey)
      .map(({ id: _id, ...e }) => ({ ...e, end_date: e.end_date < todayKey ? e.end_date : todayKey }));
    const roomLevel = entries.filter((e) => e.room_type_id);
    setSaving(true);
    try {
      await saveAvailability(listingId, [...past, ...roomLevel, ...compress(days)]);
      toast.success("Availability saved");
      setEdits({});
      await q.refetch();
      qc.invalidateQueries({ queryKey: ["listings"] });
      qc.invalidateQueries({ queryKey: ["onboarding"] });
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
        </div>
        {!locked && (
          <Button onClick={save} disabled={(!Object.keys(edits).length && !neverSaved) || saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {neverSaved && !Object.keys(edits).length ? "Save availability" : `Save changes${Object.keys(edits).length ? ` (${Object.keys(edits).length})` : ""}`}
          </Button>
        )}
      </div>
      {locked ? (
        <div className="mt-5 flex gap-3 rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#b45309]" />
          <p>
            <span className="font-semibold">Availability can't be changed on {q.data?.status === "live" ? "live" : (q.data?.status ?? "").replace(/_/g, " ")} listings yet.</span>{" "}
            <span className="text-muted-foreground">You're seeing the dates as saved. To block dates sold elsewhere, email support@usekiataka.com while we add this.</span>
          </p>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border bg-muted/40 p-4">
          <div className="mb-3 text-sm font-medium">Mark a date range</div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid w-full grid-cols-1 gap-3 sm:w-auto sm:grid-cols-2">
              <div className="min-w-0 space-y-1"><Label className="text-xs">From</Label><Input type="date" min={key(today)} value={rFrom} onChange={(e) => setRFrom(e.target.value)} /></div>
              <div className="min-w-0 space-y-1"><Label className="text-xs">To</Label><Input type="date" min={rFrom || key(today)} value={rTo} onChange={(e) => setRTo(e.target.value)} /></div>
            </div>
            <div className="grid w-full grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:flex sm:w-auto">
              <Button type="button" variant="secondary" className="min-w-0 px-3" onClick={() => applyRange("blocked")}>Mark occupied</Button>
              <Button type="button" variant="outline" className="min-w-0 px-3" onClick={() => applyRange("available")}>Mark available</Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Use this for stays already booked outside Kiataka, even months or years ahead. You can also tap single dates below.</p>
          {neverSaved && <p className="mt-2 text-xs font-medium text-foreground">Everything is open by default. Mark any dates that are taken, then save — Kiataka needs your availability before you can submit.</p>}
        </div>
      )}
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