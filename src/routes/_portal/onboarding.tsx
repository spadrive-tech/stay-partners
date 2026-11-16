import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState, PageHeader } from "@/components/portal/shared";
import { PayoutAccountForm } from "@/components/portal/PayoutAccountForm";
import { SUPPORT_EMAIL } from "@/lib/api";
import { meQuery } from "@/lib/queries";

export const Route = createFileRoute("/_portal/onboarding")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Onboarding — Kiataka Stays Partners" },
      { name: "description", content: "Check your partner application status and finish setup." },
      { property: "og:title", content: "Onboarding — Kiataka Stays Partners" },
      { property: "og:description", content: "Check your partner application status." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const me = useQuery(meQuery);
  if (me.isLoading) return <LoadingState />;
  if (me.error) return <ErrorState error={me.error} onRetry={() => me.refetch()} />;
  const p = me.data ?? {};
  const status = p.application_status ?? (p.status as string) ?? "under_review";
  const needsApplication = p.profile_complete === false;
  const needsPayout = status === "approved" && !needsApplication && !p.payout_account?.account_number;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`Welcome${p.business_name ? `, ${p.business_name}` : ""}`} description="Here's where your partner account stands." />
      <Steps
        current={needsApplication ? 0 : status !== "approved" ? 1 : needsPayout ? 2 : 3}
        labels={["Partner application", "Review", "Bank account", "Start listing"]}
      />
      <div className="rounded-2xl border bg-card p-8 shadow-card">
        {needsApplication && (
          <Status icon={<Clock className="h-8 w-8 text-warning" />} title="Start with your partner application" text="Tell us about your business and verify your identity. Our team reviews every application before approval." />
        )}
        {!needsApplication && status === "approved" && (
          <Status icon={<CheckCircle2 className="h-8 w-8 text-success" />} title="Your application is approved" text="You can list rooms and apartments on Kiataka Stays." />
        )}
        {!needsApplication && status === "under_review" && (
          <Status icon={<Clock className="h-8 w-8 text-warning" />} title="Your application is under review" text="Our team is reviewing your details. We'll email you once a decision is made — usually within 2 business days." />
        )}
        {status === "rejected" && (
          <Status
            icon={<XCircle className="h-8 w-8 text-destructive" />}
            title="Your application wasn't approved"
            text={`If you think this is a mistake, contact ${SUPPORT_EMAIL}.`}
          />
        )}
      </div>
      {needsApplication ? (
        <div className="mt-6 rounded-2xl border bg-card p-8 shadow-card">
          <h2 className="font-semibold">Complete your partner application</h2>
          <p className="mt-1 text-sm text-muted-foreground">Submit your business, contact and ID details to start onboarding.</p>
          <Button asChild className="mt-5">
            <Link to="/application">Start application</Link>
          </Button>
        </div>
      ) : needsPayout ? (
        <div className="mt-6 rounded-2xl border bg-card p-8 shadow-card">
          <h2 className="font-semibold">Add your payout bank account</h2>
          <p className="mt-1 text-sm text-muted-foreground">We'll send your earnings here.</p>
          <div className="mt-6">
            <PayoutAccountForm onSaved={() => me.refetch()} />
          </div>
        </div>
      ) : (
        status === "approved" && (
          <Button asChild className="mt-6" size="lg">
            <Link to="/dashboard">Go to dashboard</Link>
          </Button>
        )
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
