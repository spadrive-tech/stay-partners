import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState, LoadingState, PageHeader } from "@/components/portal/shared";
import { PayoutAccountForm } from "@/components/portal/PayoutAccountForm";
import { api, session, type Partner } from "@/lib/api";
import { meQuery } from "@/lib/queries";

export const Route = createFileRoute("/_portal/profile")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Profile & settings — Kiataka Stays Partners" },
      { name: "description", content: "Update your business details, bank account and password." },
      { property: "og:title", content: "Profile & settings — Kiataka Stays Partners" },
      { property: "og:description", content: "Update your business details, bank account and password." },
    ],
  }),
  component: ProfilePage,
});

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ProfilePage() {
  const me = useQuery(meQuery);
  if (me.isLoading) return <LoadingState />;
  if (me.error) return <ErrorState error={me.error} onRetry={() => me.refetch()} />;
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Profile & settings" />
      <Section title="Business details">
        <BusinessForm initial={me.data ?? {}} onSaved={(p) => { me.refetch(); if (p) session.setPartner(p); }} />
      </Section>
      <Section title="Payout bank account">
        <PayoutAccountForm initial={me.data?.payout_account} onSaved={() => me.refetch()} note="Changing your bank details sends them for re-verification. Payouts are paused until Kiataka confirms the new account." />
      </Section>
      <Section title="Change password">
        <PasswordForm />
      </Section>
    </div>
  );
}

function BusinessForm({ initial, onSaved }: { initial: Partner; onSaved: (p?: Partner) => void }) {
  const [v, setV] = useState({
    business_name: initial.business_name ?? "",
    contact_person: initial.contact_person ?? "",
    phone: initial.phone ?? "",
    email: initial.email ?? "",
    cac_number: initial.cac_number ?? "",
  });
  const [saving, setSaving] = useState(false);
  const fields: [keyof typeof v, string, string?][] = [
    ["business_name", "Business name"],
    ["contact_person", "Contact person"],
    ["phone", "Phone", "tel"],
    ["email", "Email", "email"],
    ["cac_number", "CAC number"],
  ];
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          const p = await api<Partner>("/stays/partner/me", { method: "PUT", body: v });
          toast.success("Profile updated");
          onSaved(p && typeof p === "object" ? p : undefined);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Couldn't save");
        } finally {
          setSaving(false);
        }
      }}
    >
      {fields.map(([k, label, type]) => (
        <div key={k} className="space-y-2">
          <Label>{label}</Label>
          <Input type={type ?? "text"} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
        </div>
      ))}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save details</Button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="grid gap-4 sm:grid-cols-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pw.length < 8) { toast.error("New password must be at least 8 characters."); return; }
        if (pw !== pw2) { toast.error("Passwords don't match."); return; }
        setSaving(true);
        try {
          await api("/stays/partner/me", { method: "PUT", body: { current_password: cur, password: pw, password_confirmation: pw2 } });
          toast.success("Password changed");
          setCur(""); setPw(""); setPw2("");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Couldn't change password");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="space-y-2"><Label>Current password</Label><Input type="password" required value={cur} onChange={(e) => setCur(e.target.value)} /></div>
      <div className="space-y-2"><Label>New password</Label><Input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
      <div className="space-y-2"><Label>Confirm</Label><Input type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
      <div className="sm:col-span-3"><Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Update password</Button></div>
    </form>
  );
}
