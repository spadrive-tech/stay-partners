import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AuthLayout } from "@/components/portal/shared";
import { resendResetCode, resetPassword, verifyResetCode } from "@/lib/api";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  validateSearch: z.object({ user_id: z.coerce.number().optional(), email: z.string().optional() }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Reset password — Kiataka Stays Partners" },
      { name: "description", content: "Choose a new password for your Kiataka Stays partner account." },
      { property: "og:title", content: "Reset password — Kiataka Stays Partners" },
      { property: "og:description", content: "Choose a new password for your partner account." },
    ],
  }),
  component: ResetPage,
});

/**
 * Step 2 of reset: verify the emailed code (verify-otp, purpose reset_password),
 * then set the new password (reset-password) with that same code.
 */
function ResetPage() {
  const { user_id: userId, email } = Route.useSearch();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  // Without the id from step 1 there's nothing to reset: start again.
  useEffect(() => {
    if (userId === undefined) navigate({ to: "/forgot-password", replace: true });
  }, [userId, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  async function verify(value: string) {
    if (userId === undefined || value.length !== CODE_LENGTH || verifying) return;
    setVerifying(true);
    try {
      await verifyResetCode(userId, value);
      setVerified(true);
      toast.success("Code confirmed. Now choose a new password.");
    } catch (err) {
      setCode("");
      toast.error(err instanceof Error ? err.message : "That code didn't work. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (userId === undefined) return;
    if (!verified) { verify(code); return; }
    if (pw.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (pw !== pw2) { toast.error("Passwords don't match."); return; }
    setSaving(true);
    try {
      await resetPassword(userId, code, pw);
      toast.success("Password reset. Sign in with your new password.");
      navigate({ to: "/login", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't reset your password");
    } finally {
      setSaving(false);
    }
  }

  async function resend() {
    if (userId === undefined) return;
    setResending(true);
    try {
      await resendResetCode(userId);
      setCode("");
      setVerified(false);
      setCooldown(RESEND_SECONDS);
      toast.success("A new code is on its way.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't resend the code");
    } finally {
      setResending(false);
    }
  }

  if (userId === undefined) return null;

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle={email ? `Enter the ${CODE_LENGTH}-digit code we sent to ${email}.` : `Enter the ${CODE_LENGTH}-digit code from your email.`}
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <Label>Reset code</Label>
          <div className="flex items-center gap-3">
            <InputOTP
              maxLength={CODE_LENGTH}
              value={code}
              onChange={(v) => { setCode(v); if (verified) setVerified(false); }}
              onComplete={verify}
              disabled={verifying || verified}
              autoFocus
              inputMode="numeric"
              pattern="^[0-9]*$"
            >
              <InputOTPGroup>
                {Array.from({ length: CODE_LENGTH }, (_, i) => <InputOTPSlot key={i} index={i} />)}
              </InputOTPGroup>
            </InputOTP>
            {verifying && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {verified && <CheckCircle2 className="h-5 w-5 text-success" aria-label="Code confirmed" />}
          </div>
        </div>

        {verified ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="pw">New password</Label>
              <Input id="pw" type="password" required autoFocus autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw2">Confirm new password</Label>
              <Input id="pw2" type="password" required autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Reset password
            </Button>
          </>
        ) : (
          <Button type="submit" className="w-full" size="lg" disabled={verifying || code.length !== CODE_LENGTH}>
            {verifying && <Loader2 className="h-4 w-4 animate-spin" />} Confirm code
          </Button>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Didn't get it?{" "}
          <button type="button" onClick={resend} disabled={cooldown > 0 || resending} className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline">
            {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? "Sending…" : "Resend code"}
          </button>
        </p>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
