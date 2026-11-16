import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type PayoutAccount } from "@/lib/api";

export function PayoutAccountForm({ initial, onSaved, note }: { initial?: PayoutAccount | null | undefined; onSaved?: () => void; note?: string }) {
  const [v, setV] = useState<PayoutAccount>({
    bank_name: initial?.bank_name ?? "",
    account_number: initial?.account_number ?? "",
    account_name: initial?.account_name ?? "",
  });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{10}$/.test(v.account_number)) { toast.error("Account number must be 10 digits (NUBAN)."); return; }
    setLoading(true);
    try {
      await api("/stays/partner/payout-account", { body: v });
      toast.success("Payout account saved");
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label>Bank name</Label>
        <Input required value={v.bank_name} onChange={(e) => setV({ ...v, bank_name: e.target.value })} placeholder="e.g. GTBank" />
      </div>
      <div className="space-y-2">
        <Label>Account number</Label>
        <Input required inputMode="numeric" maxLength={10} value={v.account_number} onChange={(e) => setV({ ...v, account_number: e.target.value.replace(/\D/g, "") })} />
      </div>
      <div className="space-y-2">
        <Label>Account name</Label>
        <Input required value={v.account_name} onChange={(e) => setV({ ...v, account_name: e.target.value })} />
      </div>
      {note && <p className="text-xs text-muted-foreground sm:col-span-2">{note}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Save bank details
        </Button>
      </div>
    </form>
  );
}
