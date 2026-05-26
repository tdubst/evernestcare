import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  type LucideIcon,
  Pill,
  CalendarDays,
  AlertCircle,
  Activity,
  ScanLine,
  Phone,
  Heart,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  X,
} from "lucide-react";

export const Route = createFileRoute("/_tabs/today")({
  head: () => ({ meta: [{ title: "Today — EvernestCare" }] }),
  component: Today,
});

function Today() {
  const [quickPanel, setQuickPanel] = useState<"med" | "vitals" | null>(null);
  const [savedPanel, setSavedPanel] = useState<"med" | "vitals" | null>(null);

  const openQuickPanel = (panel: "med" | "vitals") => {
    setQuickPanel(panel);
    setSavedPanel(null);
  };

  const closeQuickPanel = () => {
    setQuickPanel(null);
    setSavedPanel(null);
  };

  return (
    <div>
      {/* Header */}
      <header className="px-6 pt-14 pb-4">
        <p className="text-[13px] font-medium text-muted-foreground">Tuesday, May 26</p>
        <h1 className="mt-1 text-[30px] font-semibold tracking-tight">Good morning, Sarah</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">Here's what matters for Mom today.</p>
      </header>

      {/* Care recipient bar */}
      <div className="px-6">
        <div className="flex items-center gap-3 card-soft px-4 py-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-blush text-blush-foreground text-[14px] font-semibold">
            MC
          </span>
          <div className="flex-1">
            <p className="text-[15px] font-medium">Margaret Chen</p>
            <p className="text-[12px] text-muted-foreground">82 · Older adult care · 4 in circle</p>
          </div>
          <button className="text-[12px] font-medium text-primary">Switch</button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-6 mt-5 grid grid-cols-4 gap-2.5">
        {[
          {
            i: Pill,
            l: "Log med",
            c: "bg-blush text-blush-foreground",
            onClick: () => openQuickPanel("med"),
          },
          {
            i: Activity,
            l: "Vitals",
            c: "bg-sage text-sage-foreground",
            onClick: () => openQuickPanel("vitals"),
          },
          { i: ScanLine, l: "Scan doc", c: "bg-sky text-sky-foreground" },
          { i: Phone, l: "Call", c: "bg-sand text-sand-foreground" },
        ].map(({ i: Icon, l, c, onClick }) => (
          <button key={l} onClick={onClick} className="flex flex-col items-center gap-1.5">
            <span
              className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${c} shadow-soft`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-medium text-foreground">{l}</span>
          </button>
        ))}
      </div>

      {quickPanel && (
        <div className="px-6 mt-4">
          {quickPanel === "med" ? (
            <LogMedicationPanel
              saved={savedPanel === "med"}
              onClose={closeQuickPanel}
              onSave={() => setSavedPanel("med")}
            />
          ) : (
            <VitalsPanel
              saved={savedPanel === "vitals"}
              onClose={closeQuickPanel}
              onSave={() => setSavedPanel("vitals")}
            />
          )}
        </div>
      )}

      <Section title="Needs attention">
        <Alert
          tone="warn"
          icon={AlertCircle}
          title="Evening Metformin missed"
          subtitle="Yesterday, 8:00 PM · 500 mg"
          action="Mark taken"
        />
        <Alert
          tone="info"
          icon={ScanLine}
          title="MRI follow-up in 3 days"
          subtitle="Dr. Patel · Neurology · Bring imaging"
          action="Prep visit"
        />
      </Section>

      <Section title="Today's schedule">
        <div className="card-soft divide-y hairline overflow-hidden">
          <Row
            time="9:00 AM"
            icon={Pill}
            iconBg="bg-blush text-blush-foreground"
            title="Lisinopril · 10 mg"
            sub="Taken at 8:14 AM"
            done
          />
          <Row
            time="11:30 AM"
            icon={CalendarDays}
            iconBg="bg-sky text-sky-foreground"
            title="Cardiology — Dr. Okafor"
            sub="Mercy Heart Clinic · David driving"
          />
          <Row
            time="1:00 PM"
            icon={Pill}
            iconBg="bg-blush text-blush-foreground"
            title="Metformin · 500 mg"
            sub="With lunch"
          />
          <Row
            time="3:00 PM"
            icon={Heart}
            iconBg="bg-sage text-sage-foreground"
            title="Physical therapy"
            sub="Home visit · 45 min"
          />
        </div>
      </Section>

      <Section title="Recent updates">
        <div className="space-y-3">
          <UpdateCard
            who="Dr. Okafor"
            role="Cardiologist"
            time="2h ago"
            body="BP trending in target range. Continue current medications. Re-check in 4 weeks."
            chip={{ label: "Provider note", tone: "sky" }}
          />
          <UpdateCard
            who="David"
            role="Brother"
            time="Yesterday"
            body="Picked up new prescription — left it on the kitchen counter."
            chip={{ label: "Family", tone: "sage" }}
          />
        </div>
      </Section>

      <Section title="Vitals snapshot">
        <div className="grid grid-cols-3 gap-2.5">
          <Vital label="Blood pressure" value="124/78" trend="Steady" tone="sage" />
          <Vital label="Heart rate" value="72" trend="Resting" tone="sky" />
          <Vital label="Weight" value="148 lb" trend="-1.2 this wk" tone="sand" />
        </div>
        <p className="mt-2.5 px-1 text-[11px] text-muted-foreground">
          Logged manually · EvernestCare does not diagnose or interpret.
        </p>
      </Section>

      <Section
        title="Emergency contacts"
        cta={
          <Link to="/care-team" className="text-[13px] font-medium text-primary">
            Manage
          </Link>
        }
      >
        <div className="card-soft divide-y hairline overflow-hidden">
          {[
            { n: "David Chen", r: "Primary · Brother", p: "(415) 555-0123" },
            { n: "Dr. Patel", r: "Primary care", p: "(415) 555-0199" },
          ].map((c) => (
            <div key={c.n} className="flex items-center gap-3 px-4 py-3.5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blush text-blush-foreground text-[12px] font-semibold">
                {c.n
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div className="flex-1">
                <p className="text-[14px] font-medium">{c.n}</p>
                <p className="text-[12px] text-muted-foreground">{c.r}</p>
              </div>
              <a
                href={`tel:${c.p}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sage text-sage-foreground"
              >
                <Phone className="h-4 w-4" />
              </a>
            </div>
          ))}
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
              <p className="text-[14px] font-medium">Care for more than one person?</p>
              <p className="text-[12px] text-muted-foreground">
                Add a child, recovery, or chronic profile.
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}

function LogMedicationPanel({
  saved,
  onClose,
  onSave,
}: {
  saved: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="card-soft border hairline overflow-hidden">
      <PanelHeader
        icon={Pill}
        title="Log medication"
        subtitle="Record Mom's next dose."
        onClose={onClose}
        tone="bg-blush text-blush-foreground"
      />
      <div className="px-4 pb-4 space-y-3">
        <Field label="Medication" value="Metformin · 500 mg" />
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Time" value="1:00 PM" />
          <Field label="Status" value="Taken" />
        </div>
        <label className="block rounded-2xl bg-secondary px-3.5 py-3">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Note
          </span>
          <textarea
            className="mt-1 min-h-16 w-full resize-none bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
            placeholder="Add a short note"
          />
        </label>
        <PanelActions
          saved={saved}
          savedText="Medication logged"
          saveText="Save med log"
          onSave={onSave}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

function VitalsPanel({
  saved,
  onClose,
  onSave,
}: {
  saved: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="card-soft border hairline overflow-hidden">
      <PanelHeader
        icon={Activity}
        title="Log vitals"
        subtitle="Add today's latest readings."
        onClose={onClose}
        tone="bg-sage text-sage-foreground"
      />
      <div className="px-4 pb-4 space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Systolic" value="124" />
          <Field label="Diastolic" value="78" />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Heart rate" value="72 bpm" />
          <Field label="Weight" value="148 lb" />
        </div>
        <label className="block rounded-2xl bg-secondary px-3.5 py-3">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Note
          </span>
          <textarea
            className="mt-1 min-h-16 w-full resize-none bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
            placeholder="Symptoms, context, or device"
          />
        </label>
        <PanelActions
          saved={saved}
          savedText="Vitals logged"
          saveText="Save vitals"
          onSave={onSave}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  subtitle,
  tone,
  onClose,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  tone: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <p className="text-[15px] font-medium">{title}</p>
        <p className="text-[12px] text-muted-foreground">{subtitle}</p>
      </div>
      <button
        onClick={onClose}
        aria-label="Close quick action"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block rounded-2xl bg-secondary px-3.5 py-3">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        className="mt-1 w-full bg-transparent text-[15px] font-medium outline-none"
        defaultValue={value}
      />
    </label>
  );
}

function PanelActions({
  saved,
  savedText,
  saveText,
  onSave,
  onClose,
}: {
  saved: boolean;
  savedText: string;
  saveText: string;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-3">
      {saved && (
        <div className="flex items-center gap-2 rounded-2xl bg-sage px-3.5 py-2.5 text-[13px] font-medium text-sage-foreground">
          <CheckCircle2 className="h-4 w-4" />
          {savedText}
        </div>
      )}
      <div className="grid grid-cols-[0.8fr_1.2fr] gap-2.5">
        <button
          onClick={onClose}
          className="rounded-full bg-secondary py-3 text-[14px] font-medium text-foreground"
        >
          Done
        </button>
        <button
          onClick={onSave}
          className="rounded-full bg-primary py-3 text-[14px] font-medium text-primary-foreground"
        >
          {saveText}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  cta,
}: {
  title: string;
  children: React.ReactNode;
  cta?: React.ReactNode;
}) {
  return (
    <section className="px-6 mt-7">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {cta}
      </div>
      {children}
    </section>
  );
}

function Alert({
  tone,
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  tone: "warn" | "info";
  icon: LucideIcon;
  title: string;
  subtitle: string;
  action: string;
}) {
  const toneCls = tone === "warn" ? "bg-sand text-sand-foreground" : "bg-sky text-sky-foreground";
  return (
    <div className="card-soft px-4 py-3.5 mb-2.5 flex items-center gap-3">
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${toneCls}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <p className="text-[14px] font-medium">{title}</p>
        <p className="text-[12px] text-muted-foreground">{subtitle}</p>
      </div>
      <button className="text-[12px] font-medium text-primary px-3 py-1.5 rounded-full bg-secondary">
        {action}
      </button>
    </div>
  );
}

function Row({
  time,
  icon: Icon,
  iconBg,
  title,
  sub,
  done,
}: {
  time: string;
  icon: LucideIcon;
  iconBg: string;
  title: string;
  sub: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="w-[58px] text-[11px] font-semibold text-muted-foreground tracking-wide">
        {time}
      </div>
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${iconBg}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <p
          className={`text-[14px] font-medium ${done ? "line-through text-muted-foreground" : ""}`}
        >
          {title}
        </p>
        <p className="text-[12px] text-muted-foreground">{sub}</p>
      </div>
      {done && (
        <span className="text-[11px] font-medium text-sage-foreground bg-sage rounded-full px-2 py-0.5">
          Done
        </span>
      )}
    </div>
  );
}

function UpdateCard({
  who,
  role,
  time,
  body,
  chip,
}: {
  who: string;
  role: string;
  time: string;
  body: string;
  chip: { label: string; tone: "sky" | "sage" };
}) {
  const toneCls =
    chip.tone === "sky" ? "bg-sky text-sky-foreground" : "bg-sage text-sage-foreground";
  return (
    <div className="card-soft p-4">
      <div className="flex items-center gap-2">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 ${toneCls}`}
        >
          {chip.label}
        </span>
        <span className="text-[12px] text-muted-foreground">
          {who} · {role} · {time}
        </span>
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-foreground">{body}</p>
    </div>
  );
}

function Vital({
  label,
  value,
  trend,
  tone,
}: {
  label: string;
  value: string;
  trend: string;
  tone: "sage" | "sky" | "sand";
}) {
  const toneCls =
    tone === "sage"
      ? "bg-sage text-sage-foreground"
      : tone === "sky"
        ? "bg-sky text-sky-foreground"
        : "bg-sand text-sand-foreground";
  return (
    <div className="card-soft p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-[20px] font-semibold tracking-tight">{value}</p>
      <span
        className={`mt-2 inline-block text-[10px] font-medium rounded-full px-2 py-0.5 ${toneCls}`}
      >
        {trend}
      </span>
    </div>
  );
}
