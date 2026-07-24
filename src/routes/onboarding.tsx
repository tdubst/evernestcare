import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  head: () => ({ meta: [{ title: "Welcome — Evernest Care" }] }),
  component: Onboarding,
});

const STEPS = [
  "Welcome",
  "Care recipient",
  "Relationship",
  "Beta setup",
  "Permissions",
  "Medications",
  "Continuity",
  "Accessibility",
] as const;

function Onboarding() {
  const [step, setStep] = useState(getInitialStep);
  const [name, setName] = useState("Care recipient");
  const [relation, setRelation] = useState("Family caregiver");
  const [profileType, setProfileType] = useState("Family care");
  const [setupNotice, setSetupNotice] = useState<string | null>(null);
  const [textSize, setTextSize] = useState(1);

  useEffect(() => {
    window.scrollTo({ behavior: "smooth", top: 0 });
  }, [step]);

  const enterWorkspace = () => {
    window.sessionStorage.setItem("evernest_beta_onboarding_complete", "true");
    window.location.assign("/today");
  };

  const goToStep = (nextStep: number) => {
    const boundedStep = Math.max(0, Math.min(STEPS.length - 1, nextStep));
    setStep(boundedStep);
    window.history.pushState(null, "", getStepHref(boundedStep));
  };

  const next = () => {
    if (step === STEPS.length - 1) enterWorkspace();
    else goToStep(step + 1);
  };
  const back = () => goToStep(step - 1);

  return (
    <div className="phone-shell grad-hero">
      <div className="flex min-h-dvh flex-col px-6 pt-6 pb-8">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          {step === 0 ? (
            <button
              type="button"
              disabled
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-card hairline border opacity-30"
              aria-label="Back"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <a
              href={getStepHref(step - 1)}
              onClick={(event) => {
                event.preventDefault();
                back();
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-card hairline border"
              aria-label="Back"
            >
              <ChevronLeft className="h-4 w-4" />
            </a>
          )}
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i <= step ? "w-6 bg-primary" : "w-1.5 bg-muted"}`}
              />
            ))}
          </div>
          <a
            href="/today"
            onClick={(event) => {
              event.preventDefault();
              enterWorkspace();
            }}
            className="text-[13px] font-medium text-muted-foreground"
          >
            Skip
          </a>
        </div>

        <div className="mt-10 flex-1">
          {step === 0 && (
            <div>
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card">
                <Heart className="h-6 w-6" fill="currentColor" />
              </div>
              <h2 className="mt-6 text-[32px] font-semibold tracking-tight leading-tight">
                Let's make care easier to follow.
              </h2>
              <p className="mt-3 text-[16px] text-muted-foreground leading-relaxed max-w-[34ch]">
                Start with one person, one care team, and the key details for the next handoff.
              </p>
              <p className="mt-3 text-[13px] text-muted-foreground leading-relaxed max-w-[36ch]">
                This beta setup keeps details summarized until the reviewed workspace is connected.
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
                  { label: "Family care", desc: "Active beta" },
                  { label: "Team care", desc: "Planned" },
                  { label: "Recovery", desc: "Beta later" },
                  { label: "Long-term", desc: "Beta later" },
                ].map((t) => (
                  <button
                    type="button"
                    key={t.label}
                    onClick={() => setProfileType(t.label)}
                    className={`text-left card-soft p-4 border ${profileType === t.label ? "ring-2 ring-primary border-transparent" : "hairline"}`}
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
                  "Family caregiver",
                  "Care partner",
                  "Sibling",
                  "Adult child",
                  "Friend",
                  "Supporter",
                ].map((r) => (
                  <button
                    type="button"
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
                Invite your care team
              </h2>
              <p className="mt-2 text-[15px] text-muted-foreground">
                Care is lighter with a prepared team.
              </p>
              <div className="mt-6 card-soft p-2">
                {[
                  { n: "Family helper", r: "Care team", e: "Invite pending" },
                  { n: "Backup helper", r: "Care team", e: "Invite pending" },
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
              <button
                type="button"
                onClick={() =>
                  setSetupNotice("Invite setup will activate once beta accounts are connected.")
                }
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl border hairline bg-card py-4 text-[15px] font-medium"
              >
                <UserPlus className="h-4 w-4" /> Invite someone else
              </button>
              {setupNotice && (
                <SetupNotice text={setupNotice} onClose={() => setSetupNotice(null)} />
              )}
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
                  { i: Heart, t: "Controlled beta", s: "Release actions stay reviewed." },
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
                Optional. Add category and status context for family coordination.
              </p>
              <div className="mt-6 space-y-2.5">
                {[
                  { n: "Morning medication", d: "Schedule details hidden for beta preview" },
                  { n: "Midday medication", d: "Schedule details hidden for beta preview" },
                  { n: "Evening medication", d: "Schedule details hidden for beta preview" },
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
              <a
                href={getStepHref(step + 1)}
                onClick={(event) => {
                  event.preventDefault();
                  next();
                }}
                className="mt-3 w-full rounded-2xl border hairline bg-card py-3.5 text-[14px] font-medium text-muted-foreground"
              >
                Skip for now
              </a>
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
                Evernest Care keeps a calm record of what happened, who helped, and what is ready
                for a visit.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  {
                    t: "Add safe Vault placeholders",
                    s: "Vault details stay summarized for beta preview.",
                  },
                  {
                    t: "Build the timeline",
                    s: "Care updates stay grouped for family coordination.",
                  },
                  {
                    t: "Prepare the workspace",
                    s: "Workspace details stay in beta-safe summaries.",
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
                  Care update recorded this morning.
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

        <a
          href={step === STEPS.length - 1 ? "/today" : getStepHref(step + 1)}
          onClick={(event) => {
            event.preventDefault();
            next();
          }}
          data-testid="onboarding-continue"
          className="mt-8 w-full flex items-center justify-center gap-2 rounded-full bg-primary py-4 text-[17px] font-medium text-primary-foreground shadow-card active:scale-[0.99] transition"
        >
          {step === STEPS.length - 1 ? "Enter Evernest Care" : "Continue"}
          <ArrowRight className="h-4 w-4" />
        </a>
        {step < STEPS.length - 1 && (
          <Link
            to="/today"
            onClick={() =>
              window.sessionStorage.setItem("evernest_beta_onboarding_complete", "true")
            }
            className="mt-3 block w-full rounded-full bg-card py-3.5 text-center text-[14px] font-medium text-foreground hairline border"
          >
            Enter beta workspace
          </Link>
        )}
      </div>
    </div>
  );
}

function getInitialStep() {
  if (typeof window === "undefined") return 0;

  return parseStep(window.location.search);
}

function getStepHref(step: number) {
  return `/onboarding?step=${Math.max(0, Math.min(STEPS.length - 1, step))}`;
}

function parseStep(search: string) {
  const rawStep = Number(new URLSearchParams(search).get("step") ?? "0");
  if (!Number.isFinite(rawStep)) return 0;

  return Math.max(0, Math.min(STEPS.length - 1, Math.trunc(rawStep)));
}

function SetupNotice({ onClose, text }: { onClose: () => void; text: string }) {
  return (
    <div className="mt-3 rounded-2xl bg-sand/70 px-4 py-3">
      <p className="text-[13px] leading-relaxed text-muted-foreground">{text}</p>
      <button onClick={onClose} className="mt-2 text-[13px] font-medium text-primary">
        Got it
      </button>
    </div>
  );
}

function Toggle() {
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
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
