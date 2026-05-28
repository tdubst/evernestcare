import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Accessibility,
  ArrowRight,
  Check,
  ChevronLeft,
  FileText,
  Heart,
  Pill,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — EvernestCare" }] }),
  component: Onboarding,
});

const STEPS = [
  "Welcome",
  "Care recipient",
  "Relationship",
  "Invite family",
  "Permissions",
  "Medications",
  "Continuity",
  "Accessibility",
] as const;

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Margaret");
  const [relation, setRelation] = useState("Parent");
  const [textSize, setTextSize] = useState(1);

  const next = () => {
    if (step === STEPS.length - 1) navigate({ to: "/today" });
    else setStep((s) => s + 1);
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="phone-shell grad-hero">
      <div className="flex min-h-dvh flex-col px-6 pt-6 pb-8">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={back}
            disabled={step === 0}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-card hairline border disabled:opacity-30"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i <= step ? "w-6 bg-primary" : "w-1.5 bg-muted"}`}
              />
            ))}
          </div>
          <button
            onClick={() => navigate({ to: "/today" })}
            className="text-[13px] font-medium text-muted-foreground"
          >
            Skip
          </button>
        </div>

        <div className="mt-10 flex-1">
          {step === 0 && (
            <div>
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card">
                <Heart className="h-6 w-6" fill="currentColor" />
              </div>
              <h2 className="mt-6 text-[32px] font-semibold tracking-tight leading-tight">
                Let's set up your circle.
              </h2>
              <p className="mt-3 text-[16px] text-muted-foreground leading-relaxed max-w-[34ch]">
                A few quiet questions to organize care. You can change anything later.
              </p>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-[28px] font-semibold tracking-tight leading-tight">
                Who are you caring for?
              </h2>
              <p className="mt-2 text-[15px] text-muted-foreground">
                Their first name is enough for now.
              </p>
              <div className="mt-8 card-soft p-5">
                <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
                  Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full bg-transparent text-[22px] font-medium outline-none"
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { label: "Older adult", desc: "Geriatric care", active: true },
                  { label: "Child", desc: "Coming soon" },
                  { label: "Recovery", desc: "Post-op" },
                  { label: "Chronic", desc: "Ongoing care" },
                ].map((t) => (
                  <button
                    key={t.label}
                    className={`text-left card-soft p-4 border ${t.active ? "ring-2 ring-primary border-transparent" : "hairline"}`}
                  >
                    <p className="text-[15px] font-medium">{t.label}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-[28px] font-semibold tracking-tight leading-tight">
                What's your relationship to {name}?
              </h2>
              <div className="mt-6 space-y-2.5">
                {[
                  "Parent",
                  "Spouse / Partner",
                  "Sibling",
                  "Child",
                  "Friend",
                  "Professional caregiver",
                ].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRelation(r)}
                    className={`w-full flex items-center justify-between card-soft px-5 py-4 border ${relation === r ? "ring-2 ring-primary border-transparent" : "hairline"}`}
                  >
                    <span className="text-[16px] font-medium">{r}</span>
                    {relation === r && <Check className="h-5 w-5 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-[28px] font-semibold tracking-tight leading-tight">
                Invite your circle
              </h2>
              <p className="mt-2 text-[15px] text-muted-foreground">Care is lighter when shared.</p>
              <div className="mt-6 card-soft p-2">
                {[
                  { n: "Sarah Chen", r: "Sister", e: "sarah@example.com" },
                  { n: "David Chen", r: "Brother", e: "david@example.com" },
                ].map((p) => (
                  <div
                    key={p.n}
                    className="flex items-center gap-3 px-3 py-3 border-b last:border-0 hairline"
                  >
                    <Avatar name={p.n} />
                    <div className="flex-1">
                      <p className="text-[15px] font-medium">{p.n}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {p.r} · {p.e}
                      </p>
                    </div>
                    <span className="text-[12px] font-medium text-primary">Invited</span>
                  </div>
                ))}
              </div>
              <button className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl border hairline bg-card py-4 text-[15px] font-medium">
                <UserPlus className="h-4 w-4" /> Invite someone else
              </button>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-[28px] font-semibold tracking-tight leading-tight">
                A note on privacy
              </h2>
              <p className="mt-2 text-[15px] text-muted-foreground">
                You choose what each person sees.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  { i: ShieldCheck, t: "Granular access", s: "Per person, per category." },
                  { i: Users, t: "Family-first", s: "No data sold. No ads. Ever." },
                  { i: Heart, t: "Always yours", s: "Export or delete at any time." },
                ].map(({ i: Icon, t, s }) => (
                  <div key={t} className="flex items-start gap-3 card-soft px-4 py-4">
                    <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-sage text-sage-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[15px] font-medium">{t}</p>
                      <p className="text-[13px] text-muted-foreground">{s}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="text-[28px] font-semibold tracking-tight leading-tight">
                Bring in medications
              </h2>
              <p className="mt-2 text-[15px] text-muted-foreground">
                Optional — we'll set gentle reminders.
              </p>
              <div className="mt-6 space-y-2.5">
                {[
                  { n: "Lisinopril", d: "10 mg · once daily" },
                  { n: "Metformin", d: "500 mg · twice daily" },
                  { n: "Atorvastatin", d: "20 mg · evening" },
                ].map((m) => (
                  <label key={m.n} className="flex items-center gap-3 card-soft px-4 py-3.5">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-5 w-5 accent-[var(--primary)]"
                    />
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blush text-blush-foreground">
                      <Pill className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-[15px] font-medium">{m.n}</p>
                      <p className="text-[12px] text-muted-foreground">{m.d}</p>
                    </div>
                  </label>
                ))}
              </div>
              <button className="mt-3 w-full rounded-2xl border hairline bg-card py-3.5 text-[14px] font-medium text-muted-foreground">
                Skip for now
              </button>
            </div>
          )}

          {step === 6 && (
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky text-sky-foreground">
                <FileText className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-[28px] font-semibold tracking-tight leading-tight">
                Start a continuity trail
              </h2>
              <p className="mt-2 text-[15px] text-muted-foreground">
                Add only what helps the next handoff feel clearer.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  {
                    t: "Attach key documents",
                    s: "Discharge notes, medication photos, and appointment paperwork.",
                  },
                  {
                    t: "Build the timeline",
                    s: "Medications, vitals, notes, and documents stay linked to care events.",
                  },
                  {
                    t: "Prepare the first summary",
                    s: "A factual visit-ready snapshot can be shared when needed.",
                  },
                ].map((item) => (
                  <div key={item.t} className="card-soft px-4 py-4">
                    <p className="text-[15px] font-medium">{item.t}</p>
                    <p className="mt-1 text-[13px] text-muted-foreground">{item.s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 7 && (
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sage text-sage-foreground">
                <Accessibility className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-[28px] font-semibold tracking-tight leading-tight">
                Make it comfortable
              </h2>
              <p className="mt-2 text-[15px] text-muted-foreground">Adjust anytime in settings.</p>
              <div className="mt-6 card-soft p-5">
                <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
                  Text size
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-[14px]">A</span>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={1}
                    value={textSize}
                    onChange={(e) => setTextSize(Number(e.target.value))}
                    className="flex-1 accent-[var(--primary)]"
                  />
                  <span className="text-[22px] font-semibold">A</span>
                </div>
                <p className="mt-4 text-[15px]" style={{ fontSize: 14 + textSize * 3 }}>
                  Margaret took her morning Lisinopril at 8:14am.
                </p>
              </div>
              <div className="mt-3 card-soft p-5 flex items-center justify-between">
                <div>
                  <p className="text-[15px] font-medium">Reduce motion</p>
                  <p className="text-[12px] text-muted-foreground">
                    Gentler transitions throughout.
                  </p>
                </div>
                <Toggle />
              </div>
              <div className="mt-3 card-soft p-5 flex items-center justify-between">
                <div>
                  <p className="text-[15px] font-medium">High-contrast mode</p>
                  <p className="text-[12px] text-muted-foreground">Stronger color separation.</p>
                </div>
                <Toggle />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={next}
          className="mt-8 w-full flex items-center justify-center gap-2 rounded-full bg-primary py-4 text-[17px] font-medium text-primary-foreground shadow-card active:scale-[0.99] transition"
        >
          {step === STEPS.length - 1 ? "Enter EvernestCare" : "Continue"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Toggle() {
  const [on, setOn] = useState(false);
  return (
    <button
      onClick={() => setOn(!on)}
      className={`relative h-7 w-12 rounded-full transition ${on ? "bg-primary" : "bg-muted"}`}
      aria-pressed={on}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${on ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky text-sky-foreground text-[13px] font-semibold">
      {initials}
    </span>
  );
}
