import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { BedDouble, Clock, Send, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState, PageHeader } from "@/components/portal/shared";
import { PayoutAccountForm } from "@/components/portal/PayoutAccountForm";
import { onboardingQuery } from "@/lib/queries";

export const Route = createFileRoute("/_portal/onboarding")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Onboarding — Kiataka Stays Partners" },
      { name: "description", content: "Finish setting up your Kiataka Stays partner account." },
      { property: "og:title", content: "Onboarding — Kiataka Stays Partners" },
      { property: "og:description", content: "Finish setting up your partner account." },
    ],
  }),
  component: Onboarding,
});

const STEP_LABELS = ["Application approved", "Bank account", "First listing", "Submit for review"];

type Phase = "bank_account" | "listing" | "submit_listing" | "in_review";

function Onboarding() {
  const navigate = useNavigate();
  // Always refetch on entering this page so a partner who just finished a step isn't held back.
  const q = useQuery({ ...onboardingQuery, refetchOnMount: "always" });
  const ob = q.data?.onboarding;
  const completed = ob?.completed === true;

  // Onboarding already done: go straight to the dashboard.
  useEffect(() => {
    if (completed) navigate({ to: "/dashboard", replace: true });
  }, [completed, navigate]);

  if (q.isLoading || completed) return <LoadingState />;
  if (q.error || !ob) return <ErrorState error={q.error ?? new Error("Couldn't load your onboarding status")} onRetry={() => q.refetch()} />;

  const drafts = ob.draft_listing_count ?? 0;
  const submitted = ob.submitted_listing_count ?? 0;
  const phase: Phase = !ob.bank_account_verified
    ? "bank_account"
    : !ob.has_listing
      ? "listing"
      : submitted === 0
        ? "submit_listing"
        : "in_review";
  const current = { bank_account: 1, listing: 2, submit_listing: 3, in_review: 4 }[phase];
  const name = q.data?.business_name;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`Welcome${name ? `, ${name}` : ""}`} description="Finish these steps to start taking bookings on Kiataka Stays." />
      <Steps current={current} labels={STEP_LABELS} />
      <div className="rounded-2xl border bg-card p-8 shadow-card">
        {phase === "bank_account" && (
          <Status
            icon={<Wallet className="h-8 w-8 text-warning" />}
            title="Add your payout bank account"
            text="Your application is approved. Add the bank account we'll send your earnings to."
          />
        )}
        {phase === "listing" && (
          <Status
            icon={<BedDouble className="h-8 w-8 text-warning" />}
            title="Add your first listing"
            text="List a room or apartment with photos, prices and house rules."
          />
        )}
        {phase === "submit_listing" && (
          <Status
            icon={<Send className="h-8 w-8 text-warning" />}
            title="Submit your listing for review"
            text={`You have ${drafts} draft listing${drafts === 1 ? "" : "s"}. Finish one and submit it so our team can review it.`}
          />
        )}
        {phase === "in_review" && (
          <Status
            icon={<Clock className="h-8 w-8 text-warning" />}
            title="Your listing is under review"
            text="Our team is reviewing your listing. We'll email you once it's approved — usually within 2 business days."
          />
        )}
      </div>

      {phase === "bank_account" && (
        <div className="mt-6 rounded-2xl border bg-card p-8 shadow-card">
          <h2 className="font-semibold">Add your payout bank account</h2>
          <p className="mt-1 text-sm text-muted-foreground">We'll send your earnings here.</p>
          <div className="mt-6">
            <PayoutAccountForm onSaved={() => q.refetch()} />
          </div>
        </div>
      )}
      {phase === "listing" && (
        <Button asChild className="mt-6" size="lg">
          <Link to="/listings/new">Create a listing</Link>
        </Button>
      )}
      {phase === "submit_listing" && (
        <Button asChild className="mt-6" size="lg">
          <Link to="/listings">Go to my listings</Link>
        </Button>
      )}
    </div>
  );
}

function Steps({ current, labels }: { current: number; labels: string[] }) {
  return (
    <ol className="mb-6 grid grid-cols-4 gap-2">
      {labels.map((label, i) => (
        <li key={label} className="flex flex-col gap-2">
          <div className={`h-1.5 rounded-full ${i < current ? "bg-primary" : i === current ? "bg-primary/50" : "bg-muted"}`} />
          <span className={`text-xs ${i <= current ? "font-medium text-foreground" : "text-muted-foreground"}`}>
            {i < current ? "✓ " : `${i + 1}. `}
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Status({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-4">
      {icon}
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}