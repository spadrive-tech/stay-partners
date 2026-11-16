import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, MessageSquare, Star, Users, X } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/portal/shared";
import { api, scoreBand, toApplicant } from "@/lib/api";
import { cn } from "@/lib/utils";

function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const pct = Math.max(0, Math.min(1, (score - 300) / 550));
  const band = scoreBand(score);
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} className="fill-none stroke-muted" strokeWidth={6} />
        <circle cx={size / 2} cy={size / 2} r={r} className={cn("fill-none stroke-current", band.tone)} strokeWidth={6} strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold leading-none">{score}</span>
        <span className={cn("text-[10px] font-semibold", band.tone)}>{band.label}</span>
      </div>
    </div>
  );
}

function Verified({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={cn("flex items-center gap-1.5 text-xs", ok ? "text-success" : "text-muted-foreground line-through")}>
      {ok ? <BadgeCheck className="h-4 w-4" /> : <X className="h-4 w-4" />} {label}
    </div>
  );
}

/** Tenant profile (rental score, verification, history) for the guest behind a booking. */
export function GuestProfile({ tenantId }: { tenantId?: string | undefined }) {
  const q = useQuery({
    queryKey: ["tenant", tenantId],
    enabled: !!tenantId,
    queryFn: async () => toApplicant(await api(`/landlord/tenants/${tenantId}`, { keepSessionOn401: true })),
  });
  if (!tenantId) return <p className="rounded-lg border p-4 text-sm text-muted-foreground">This guest doesn't have a tenant profile on Kiataka yet.</p>;
  if (q.isLoading) return <LoadingState label="Loading guest profile…" />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const a = q.data;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        {a.photo_url && <img src={a.photo_url} alt="" className="h-14 w-14 rounded-full object-cover" />}
        <div>
          <div className="text-lg font-semibold">{a.name}</div>
          {a.occupation && <div className="text-sm text-muted-foreground">{a.occupation}</div>}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <ScoreRing score={a.rental_score} />
        <div>
          <div className="text-xs text-muted-foreground">Rental score (out of 850)</div>
          <div className="mt-1 text-sm">{a.history.past_stays} past stays{a.history.average_rating ? ` · ${a.history.average_rating.toFixed(1)}★ from hosts` : ""}</div>
          {a.history.incidents > 0 && (
            <div className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> {a.history.incidents} reported incident{a.history.incidents > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-1.5 rounded-lg border p-3 sm:grid-cols-3">
        <Verified ok={a.verification.id_verified} label="ID verified" />
        <Verified ok={a.verification.phone_verified} label="Phone verified" />
        <Verified ok={a.verification.employment_verified} label="Employment" />
      </div>
      {a.guests ? <div className="flex items-center gap-1 text-sm text-muted-foreground"><Users className="h-4 w-4" /> {a.guests} guest{a.guests > 1 ? "s" : ""}</div> : null}
      {a.message && (
        <div className="rounded-lg bg-muted/60 p-3 text-sm">
          <div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground"><MessageSquare className="h-3.5 w-3.5" /> Their message</div>
          “{a.message}”
        </div>
      )}
      {!!a.history.reviews?.length && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reviews from past hosts</div>
          {a.history.reviews.map((r, i) => (
            <div key={i} className="rounded-lg border p-3 text-sm">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium">{r.host}</span>
                <span className="flex items-center gap-0.5 text-warning-foreground"><Star className="h-3.5 w-3.5 fill-current" /> {r.rating}</span>
              </div>
              <p className="text-muted-foreground">{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
