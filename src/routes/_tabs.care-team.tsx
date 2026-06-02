import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Crown,
  Eye,
  MoreHorizontal,
  Phone,
  Shield,
  Sparkles,
  Stethoscope,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_tabs/care-team")({
  head: () => ({ meta: [{ title: "Care team — EvernestCare" }] }),
  component: CareTeam,
});

type PersonRole = "primary" | "family" | "viewer" | "provider" | "caregiver";
type PersonRecord = {
  n: string;
  r: string;
  role: PersonRole;
  color: string;
  you?: boolean;
  emergency?: boolean;
  providerBadge?: boolean;
};
type RoleMeta = { label: string; icon: LucideIcon; tone: string; access: string };

const FAMILY: PersonRecord[] = [
  {
    n: "Sarah Chen",
    r: "Primary caretaker",
    you: true,
    role: "primary",
    emergency: true,
    color: "bg-blush text-blush-foreground",
  },
  {
    n: "David Chen",
    r: "Brother",
    role: "family",
    emergency: true,
    color: "bg-sky text-sky-foreground",
  },
  { n: "Emily Chen", r: "Daughter", role: "family", color: "bg-sage text-sage-foreground" },
  { n: "Robert Chen", r: "Cousin · viewer", role: "viewer", color: "bg-sand text-sand-foreground" },
];
const PROVIDERS: PersonRecord[] = [
  {
    n: "Dr. Asha Patel",
    r: "Neurology · Mercy",
    role: "provider",
    providerBadge: true,
    color: "bg-sky text-sky-foreground",
  },
  {
    n: "Dr. Chidi Okafor",
    r: "Cardiology · Mercy",
    role: "provider",
    providerBadge: true,
    color: "bg-sage text-sage-foreground",
  },
  {
    n: "Dr. Lin",
    r: "Orthopedics",
    role: "provider",
    providerBadge: true,
    color: "bg-sand text-sand-foreground",
  },
];
const CAREGIVERS: PersonRecord[] = [
  {
    n: "Maya R.",
    r: "Home aide · Mon/Wed/Fri",
    role: "caregiver",
    color: "bg-blush text-blush-foreground",
  },
  {
    n: "James T.",
    r: "Physical therapist",
    role: "caregiver",
    color: "bg-sage text-sage-foreground",
  },
];
const ROLE_META: Record<PersonRole, RoleMeta> = {
  primary: {
    label: "Primary",
    icon: Crown,
    tone: "bg-sand text-sand-foreground",
    access: "Full access",
  },
  family: {
    label: "Family",
    icon: Shield,
    tone: "bg-sky text-sky-foreground",
    access: "Family visible",
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    tone: "bg-secondary text-muted-foreground",
    access: "Read-only",
  },
  provider: {
    label: "Provider",
    icon: Stethoscope,
    tone: "bg-sage text-sage-foreground",
    access: "Included in visit summary",
  },
  caregiver: {
    label: "Caregiver",
    icon: Shield,
    tone: "bg-blush text-blush-foreground",
    access: "Family visible",
  },
};

function CareTeam() {
  const [sheet, setSheet] = useState<"family" | "provider" | "role" | null>(null);

  return (
    <div>
      <header className="px-6 pt-14 pb-3">
        <h1 className="text-[28px] font-semibold tracking-tight">Care circle</h1>
        <p className="text-[13px] text-muted-foreground mt-1">9 people supporting Margaret.</p>
      </header>

      <div className="px-6 mt-3 grid grid-cols-2 gap-2.5">
        <button
          onClick={() => setSheet("family")}
          className="card-soft p-4 text-left active:scale-[0.98] transition"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <UserPlus className="h-4 w-4" />
          </span>
          <p className="mt-2.5 text-[14px] font-medium">Invite family</p>
          <p className="text-[11px] text-muted-foreground">Private link · expires in 7 days</p>
        </button>
        <button
          onClick={() => setSheet("provider")}
          className="card-soft p-4 text-left active:scale-[0.98] transition"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sage text-sage-foreground">
            <Stethoscope className="h-4 w-4" />
          </span>
          <p className="mt-2.5 text-[14px] font-medium">Add provider</p>
          <p className="text-[11px] text-muted-foreground">Visit-scoped summary access</p>
        </button>
      </div>

      <Section title="Family">
        {FAMILY.map((person) => (
          <Person key={person.n} {...person} />
        ))}
      </Section>
      <Section title="Providers">
        {PROVIDERS.map((person) => (
          <Person key={person.n} {...person} />
        ))}
      </Section>
      <Section title="Caregivers">
        {CAREGIVERS.map((person) => (
          <Person key={person.n} {...person} />
        ))}
      </Section>

      <Section title="Access tiers">
        <div className="card-soft divide-y hairline overflow-hidden">
          {Object.values(ROLE_META).map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.label}
                onClick={() => setSheet("role")}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${role.tone}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-[14px] font-medium">{role.label}</p>
                  <p className="text-[12px] text-muted-foreground">{role.access}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <div className="px-6 mt-6">
        <Link
          to="/profile-types"
          className="flex items-center justify-between card-soft px-5 py-4 grad-warm"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-card">
              <Sparkles className="h-4 w-4 text-primary" />
            </span>
            <div>
              <p className="text-[14px] font-medium">Add another care profile</p>
              <p className="text-[12px] text-muted-foreground">
                Child, recovery, chronic, disability
              </p>
            </div>
          </div>
        </Link>
      </div>
      {sheet && <AccessSheet kind={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-6 mt-7">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        {title}
      </h2>
      <div className="card-soft divide-y hairline overflow-hidden">{children}</div>
    </section>
  );
}

function Person({ n, r, role, color, you, emergency, providerBadge }: PersonRecord) {
  const meta = ROLE_META[role];
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full ${color} text-[12px] font-semibold`}
      >
        {initials(n)}
        {providerBadge && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-sage border-2 border-card" />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-medium truncate">{n}</p>
          {you && (
            <span className="text-[10px] font-semibold uppercase tracking-wider rounded-full px-1.5 py-0.5 bg-secondary text-muted-foreground">
              You
            </span>
          )}
        </div>
        <p className="text-[12px] text-muted-foreground truncate">{r}</p>
        <p className="mt-1 text-[11px] font-medium text-primary">{meta.access}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {emergency && (
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blush text-blush-foreground"
            title="Emergency contact"
          >
            <Phone className="h-3 w-3" />
          </span>
        )}
        <span
          className={`hidden xs:inline-flex text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 ${meta.tone}`}
        >
          {meta.label}
        </span>
        <button className="h-7 w-7 inline-flex items-center justify-center text-muted-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function AccessSheet({
  kind,
  onClose,
}: {
  kind: "family" | "provider" | "role";
  onClose: () => void;
}) {
  const title =
    kind === "family" ? "Invite family" : kind === "provider" ? "Add provider" : "Review access";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-[440px] rounded-t-3xl bg-card p-6 pb-10"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-muted" />
        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
          Who can see this
        </p>
        <h3 className="mt-1 text-[22px] font-semibold tracking-tight">{title}</h3>
        <div className="mt-4 space-y-2">
          <AccessRow
            label="Default"
            value={kind === "provider" ? "Included in visit summary" : "Family visible"}
          />
          <AccessRow label="Sensitive files" value="Private unless shared" />
          <AccessRow label="Invitation" value="Expires in 7 days" />
        </div>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-primary py-3 text-[14px] font-medium text-primary-foreground"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function AccessRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-secondary px-3.5 py-3">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="text-right text-[13px] font-medium">{value}</span>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}
