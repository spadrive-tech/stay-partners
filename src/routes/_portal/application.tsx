import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState, LoadingState, PageHeader } from "@/components/portal/shared";
import { api, session, type Partner } from "@/lib/api";
import { meQuery } from "@/lib/queries";

export const Route = createFileRoute("/_portal/application")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Partner application — Kiataka Stays Partners" },
      { name: "description", content: "Submit your business and property details to start onboarding on Kiataka Stays." },
      { property: "og:title", content: "Partner application — Kiataka Stays Partners" },
      { property: "og:description", content: "Submit your business details to start onboarding." },
    ],
  }),
  component: ApplicationPage,
});

const schema = z.object({
  business_name: z.string().trim().min(2, "Enter your business name").max(120),
  business_type: z.enum(["hotel", "shortlet_operator", "individual_host", "house_agent"]),
  contact_person: z.string().trim().min(2, "Enter a contact name").max(100),
  phone: z.string().transform((s) => s.replace(/[\s-]/g, "")).pipe(z.string().regex(/^(\+234|0)[789][01]\d{8}$/, "Enter a valid Nigerian phone number")),
  email: z.string().trim().email("Enter a valid email").max(255),
  cac_number: z.string().trim().max(30).optional(),
  address: z.string().trim().min(5, "Enter your business address").max(300),
  city: z.string().trim().min(2, "Enter a city").max(80),
  state: z.string().trim().min(2, "Enter a state").max(80),
  property_count: z.coerce.number().int().min(1, "At least 1").max(10000),
  id_type: z.enum(["nin", "passport", "drivers_licence", "voters_card"]),
  id_number: z.string().trim().min(5, "Enter your ID number").max(30),
  about: z.string().trim().max(1000).optional(),
});
type Form = z.input<typeof schema>;

function ApplicationPage() {
  const me = useQuery(meQuery);
  if (me.isLoading) return <LoadingState />;
  if (me.error) return <ErrorState error={me.error} onRetry={() => me.refetch()} />;
  return <ApplicationForm initial={me.data ?? {}} />;
}

function ApplicationForm({ initial }: { initial: Partner }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [v, setV] = useState<Form>({
    business_name: initial.business_name ?? "",
    business_type: initial.business_type ?? "hotel",
    contact_person: initial.contact_person ?? "",
    phone: initial.phone ?? "",
    email: initial.email ?? "",
    cac_number: initial.cac_number ?? "",
    address: "",
    city: "",
    state: "",
    property_count: 1,
    id_type: "nin",
    id_number: "",
    about: "",
  });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Form, val: string) => setV((p) => ({ ...p, [k]: val }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = schema.safeParse(v);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      toast.error("Please fix the highlighted fields.");
      return;
    }
    if (!agree) {
      toast.error("Please confirm the details are accurate.");
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const p = await api<Partner>("/stays/partner/application", { body: { ...r.data, } });
      if (p && typeof p === "object") session.setPartner(p);
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Application submitted");
      navigate({ to: "/onboarding" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit your application");
    } finally {
      setSaving(false);
    }
  }

  const field = (k: keyof Form, label: string, props: React.ComponentProps<typeof Input> = {}, span = false) => (
    <div className={span ? "space-y-2 sm:col-span-2" : "space-y-2"}>
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} value={String(v[k] ?? "")} onChange={(e) => set(k, e.target.value)} aria-invalid={!!errors[k]} {...props} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );
  const select = (k: keyof Form, label: string, opts: [string, string][]) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={String(v[k])} onValueChange={(x) => set(k, x)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{opts.map(([val, l]) => <SelectItem key={val} value={val}>{l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Partner application" description="Tell us about your business so we can set up your account. This takes about 5 minutes." />
      <form onSubmit={submit} className="space-y-6">
        <Section title="Business details">
          {field("business_name", "Business name", {}, true)}
          {select("business_type", "Business type", [["hotel", "Hotel"], ["shortlet_operator", "Shortlet operator"], ["individual_host", "Individual host"], ["house_agent", "House agent / agency"]])}
          {field("cac_number", "CAC registration number (optional)", { placeholder: "RC 1234567" })}
          {field("address", "Business address", {}, true)}
          {field("city", "City", { placeholder: "Lagos" })}
          {field("state", "State", { placeholder: "Lagos" })}
          {field("property_count", "How many rooms or apartments?", { type: "number", min: 1 })}
        </Section>
        <Section title="Contact person">
          {field("contact_person", "Full name")}
          {field("phone", "Phone number", { type: "tel", placeholder: "0803 123 4567" })}
          {field("email", "Email", { type: "email" }, true)}
        </Section>
        <Section title="Identity verification">
          {select("id_type", "ID type", [["nin", "NIN"], ["passport", "International passport"], ["drivers_licence", "Driver's licence"], ["voters_card", "Voter's card"]])}
          {field("id_number", "ID number")}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="about">Anything else we should know? (optional)</Label>
            <Textarea id="about" rows={3} value={v.about} onChange={(e) => set("about", e.target.value)} />
          </div>
        </Section>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox checked={agree} onCheckedChange={(c) => setAgree(!!c)} className="mt-0.5" />
          I confirm these details are accurate and I'm authorised to list these properties on Kiataka Stays.
        </label>
        <Button type="submit" size="lg" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Submit application
        </Button>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
      <h2 className="mb-5 font-semibold">{title}</h2>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </div>
  );
}
