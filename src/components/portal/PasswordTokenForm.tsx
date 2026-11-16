import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export function PasswordTokenForm({ token, endpoint, cta }: { token?: string | undefined; endpoint: string; cta: string }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="rounded-lg border bg-card p-5 text-sm">
        This link is missing its token or has expired. Please use the link from your email, or{" "}
        <Link to="/forgot-password" className="font-medium text-primary hover:underline">request a new one</Link>.
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (password !== confirm) { toast.error("Passwords don't match."); return; }
    setLoading(true);
    try {
      await api(endpoint, { body: { token, password, password_confirmation: confirm }, auth: false });
      toast.success("Password saved. You can sign in now.");
      navigate({ to: "/login", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="pw">New password</Label>
        <Input id="pw" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pw2">Confirm password</Label>
        <Input id="pw2" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />} {cta}
      </Button>
    </form>
  );
}
