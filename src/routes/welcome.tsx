import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/portal/shared";
import { cn } from "@/lib/utils";
import intro1 from "@/assets/intro-1.jpg";
import intro2 from "@/assets/intro-2.jpg";
import intro3 from "@/assets/intro-3.jpg";

export const INTRO_SEEN_KEY = "kiataka_stays_intro_seen";

export const Route = createFileRoute("/welcome")({
  ssr: false,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Welcome — Kiataka Stays Partners" },
      { name: "description", content: "List your hotel rooms and shortlets, manage bookings and get paid with Kiataka Stays." },
      { property: "og:title", content: "Welcome — Kiataka Stays Partners" },
      { property: "og:description", content: "List your stays, manage bookings and get paid with Kiataka Stays." },
    ],
  }),
  component: Welcome,
});

const SLIDES = [
  { img: intro1, title: "Showcase your stay", text: "List your hotel rooms and shortlet apartments with photos, videos and the details guests care about." },
  { img: intro2, title: "Stay in control of bookings", text: "Accept requests, track check-ins and mark dates as available or occupied in a few taps." },
  { img: intro3, title: "Get paid with ease", text: "See your earnings after commission and request payouts straight to your bank account." },
];

function Welcome() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const finish = () => {
    window.localStorage.setItem(INTRO_SEEN_KEY, "1");
    navigate({ to: "/login", replace: true });
  };
  const s = SLIDES[i]!;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Logo />
        <Button variant="ghost" size="sm" onClick={finish}>Skip</Button>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-8 px-6 pb-10 md:flex-row md:gap-14">
        <div className="w-full max-w-md overflow-hidden rounded-3xl shadow-card md:flex-1">
          <img key={s.img} src={s.img} alt="" width={1024} height={1024} className="aspect-square w-full animate-in fade-in object-cover duration-500" />
        </div>
        <div className="w-full max-w-md md:flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Step {i + 1} of {SLIDES.length}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-primary sm:text-4xl">{s.title}</h1>
          <p className="mt-4 text-base text-muted-foreground">{s.text}</p>
          <div className="mt-8 flex gap-2">
            {SLIDES.map((_, n) => (
              <button key={n} aria-label={`Go to step ${n + 1}`} onClick={() => setI(n)} className={cn("h-2 rounded-full transition-all", n === i ? "w-8 bg-primary" : "w-2 bg-primary/25")} />
            ))}
          </div>
          <div className="mt-8 flex gap-3">
            {i > 0 && <Button variant="outline" size="lg" onClick={() => setI(i - 1)}>Back</Button>}
            <Button size="lg" onClick={() => (last ? finish() : setI(i + 1))}>
              {last ? "Get started" : "Next"} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
