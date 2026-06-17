import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Heart, Baby, Activity, Sparkles, Check } from "lucide-react";

export const Route = createFileRoute("/profile-types")({
  head: () => ({ meta: [{ title: "Care profiles — Evernest Care" }] }),
  component: ProfileTypes,
});

const PROFILES = [
  {
    id: "family",
    name: "Family Care",
    desc: "Team coordination for a family care workspace.",
    icon: Heart,
    tone: "bg-blush text-blush-foreground",
    active: true,
    modules: [
      "Care updates",
      "Team roles",
      "Vault placeholders",
      "Permission checks",
      "Beta readiness",
    ],
  },
  {
    id: "team-support",
    name: "Team Support",
    desc: "Simple coordination for helpers and family members.",
    icon: Baby,
    tone: "bg-sky text-sky-foreground",
    modules: ["Invite flow", "Access review", "Task notes", "Status checks", "Planned"],
  },
  {
    id: "recovery",
    name: "Recovery Care",
    desc: "Future workflow for time-limited care coordination.",
    icon: Activity,
    tone: "bg-sage text-sage-foreground",
    modules: ["Care timeline", "Milestones", "Helper roles", "Document placeholders", "Planned"],
  },
  {
    id: "long-term",
    name: "Long-Term Care",
    desc: "Future workflow for ongoing family coordination.",
    icon: Sparkles,
    tone: "bg-sand text-sand-foreground",
    modules: ["Routine checks", "Care notes", "Access history", "Workspace status", "Planned"],
  },
];

function ProfileTypes() {
  return (
    <div className="phone-shell">
      <header className="px-6 pt-14 pb-3">
        <Link to="/today" className="inline-flex items-center gap-1 text-[14px] text-primary mb-3">
          <ChevronLeft className="h-4 w-4" /> Today
        </Link>
        <h1 className="text-[28px] font-semibold tracking-tight">Care profiles</h1>
        <p className="text-[14px] text-muted-foreground mt-1 max-w-[36ch]">
          Evernest Care is built to grow carefully. This beta keeps profiles broad and content-free.
        </p>
      </header>

      <section className="px-6 mt-4 space-y-3 pb-10">
        {PROFILES.map((p) => (
          <article key={p.id} className="card-soft p-5">
            <div className="flex items-start gap-3">
              <span
                className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${p.tone}`}
              >
                <p.icon className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-[17px] font-semibold tracking-tight">{p.name}</h3>
                  {p.active && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider rounded-full px-1.5 py-0.5 bg-sage text-sage-foreground">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-muted-foreground mt-0.5">{p.desc}</p>
              </div>
            </div>

            <ul className="mt-4 grid grid-cols-2 gap-2">
              {p.modules.map((m) => (
                <li key={m} className="flex items-center gap-1.5 text-[12px] text-foreground">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{m}</span>
                </li>
              ))}
            </ul>

            <button
              aria-disabled={!p.active}
              disabled={!p.active}
              className={`mt-5 w-full rounded-full py-3 text-[14px] font-medium ${
                p.active
                  ? "bg-secondary text-foreground"
                  : "cursor-not-allowed bg-secondary text-muted-foreground"
              }`}
            >
              {p.active ? "Selected for beta" : "Planned for later"}
            </button>
          </article>
        ))}

        <p className="text-center text-[11px] text-muted-foreground pt-2">
          Additional care profiles are planned after beta review.
        </p>
      </section>
    </div>
  );
}
