import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Pill, Stethoscope, ScanLine, Activity, Plus } from "lucide-react";

export const Route = createFileRoute("/_tabs/calendar")({
  head: () => ({ meta: [{ title: "Calendar — CareCircle" }] }),
  component: CalendarPage,
});

type View = "Day" | "Week" | "Month";

const EVENTS: Record<number, { time: string; title: string; sub: string; tone: "sky" | "blush" | "sage" | "sand"; icon: any }[]> = {
  26: [
    { time: "9:00 AM", title: "Lisinopril", sub: "10 mg · medication", tone: "blush", icon: Pill },
    { time: "11:30 AM", title: "Cardiology — Dr. Okafor", sub: "Mercy Heart Clinic", tone: "sky", icon: Stethoscope },
    { time: "3:00 PM", title: "Physical therapy", sub: "Home visit · 45 min", tone: "sage", icon: Activity },
  ],
  28: [
    { time: "10:00 AM", title: "MRI follow-up", sub: "Dr. Patel · Neurology", tone: "sky", icon: ScanLine },
  ],
  30: [
    { time: "8:30 AM", title: "Lab draw", sub: "Fasting · Quest Diagnostics", tone: "sand", icon: Activity },
  ],
};

function CalendarPage() {
  const [view, setView] = useState<View>("Week");
  const [selected, setSelected] = useState(26);
  const [open, setOpen] = useState<number | null>(null);

  const week = [
    { d: "Sun", n: 25 }, { d: "Mon", n: 26 }, { d: "Tue", n: 27 }, { d: "Wed", n: 28 },
    { d: "Thu", n: 29 }, { d: "Fri", n: 30 }, { d: "Sat", n: 31 },
  ];

  const events = EVENTS[selected] ?? [];

  return (
    <div>
      <header className="px-6 pt-14 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">May 2026</p>
            <h1 className="mt-0.5 text-[28px] font-semibold tracking-tight">Calendar</h1>
          </div>
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 inline-flex rounded-full bg-secondary p-1">
          {(["Day", "Week", "Month"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 text-[13px] font-medium rounded-full transition ${view === v ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"}`}
            >
              {v}
            </button>
          ))}
        </div>
      </header>

      {view !== "Month" && (
        <div className="px-3 mt-3">
          <div className="flex gap-1">
            {week.map((d) => {
              const active = d.n === selected;
              const has = EVENTS[d.n]?.length;
              return (
                <button
                  key={d.n}
                  onClick={() => setSelected(d.n)}
                  className={`flex-1 flex flex-col items-center py-2.5 rounded-2xl transition ${active ? "bg-primary text-primary-foreground" : "bg-transparent text-foreground"}`}
                >
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{d.d}</span>
                  <span className="mt-1 text-[18px] font-semibold">{d.n}</span>
                  <span className={`mt-1 h-1 w-1 rounded-full ${has ? (active ? "bg-primary-foreground" : "bg-primary") : "bg-transparent"}`} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view === "Month" && (
        <div className="px-6 mt-4">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => {
              const n = i - 3;
              if (n < 1 || n > 31) return <div key={i} />;
              const active = n === selected;
              const has = EVENTS[n]?.length;
              return (
                <button
                  key={i}
                  onClick={() => { setSelected(n); setView("Week"); }}
                  className={`aspect-square rounded-xl text-[13px] flex flex-col items-center justify-center ${active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                >
                  {n}
                  {has && <span className={`mt-0.5 h-1 w-1 rounded-full ${active ? "bg-primary-foreground" : "bg-primary"}`} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <section className="px-6 mt-7">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {selected === 26 ? "Today" : `May ${selected}`}
        </h2>
        {events.length === 0 ? (
          <div className="card-soft p-6 text-center">
            <p className="text-[14px] font-medium">Nothing scheduled</p>
            <p className="text-[12px] text-muted-foreground mt-1">A quiet day for the circle.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {events.map((e, i) => {
              const toneCls = e.tone === "sky" ? "bg-sky text-sky-foreground" : e.tone === "blush" ? "bg-blush text-blush-foreground" : e.tone === "sage" ? "bg-sage text-sage-foreground" : "bg-sand text-sand-foreground";
              const Icon = e.icon;
              return (
                <button
                  key={i}
                  onClick={() => setOpen(i)}
                  className="w-full flex items-center gap-3 card-soft px-4 py-3.5 text-left"
                >
                  <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${toneCls}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <p className="text-[14px] font-medium">{e.title}</p>
                    <p className="text-[12px] text-muted-foreground">{e.time} · {e.sub}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Detail sheet */}
      {open !== null && events[open] && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={() => setOpen(null)}>
          <div
            className="w-full max-w-[440px] bg-card rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-muted mb-5" />
            <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Visit detail</p>
            <h3 className="mt-1 text-[22px] font-semibold tracking-tight">{events[open].title}</h3>
            <p className="text-[14px] text-muted-foreground mt-1">May {selected} · {events[open].time}</p>

            <div className="mt-5 card-soft p-4 space-y-2">
              <Detail k="Location" v="Mercy Heart Clinic · 2nd floor" />
              <Detail k="Assigned to" v="David Chen" />
              <Detail k="Transport" v="David driving · pick up 10:45 AM" />
            </div>

            <div className="mt-4">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Visit prep</p>
              <ul className="card-soft p-4 space-y-2 text-[14px]">
                <li className="flex gap-2"><span className="text-muted-foreground">·</span> Bring updated medication list</li>
                <li className="flex gap-2"><span className="text-muted-foreground">·</span> Ask about evening dose timing</li>
                <li className="flex gap-2"><span className="text-muted-foreground">·</span> Share recent BP log</li>
              </ul>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button className="rounded-full bg-secondary py-3 text-[14px] font-medium">Attach document</button>
              <button className="rounded-full bg-primary text-primary-foreground py-3 text-[14px] font-medium">Open thread</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 py-1">
      <span className="text-[12px] text-muted-foreground">{k}</span>
      <span className="text-[13px] font-medium text-right">{v}</span>
    </div>
  );
}
