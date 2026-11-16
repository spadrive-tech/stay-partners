import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/portal/shared";
import { login, session } from "@/lib/api";
import { DEMO_TOKEN } from "@/lib/demo";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Sign in — Kiataka Stays Partners" },
      { name: "description", content: "Sign in to your Kiataka Stays partner account." },
      { property: "og:title", content: "Sign in — Kiataka Stays Partners" },
      { property: "og:description", content: "Sign in to your Kiataka Stays partner account." },
    ],
  }),
  beforeLoad: () => {
    if (session.getToken()) throw redirect({ to: "/dashboard" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate({ to: "/onboarding", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to manage your stays on Kiataka.">
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          size="lg"
          onClick={() => {
            session.set(DEMO_TOKEN, { business_name: "Lekki Comfort Suites", application_status: "approved" });
            navigate({ to: "/onboarding", replace: true });
          }}
        >
          Preview as demo partner
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Not a partner yet? Apply on{" "}
          <a href="https://usekiataka.com/list-your-stay" className="font-medium text-primary hover:underline">
            usekiataka.com/list-your-stay
          </a>
          {" · "}
          <Link to="/welcome" className="font-medium text-primary hover:underline">How it works</Link>
        </p>
      </form>
    </AuthLayout>
  );
}