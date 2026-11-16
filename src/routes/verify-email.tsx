import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AuthLayout } from "@/components/portal/shared";
import { resendEmailOtp, verifyEmailOtp } from "@/lib/api";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

export const Route = createFileRoute("/verify-email")({
  ssr: false,
  validateSearch: z.object({
    email: z.string().optional(),
    user_id: z.coerce.number().optional(),
  }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Verify your email — Kiataka Stays Partners" },
      { name: "description", content: "Enter the code we emailed you to finish setting up your partner account." },
      { property: "og:title", content: "Verify your email — Kiataka Stays Partners" },
      { property: "og:description", content: "Finish setting up your partner account." },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { email, user_id: userId } = Route.useSearch();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  // Nothing to verify against: send them to sign in.
  useEffect(() => {
    if (!email && userId === undefined) navigate({ to: "/login", replace: true });
  }, [email, userId, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  async function verify(value: string) {
    if (value.length !== CODE_LENGTH || loading) return;
    setLoading(true);
    try {
      const signedIn = await verifyEmailOtp(value, email, userId);
      if (signedIn) {
        toast.success("Email verified. Welcome to Kiataka Stays!");
        navigate({ to: "/onboarding", replace: true });
      } else {
        toast.success("Email verified. Sign in to continue.");
        navigate({ to: "/login", replace: true });
      }
    } catch (err) {
      setCode("");
      toast.error(err instanceof Error ? err.message : "That code didn't work. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setResending(true);
    try {
      await resendEmailOtp(email, userId);
      toast.success("A new code is on its way.");
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't resend the code");
    } finally {
      setResending(false);
    }
  }

  if (!email && userId === undefined) return null;

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={email ? `Enter the ${CODE_LENGTH}-digit code we sent to ${email}.` : `Enter the ${CODE_LENGTH}-digit code we emailed you.`}
    >
      <form
        onSubmit={(e) => { e.preventDefault(); verify(code); }}
        className="space-y-5"
      >
        <div className="flex justify-center">
          <InputOTP
            maxLength={CODE_LENGTH}
            value={code}
            onChange={setCode}
            onComplete={verify}
            disabled={loading}
            autoFocus
            inputMode="numeric"
            pattern="^[0-9]*$"
          >
            <InputOTPGroup>
              {Array.from({ length: CODE_LENGTH }, (_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={loading || code.length !== CODE_LENGTH}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Verify email
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Didn't get it?{" "}
          <button
            type="button"
            onClick={resend}
            disabled={cooldown > 0 || resending}
            className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
          >
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