import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, ShieldCheck, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Evernest Care — Family care, coordinated" },
      { name: "description", content: "Organize medications, appointments, documents and family updates in one calm place." },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  return (
    <div className="phone-shell grad-hero overflow-hidden">
      <div className="relative flex min-h-dvh flex-col px-6 pt-16 pb-10">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Heart className="h-3.5 w-3.5" fill="currentColor" />
          </span>
          Evernest Care
        </div>

        <div className="mt-16">
          <h1 className="text-[40px] leading-[1.05] font-semibold tracking-tight text-foreground">
            Care for the people<br />you love,<br />
            <span className="text-primary">together.</span>
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-muted-foreground max-w-[34ch]">
            A calm shared space for medications, appointments, documents and family updates — built for the whole care team.
          </p>
        </div>

        <ul className="mt-10 space-y-3">
          {[
            { icon: Users, t: "Built for the whole family", s: "Siblings, partners, providers — everyone aligned." },
            { icon: ShieldCheck, t: "Private by design", s: "Granular permissions you control." },
            { icon: Heart, t: "Warm, not clinical", s: "Designed to reduce caregiver overwhelm." },
          ].map(({ icon: Icon, t, s }) => (
            <li key={t} className="flex items-start gap-3 card-soft px-4 py-3.5">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky text-sky-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[15px] font-medium text-foreground">{t}</p>
                <p className="text-[13px] text-muted-foreground">{s}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-10 space-y-3">
          <Link
            to="/onboarding"
            className="block w-full rounded-full bg-primary py-4 text-center text-[17px] font-medium text-primary-foreground shadow-card active:scale-[0.99] transition"
          >
            Get started
          </Link>
          <Link
            to="/today"
            className="block w-full rounded-full bg-card py-4 text-center text-[15px] font-medium text-foreground hairline border"
          >
            Skip — see the demo
          </Link>
          <p className="text-center text-[12px] text-muted-foreground pt-1">
            Evernest Care is not a medical, diagnostic or emergency service.
          </p>
        </div>
      </div>
    </div>
  );
}
