import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitStayKyc, type StayKycInput } from "@/lib/stay";

/**
 * Identity check required before payouts (POST /stay/partners/kyc).
 * NIN and BVN must be exactly 11 digits; Kiataka stores only the last 4.
 */
export function KycForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const qc = useQueryClient();
  const [v, setV] = useState<StayKycInput>({
    legal_first_name: "",
    legal_last_name: "",
    date_of_birth: "",
    residential_address: "",
    business_address: "",
    business_phone: "",
    nin: "",
    bvn: "",
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof StayKycInput>(k: K, val: StayKycInput[K]) => setV((p) => ({ ...p, [k]: val }));
  const digits = (s: string) => s.replace(/\D/g, "").slice(0, 11);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{11}$/.test(v.nin)) { toast.error("NIN must be exactly 11 digits."); return; }
    if (!/^\d{11}$/.test(v.bvn)) { toast.error("BVN must be exactly 11 digits."); return; }
    if (v.residential_address.trim().length < 3) { toast.error("Enter your residential address."); return; }
    setSaving(true);
    try {
      const res = await submitStayKyc(v);
      toast.success(res.kyc_status === "verified" ? "Identity verified" : "Details submitted — we'll verify them shortly");
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      onSubmitted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit your details");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="kyc-first">Legal first name</Label>
        <Input id="kyc-first" required maxLength={100} autoComplete="given-name" value={v.legal_first_name} onChange={(e) => set("legal_first_name", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="kyc-last">Legal last name</Label>
        <Input id="kyc-last" required maxLength={100} autoComplete="family-name" value={v.legal_last_name} onChange={(e) => set("legal_last_name", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="kyc-dob">Date of birth</Label>
        <Input id="kyc-dob" type="date" required max={new Date().toISOString().slice(0, 10)} value={v.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="kyc-phone">Business phone (optional)</Label>
        <Input id="kyc-phone" type="tel" value={v.business_phone ?? ""} onChange={(e) => set("business_phone", e.target.value)} placeholder="0803 123 4567" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="kyc-home">Residential address</Label>
        <Input id="kyc-home" required maxLength={500} autoComplete="street-address" value={v.residential_address} onChange={(e) => set("residential_address", e.target.value)} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="kyc-biz">Business address (optional)</Label>
        <Input id="kyc-biz" maxLength={500} value={v.business_address ?? ""} onChange={(e) => set("business_address", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="kyc-nin">NIN</Label>
        <Input id="kyc-nin" required inputMode="numeric" autoComplete="off" value={v.nin} onChange={(e) => set("nin", digits(e.target.value))} placeholder="11 digits" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="kyc-bvn">BVN</Label>
        <Input id="kyc-bvn" required inputMode="numeric" autoComplete="off" value={v.bvn} onChange={(e) => set("bvn", digits(e.target.value))} placeholder="11 digits" />
      </div>
      <p className="flex items-start gap-2 text-xs text-muted-foreground sm:col-span-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Used only to verify your identity for payouts. Kiataka keeps just the last 4 digits of your NIN and BVN.
      </p>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Submit for verification</Button>
      </div>
    </form>
  );
}
