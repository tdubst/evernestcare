import { createFileRoute, Link } from "@tanstack/react-router";
import { UserPlus, Stethoscope, Shield, Crown, Eye, Phone, MoreHorizontal, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_tabs/care-team")({
  head: () => ({ meta: [{ title: "Care team — CareCircle" }] }),
  component: CareTeam,
});

const FAMILY = [
  { n: "Sarah Chen", r: "Primary caretaker", you: true, role: "primary", emergency: true, color: "bg-blush text-blush-foreground" },
  { n: "David Chen", r: "Brother", role: "family", emergency: true, color: "bg-sky text-sky-foreground" },
  { n: "Emily Chen", r: "Daughter", role: "family", color: "bg-sage text-sage-foreground" },
  { n: "Robert Chen", r: "Cousin · viewer", role: "viewer", color: "bg-sand text-sand-foreground" },
];

const PROVIDERS = [
  { n: "Dr. Asha Patel", r: "Neurology · Mercy", color: "bg-sky text-sky-foreground" },
  { n: "Dr. Chidi Okafor", r: "Cardiology · Mercy", color: "bg-sage text-sage-foreground" },
  { n: "Dr. Lin", r: "Orthopedics", color: "bg-sand text-sand-foreground" },
];

const CAREGIVERS = [
  { n: "Maya R.", r: "Home aide · Mon/Wed/Fri", color: "bg-blush text-blush-foreground" },
  { n: "James T.", r: "Physical therapist", color: "bg-sage text-sage-foreground" },
];

const ROLE_META: Record<string, { label: string; icon: any; tone: string }> = {
  primary: { label: "Primary", icon: Crown, tone: "bg-sand text-sand-foreground" },
  family: { label: "Family", icon: Shield, tone: "bg-sky text-sky-foreground" },
  viewer: { label: "Viewer", icon: Eye, tone: "bg-secondary text-muted-foreground" },
};

function CareTeam() {
  return (
    <div>
      <header className="px-6 pt-14 pb-3">
        <h1 className="text-[28px] font-semibold tracking-tight">Care circle</h1>
        <p className="text-[13px] text-muted-foreground mt-1">9 people supporting Margaret.</p>
      </header>

      <div className="px-6 mt-3 grid grid-cols-2 gap-2.5">
        <button className="card-soft p-4 text-left active:scale-[0.98] transition">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <UserPlus className="h-4 w-4" />
          </span>
          <p className="mt-2.5 text-[14px] font-medium">Invite family</p>
          <p className="text-[11px] text-muted-foreground">Send a private link</p>
        </button>
        <button className="card-soft p-4 text-left active:scale-[0.98] transition">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sage text-sage-foreground">
            <Stethoscope className="h-4 w-4" />
          </span>
          <p className="mt-2.5 text-[14px] font-medium">Add provider</p>
          <p className="text-[11px] text-muted-foreground">Share visit summaries</p>
        </button>
      </div>

      <Section title="Family">
        {FAMILY.map((p) => <Person key={p.n} {...p} />)}
      </Section>

      <Section title="Providers">
        {PROVIDERS.map((p) => <Person key={p.n} {...p} role="provider" providerBadge />)}
      </Section>

      <Section title="Caregivers">
        {CAREGIVERS.map((p) => <Person key={p.n} {...p} role="caregiver" />)}
      </Section>

      <Section title="Access tiers">
        <div className="card-soft divide-y hairline overflow-hidden">
          {[
            { l: "Primary caretaker", s: "Full access · manage circle, edit anything." },
            { l: "Family member", s: "View schedule, messages, vault. Add updates." },
            { l: "Provider", s: "Visit-scoped access. Share summaries securely." },
            { l: "Viewer only", s: "Read-only access to selected categories." },
          ].map((t) => (
            <div key={t.l} className="px-4 py-3.5">
              <p className="text-[14px] font-medium">{t.l}</p>
              <p className="text-[12px] text-muted-foreground">{t.s}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="px-6 mt-6">
        <Link to="/profile-types" className="flex items-center justify-between card-soft px-5 py-4 grad-warm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-card">
              <Sparkles className="h-4 w-4 text-primary" />
            </span>
            <div>
              <p className="text-[14px] font-medium">Add another care profile</p>
              <p className="text-[12px] text-muted-foreground">Child, recovery, chronic, disability</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-6 mt-7">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">{title}</h2>
      <div className="card-soft divide-y hairline overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function Person({ n, r, role, color, you, emergency, providerBadge }: any) {
  const meta = ROLE_META[role];
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full ${color} text-[12px] font-semibold`}>
        {n.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}
        {providerBadge && <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-sage border-2 border-card" />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-medium truncate">{n}</p>
          {you && <span className="text-[10px] font-semibold uppercase tracking-wider rounded-full px-1.5 py-0.5 bg-secondary text-muted-foreground">You</span>}
        </div>
        <p className="text-[12px] text-muted-foreground truncate">{r}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {emergency && (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blush text-blush-foreground" title="Emergency contact">
            <Phone className="h-3 w-3" />
          </span>
        )}
        {meta && (
          <span className={`hidden xs:inline-flex text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 ${meta.tone}`}>
            {meta.label}
          </span>
        )}
        <button className="h-7 w-7 inline-flex items-center justify-center text-muted-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
