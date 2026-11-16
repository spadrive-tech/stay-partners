import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/portal/shared";
import { api } from "@/lib/api";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Forgot password — Kiataka Stays Partners" },
      { name: "description", content: "Get a link to reset your Kiataka Stays partner password." },
      { property: "og:title", content: "Forgot password — Kiataka Stays Partners" },
      { property: "og:description", content: "Reset your partner portal password." },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/stays/partner/auth/forgot-password", {
        body: { email, redirect_url: `${window.location.origin}/reset-password` },
        auth: false,
      });
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send reset link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Forgot your password?" subtitle="We'll email you a link to reset it.">
      {sent ? (
        <div className="rounded-xl border bg-card p-6 text-center">
          <MailCheck className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-3 text-sm">If an account exists for <strong>{email}</strong>, a reset link is on its way.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Send reset link
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
