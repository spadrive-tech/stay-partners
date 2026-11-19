import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/portal/shared";
import { requestPasswordReset } from "@/lib/api";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Forgot password — Kiataka Stays Partners" },
      { name: "description", content: "Get a code to reset your Kiataka Stays partner password." },
      { property: "og:title", content: "Forgot password — Kiataka Stays Partners" },
      { property: "og:description", content: "Reset your partner portal password." },
    ],
  }),
  component: ForgotPage,
});

/** Step 1: POST /auth/forgot-password emails a code and returns the user id for step 2. */
function ForgotPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { userId } = await requestPasswordReset(email);
      if (userId === null) throw new Error("Couldn't start the reset. Please try again.");
      toast.success("We've emailed you a reset code.");
      navigate({ to: "/reset-password", search: { user_id: userId, email: email.trim().toLowerCase() } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send a reset code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter your email and we'll send you a code to reset it.">
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Send reset code
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
