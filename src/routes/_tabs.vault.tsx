import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Calendar,
  ChevronLeft,
  FileText,
  FlaskConical,
  Image,
  Paperclip,
  Pill,
  ScanLine,
  ScrollText,
  Search,
  Share2,
  ShieldCheck,
  Upload,
} from "lucide-react";

export const Route = createFileRoute("/_tabs/vault")({
  head: () => ({ meta: [{ title: "Vault — EvernestCare" }] }),
  component: Vault,
});

const SECTIONS = [
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
    count: 23,
    tone: "bg-sky text-sky-foreground",
  },
  {
    id: "imaging",
    label: "Imaging",
    icon: ScanLine,
    count: 4,
    tone: "bg-blush text-blush-foreground",
  },
  {
    id: "labs",
    label: "Labs",
    icon: FlaskConical,
    count: 12,
    tone: "bg-sage text-sage-foreground",
  },
  {
    id: "insurance",
    label: "Insurance",
    icon: ShieldCheck,
    count: 3,
    tone: "bg-sand text-sand-foreground",
  },
  {
    id: "medications",
    label: "Medications",
    icon: Pill,
    count: 8,
    tone: "bg-blush text-blush-foreground",
  },
  {
    id: "directives",
    label: "Directives",
    icon: ScrollText,
    count: 2,
    tone: "bg-sky text-sky-foreground",
  },
];

const IMAGING = [
  {
    id: "1",
    type: "Brain MRI",
    area: "Head",
    date: "May 12, 2026",
    provider: "Dr. Patel · Neurology",
    summary: "Findings shared with care team. Follow-up scheduled in 3 days.",
    followup: "Follow-up May 29",
    tone: "bg-sky text-sky-foreground",
  },
  {
    id: "2",
    type: "Chest X-ray",
    area: "Chest",
    date: "Apr 02, 2026",
    provider: "Mercy Imaging Center",
    summary: "Routine check. No new action recommended by provider.",
    followup: "No follow-up needed",
    tone: "bg-sage text-sage-foreground",
  },
  {
    id: "3",
    type: "Echocardiogram",
    area: "Heart",
    date: "Mar 18, 2026",
    provider: "Dr. Okafor · Cardiology",
    summary: "Stable function. Recheck in 6 months.",
    followup: "Recheck Sep 2026",
    tone: "bg-blush text-blush-foreground",
  },
  {
    id: "4",
    type: "Hip CT",
    area: "Hip",
    date: "Feb 04, 2026",
    provider: "Mercy Imaging Center",
    summary: "Pre-op imaging archived for orthopedic team.",
    followup: "Shared with Dr. Lin",
    tone: "bg-sand text-sand-foreground",
  },
];

const AREAS = ["All", "Head", "Heart", "Chest", "Abdomen", "Hip", "Spine"];
const VAULT_ACTIONS = [
  { label: "Upload File", icon: Upload, tone: "bg-sky text-sky-foreground" },
  { label: "Scan Document", icon: ScanLine, tone: "bg-sage text-sage-foreground" },
  { label: "Add Photo", icon: Image, tone: "bg-blush text-blush-foreground" },
  { label: "Attach File", icon: Paperclip, tone: "bg-sand text-sand-foreground" },
];

function Vault() {
  const [section, setSection] = useState<string | null>(null);
  const [imagingId, setImagingId] = useState<string | null>(null);
  const [area, setArea] = useState("All");
  const [actionLabel, setActionLabel] = useState<string | null>(null);

  if (imagingId) {
    const study = IMAGING.find((i) => i.id === imagingId)!;
    return <ImagingDetail study={study} onBack={() => setImagingId(null)} />;
  }

  if (section === "imaging") {
    const filtered = area === "All" ? IMAGING : IMAGING.filter((i) => i.area === area);
    return (
      <div>
        <header className="px-6 pt-14 pb-3">
          <button
            onClick={() => setSection(null)}
            className="inline-flex items-center gap-1 text-[14px] text-primary mb-3"
          >
            <ChevronLeft className="h-4 w-4" /> Vault
          </button>
          <h1 className="text-[28px] font-semibold tracking-tight">Imaging</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {IMAGING.length} studies · organized by body area
          </p>
        </header>

        <div className="px-6 mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {AREAS.map((a) => (
            <button
              key={a}
              onClick={() => setArea(a)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition ${area === a ? "bg-primary text-primary-foreground border-transparent" : "bg-card text-foreground hairline"}`}
            >
              {a}
            </button>
          ))}
        </div>

        <section className="px-6 mt-5 space-y-3">
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => setImagingId(s.id)}
              className="w-full flex items-center gap-3 card-soft p-4 text-left"
            >
              <span
                className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${s.tone}`}
              >
                <ScanLine className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium">{s.type}</p>
                <p className="text-[12px] text-muted-foreground truncate">{s.provider}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.date}</p>
              </div>
            </button>
          ))}
        </section>
      </div>
    );
  }

  return (
    <div>
      <header className="px-6 pt-14 pb-2">
        <h1 className="text-[28px] font-semibold tracking-tight">Vault</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Continuity memory for files, scans, photos, and visit documents.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search documents, providers, labs"
            className="bg-transparent outline-none text-[14px] flex-1"
          />
        </div>
      </header>

      <section className="px-6 mt-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Add to Vault
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {VAULT_ACTIONS.map(({ icon: Icon, label, tone }) => (
            <button
              key={label}
              onClick={() => setActionLabel(label)}
              className="card-soft p-4 text-left active:scale-[0.98] transition"
            >
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-3 text-[14px] font-medium">{label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Timeline-linked when attached to care.
              </p>
              <p className="mt-2 inline-flex rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                Private until shared
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="px-6 mt-5 grid grid-cols-2 gap-3">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className="card-soft p-4 text-left active:scale-[0.98] transition"
          >
            <span
              className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${s.tone}`}
            >
              <s.icon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-[15px] font-medium">{s.label}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{s.count} items</p>
          </button>
        ))}
      </section>

      <section className="px-6 mt-7">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Recently added
        </h2>
        <div className="card-soft divide-y hairline overflow-hidden">
          {[
            {
              i: ScanLine,
              t: "Brain MRI",
              s: "Dr. Patel · May 12",
              tone: "bg-sky text-sky-foreground",
            },
            {
              i: FlaskConical,
              t: "Lipid panel",
              s: "Quest · May 08",
              tone: "bg-sage text-sage-foreground",
            },
            {
              i: FileText,
              t: "Discharge summary",
              s: "Mercy Hospital · Apr 28",
              tone: "bg-sand text-sand-foreground",
            },
          ].map((r) => (
            <div key={r.t} className="flex items-center gap-3 px-4 py-3.5">
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${r.tone}`}
              >
                <r.i className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="text-[14px] font-medium">{r.t}</p>
                <p className="text-[12px] text-muted-foreground">{r.s}</p>
                <p className="mt-1 text-[11px] font-medium text-primary">
                  Included in visit summary
                </p>
              </div>
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </section>
      {actionLabel && (
        <VaultActionSheet actionLabel={actionLabel} onClose={() => setActionLabel(null)} />
      )}
    </div>
  );
}

function ImagingDetail({ study, onBack }: { study: (typeof IMAGING)[number]; onBack: () => void }) {
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div>
      <header className="px-6 pt-14 pb-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-[14px] text-primary mb-3"
        >
          <ChevronLeft className="h-4 w-4" /> Imaging
        </button>
      </header>

      <div className="px-6">
        <div className="card-soft overflow-hidden">
          <div className={`relative aspect-[4/3] ${study.tone} flex items-center justify-center`}>
            <ScanLine className="h-16 w-16 opacity-70" />
            <span className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-wider bg-background/80 backdrop-blur px-2 py-1 rounded-full">
              Preview
            </span>
          </div>
          <div className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {study.area}
            </p>
            <h1 className="mt-1 text-[24px] font-semibold tracking-tight">{study.type}</h1>
            <p className="text-[13px] text-muted-foreground mt-1">{study.provider}</p>
            <p className="text-[13px] text-muted-foreground">{study.date}</p>
          </div>
        </div>

        <div className="mt-4 card-soft p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Plain-language summary
          </p>
          <p className="mt-2 text-[15px] leading-relaxed">{study.summary}</p>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Provider-written summary. EvernestCare does not interpret images.
          </p>
        </div>

        <div className="mt-3 card-soft p-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky text-sky-foreground">
            <Calendar className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-[14px] font-medium">{study.followup}</p>
            <p className="text-[12px] text-muted-foreground">Provider-recommended follow-up</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button className="rounded-full bg-secondary py-3.5 text-[14px] font-medium inline-flex items-center justify-center gap-2">
            <Paperclip className="h-4 w-4" /> Attach
          </button>
          <button
            onClick={() => setShareOpen(true)}
            className="rounded-full bg-primary text-primary-foreground py-3.5 text-[14px] font-medium inline-flex items-center justify-center gap-2"
          >
            <Share2 className="h-4 w-4" /> Share with circle
          </button>
        </div>
        {shareOpen && (
          <VaultActionSheet actionLabel="Share imaging study" onClose={() => setShareOpen(false)} />
        )}
      </div>
    </div>
  );
}

function VaultActionSheet({ actionLabel, onClose }: { actionLabel: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-[440px] rounded-t-3xl bg-card p-6 pb-10"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-muted" />
        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
          Document sharing
        </p>
        <h3 className="mt-1 text-[22px] font-semibold tracking-tight">{actionLabel}</h3>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          Files are continuity memory. They stay private until attached to a care update or shared
          with the care circle.
        </p>
        <div className="mt-4 space-y-2">
          <VaultPrivacyRow label="Default" value="Private" />
          <VaultPrivacyRow label="Optional" value="Included in visit summary" />
          <VaultPrivacyRow label="Share window" value="Access ends after visit" />
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

function VaultPrivacyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-secondary px-3.5 py-3">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="text-right text-[13px] font-medium">{value}</span>
    </div>
  );
}
