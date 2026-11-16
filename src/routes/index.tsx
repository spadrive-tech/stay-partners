import { createFileRoute, redirect } from "@tanstack/react-router";
import { session } from "@/lib/api";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Kiataka Stays Partners — Manage your hotel or shortlet" },
      { name: "description", content: "Sign in to manage listings, availability, bookings and payouts on Kiataka Stays." },
      { property: "og:title", content: "Kiataka Stays Partners" },
      { property: "og:description", content: "Manage listings, availability, bookings and payouts on Kiataka Stays." },
    ],
  }),
  beforeLoad: () => {
    if (session.getToken()) throw redirect({ to: "/dashboard" });
    throw redirect({ to: window.localStorage.getItem("kiataka_stays_intro_seen") ? "/login" : "/welcome" });
  },
});
