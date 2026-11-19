import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState, LoadingState, PageHeader } from "@/components/portal/shared";
import { PayoutAccountForm } from "@/components/portal/PayoutAccountForm";
import { changePassword, SUPPORT_EMAIL, updateUserProfile, type UserProfile } from "@/lib/api";
import { profileQuery } from "@/lib/queries";

export const Route = createFileRoute("/_portal/profile")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Profile & settings — Kiataka Stays Partners" },
      { name: "description", content: "Update your details, bank account and password." },
      { property: "og:title", content: "Profile & settings — Kiataka Stays Partners" },
      { property: "og:description", content: "Update your details, bank account and password." },
    ],
  }),
  component: ProfilePage,
});

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-input bg-card p-6 sm:p-8">
      <h2 className="text-lg font-bold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ProfilePage() {
  const me = useQuery(profileQuery);
  if (me.isLoading) return <LoadingState />;
  if (me.error || !me.data) return <ErrorState error={me.error} onRetry={() => me.refetch()} />;
  return (
    <>
      <PageHeader title="Profile & settings" description="Your details, payout bank account and password." />
      <div className="max-w-3xl space-y-6">
      <Section title="Your details">
        <DetailsForm key={me.data.id} profile={me.data} />
      </Section>
      <Section title="Payout bank account">
        <PayoutAccountForm note="Changing your bank account verifies the new one with your bank before it's used for payouts." />
      </Section>
      <Section title="Change password">
        <PasswordForm />
      </Section>
      </div>
    </>
  );
}

function DetailsForm({ profile }: { profile: UserProfile }) {
  const qc = useQueryClient();
  const [v, setV] = useState({ first_name: profile.first_name ?? "", last_name: profile.last_name ?? "", phone: profile.phone ?? "" });
  const [saving, setSaving] = useState(false);
  const changed = v.first_name !== (profile.first_name ?? "") || v.last_name !== (profile.last_name ?? "") || v.phone !== (profile.phone ?? "");

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!v.first_name.trim() || !v.last_name.trim()) { toast.error("Enter your first and last name."); return; }
        setSaving(true);
        try {
          await updateUserProfile(v);
          toast.success("Details updated");
          qc.invalidateQueries({ queryKey: ["profile"] });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Couldn't save");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="biz">Business name</Label>
        <Input id="biz" value={profile.business_name ?? ""} readOnly aria-readonly className="bg-muted text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          To change your business name, email <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-primary underline">{SUPPORT_EMAIL}</a>.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="first">First name</Label>
        <Input id="first" required autoComplete="given-name" value={v.first_name} onChange={(e) => setV({ ...v, first_name: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="last">Last name</Label>
        <Input id="last" required autoComplete="family-name" value={v.last_name} onChange={(e) => setV({ ...v, last_name: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" type="tel" autoComplete="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={profile.email} readOnly aria-readonly className="bg-muted text-muted-foreground" />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving || !changed}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save details</Button>
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
        if (pw === cur) { toast.error("Choose a password different from your current one."); return; }
        setSaving(true);
        try {
          await changePassword(cur, pw);
          toast.success("Password changed");
          setCur(""); setPw(""); setPw2("");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Couldn't change password");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="space-y-2"><Label htmlFor="cur-pw">Current password</Label><Input id="cur-pw" type="password" required autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="new-pw">New password</Label><Input id="new-pw" type="password" required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="new-pw2">Confirm</Label><Input id="new-pw2" type="password" required autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
      <div className="sm:col-span-3"><Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Update password</Button></div>
    </form>
  );
}
