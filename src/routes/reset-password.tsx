import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AuthLayout } from "@/components/portal/shared";
import { PasswordTokenForm } from "@/components/portal/PasswordTokenForm";

export const Route = createFileRoute("/reset-password")({
  validateSearch: z.object({ token: z.string().optional() }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Reset password — Kiataka Stays Partners" },
      { name: "description", content: "Choose a new password for your Kiataka Stays partner account." },
      { property: "og:title", content: "Reset password — Kiataka Stays Partners" },
      { property: "og:description", content: "Choose a new password for your partner account." },
    ],
  }),
  component: () => {
    const { token } = Route.useSearch();
    return (
      <AuthLayout title="Choose a new password">
        <PasswordTokenForm token={token} endpoint="/stays/partner/auth/reset-password" cta="Reset password" />
      </AuthLayout>
    );
  },
});
