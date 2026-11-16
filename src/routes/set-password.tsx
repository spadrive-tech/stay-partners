import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout, LoadingState } from "@/components/portal/shared";
import { getInvitePreview, partnerSignup, STAY_PARTNER_TYPE, SUPPORT_EMAIL, type InvitePreview } from "@/lib/api";

/**
 * Invite signup for approved Stay partners.
 * The approval email links here as /set-password?token=<invite token>.
 */
export const Route = createFileRoute("/set-password")({
  ssr: false,
  validateSearch: z.object({ token: z.string().optional() }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Set up your account — Kiataka Stays Partners" },
      { name: "description", content: "Create your account for your approved Kiataka Stays partner application." },
      { property: "og:title", content: "Set up your account — Kiataka Stays Partners" },
      { property: "og:description", content: "Create your account for your approved partner application." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();

  // No invite token in the URL: send them to sign in.
  useEffect(() => {
    if (!token) {
      toast.error("Use the link from your invite email to sign up.");
      navigate({ to: "/login", replace: true });
    }
  }, [token, navigate]);

  const preview = useQuery({
    queryKey: ["invite-preview", token],
    queryFn: () => getInvitePreview(token as string),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  });

  if (!token) return null;

  return (
    <AuthLayout title="Set up your account" subtitle="Your application was approved. Create your account to get started.">
      {preview.isLoading ? (
        <LoadingState label="Checking your invite…" />
      ) : preview.error || !preview.data ? (
        <Notice>
          This invite link is invalid or has expired. Please use the link from your email, or contact{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-primary hover:underline">{SUPPORT_EMAIL}</a>.
        </Notice>
      ) : preview.data.invite_status !== "pending" ? (
        <InviteUnavailable status={preview.data.invite_status} />
      ) : preview.data.partner_type && preview.data.partner_type !== STAY_PARTNER_TYPE ? (
        <Notice>
          This invite isn't for a Kiataka Stays partner account. Please contact{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-primary hover:underline">{SUPPORT_EMAIL}</a>.
        </Notice>
      ) : (
        <SignupForm token={token} invite={preview.data} />
      )}
      <p className="mt-6 text-center text-sm">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border bg-card p-5 text-sm">{children}</div>;
}

function InviteUnavailable({ status }: { status: string }) {
  if (status === "accepted") {
    return (
      <Notice>
        This invite has already been used.{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link> with the email and password you created.
      </Notice>
    );
  }
  return (
    <Notice>
      This invite is no longer active. Please contact{" "}
      <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-primary hover:underline">{SUPPORT_EMAIL}</a> for a new one.
    </Notice>
  );
}

function SignupForm({ token, invite }: { token: string; invite: InvitePreview }) {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState(invite.first_name ?? "");
  const [lastName, setLastName] = useState(invite.last_name ?? "");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const email = invite.email.trim().toLowerCase();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) { toast.error("Enter your first and last name."); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (password !== confirm) { toast.error("Passwords don't match."); return; }
    setLoading(true);
    try {
      const { userId } = await partnerSignup(token, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email,
        phone: phone.trim() || null,
        password,
      });
      toast.success("Account created. We've sent a code to your email.");
      navigate({
        to: "/verify-email",
        search: userId !== null ? { email, user_id: userId } : { email },
        replace: true,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create your account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first_name">First name</Label>
          <Input id="first_name" required autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last name</Label>
          <Input id="last_name" required autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} readOnly aria-readonly className="bg-muted text-muted-foreground" />
        <p className="text-xs text-muted-foreground">This is the email your invite was sent to.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pw">Password</Label>
        <Input id="pw" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pw2">Confirm password</Label>
        <Input id="pw2" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />} Create account
      </Button>
    </form>
  );
}