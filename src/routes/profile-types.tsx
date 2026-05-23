import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Heart, Baby, Activity, Sparkles, Check } from "lucide-react";

export const Route = createFileRoute("/profile-types")({
  head: () => ({ meta: [{ title: "Care profiles — CareCircle" }] }),
  component: ProfileTypes,
});

const PROFILES = [
  {
    id: "older",
    name: "Older Adult Care",
    desc: "Geriatric coordination across family and providers.",
    icon: Heart,
    tone: "bg-blush text-blush-foreground",
    active: true,
    modules: ["Medication schedule", "Mobility tracking", "Cognitive notes", "Imaging organizer", "Provider summaries"],
  },
  {
    id: "child",
    name: "Child Care",
    desc: "Growth, school, pediatrician visits, allergies.",
    icon: Baby,
    tone: "bg-sky text-sky-foreground",
    modules: ["Vaccination log", "Growth chart", "School notes", "Allergies & sensitivities", "Pediatric visits"],
  },
  {
    id: "recovery",
    name: "Recovery Care",
    desc: "Post-operative coordination and rehab tracking.",
    icon: Activity,
    tone: "bg-sage text-sage-foreground",
    modules: ["Pain log", "Rehab milestones", "Wound check reminders", "PT schedule", "Discharge plan"],
  },
  {
    id: "chronic",
    name: "Chronic Care",
    desc: "Ongoing condition support and trend visibility.",
    icon: Sparkles,
    tone: "bg-sand text-sand-foreground",
    modules: ["Symptom tracking", "Trigger journal", "Specialist team", "Lab trends", "Treatment plan"],
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
          CareCircle is built to grow with your family. Add a profile for anyone in your circle.
        </p>
      </header>

      <section className="px-6 mt-4 space-y-3 pb-10">
        {PROFILES.map((p) => (
          <article key={p.id} className="card-soft p-5">
            <div className="flex items-start gap-3">
              <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${p.tone}`}>
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
              className={`mt-5 w-full rounded-full py-3 text-[14px] font-medium ${p.active ? "bg-secondary text-foreground" : "bg-primary text-primary-foreground"}`}
            >
              {p.active ? "Currently active" : `Add ${p.name.toLowerCase()} profile`}
            </button>
          </article>
        ))}

        <p className="text-center text-[11px] text-muted-foreground pt-2">
          Disability support and complex family care · coming soon.
        </p>
      </section>
    </div>
  );
}
