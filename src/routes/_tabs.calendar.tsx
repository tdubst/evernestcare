import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Pill,
  ScanLine,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

import { isProductionRuntime } from "@/lib/runtime-mode";

export const Route = createFileRoute("/_tabs/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Evernest Care" }] }),
  component: CalendarPage,
});

type View = "Day" | "Week" | "Month";
type EventTone = "sky" | "blush" | "sage" | "sand";
type EventKind = "appointment" | "medication" | "task";
type CalendarFilter = "All" | "Appointments" | "Status" | "Tasks";
type CalendarEvent = {
  time: string;
  title: string;
  sub: string;
  tone: EventTone;
  icon: LucideIcon;
  kind: EventKind;
};

const EVENTS: Record<number, CalendarEvent[]> = {
  26: [
    {
      time: "Logged",
      title: "Care status",
      sub: "Category status hidden",
      tone: "blush",
      icon: Pill,
      kind: "medication",
    },
    {
      time: "Ready",
      title: "Care visit",
      sub: "Location pending",
      tone: "sky",
      icon: Stethoscope,
      kind: "appointment",
    },
    {
      time: "Open",
      title: "Care task",
      sub: "Family workspace",
      tone: "sage",
      icon: Activity,
      kind: "task",
    },
  ],
  28: [
    {
      time: "Planned",
      title: "Follow-up care",
      sub: "Details hidden",
      tone: "sky",
      icon: ScanLine,
      kind: "appointment",
    },
  ],
  30: [
    {
      time: "Planned",
      title: "Care appointment",
      sub: "Instructions hidden",
      tone: "sand",
      icon: Activity,
      kind: "appointment",
    },
  ],
};

function CalendarPage() {
  return isProductionRuntime() ? <ProductionCalendarUnavailable /> : <BetaCalendarPage />;
}

function BetaCalendarPage() {
  const [view, setView] = useState<View>("Week");
  const [selected, setSelected] = useState(26);
  const [filter, setFilter] = useState<CalendarFilter>("All");
  const [open, setOpen] = useState<{ day: number; event: CalendarEvent } | null>(null);

  const week = [
    { d: "Sun", n: 25 },
    { d: "Mon", n: 26 },
    { d: "Tue", n: 27 },
    { d: "Wed", n: 28 },
    { d: "Thu", n: 29 },
    { d: "Fri", n: 30 },
    { d: "Sat", n: 31 },
  ];
  const events = filterEvents(EVENTS[selected] ?? [], filter);
  const weekSchedule = week.map((day) => ({
    ...day,
    events: filterEvents(EVENTS[day.n] ?? [], filter),
  }));

  return (
    <div>
      <header id="calendar-top" className="px-6 pt-14 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">May 2026</p>
            <h1 className="mt-0.5 text-[28px] font-semibold tracking-tight">Calendar</h1>
          </div>
          <a
            href="#calendar-add-preview-title"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card"
            aria-label="Add appointment"
          >
            <CalendarPlus className="h-4 w-4" />
          </a>
        </div>

        <AddAppointmentPreview />

        <div className="mt-4 inline-flex rounded-full bg-secondary p-1">
          {(["Day", "Week", "Month"] as View[]).map((item) => (
            <button
              key={item}
              onClick={() => setView(item)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition ${
                view === item ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </header>

      {view !== "Month" && (
        <div className="px-3 mt-3">
          <div className="flex gap-1">
            {week.map((day) => {
              const active = day.n === selected;
              const has = Boolean(EVENTS[day.n]?.length);
              return (
                <button
                  key={day.n}
                  onClick={() => setSelected(day.n)}
                  className={`flex flex-1 flex-col items-center rounded-2xl py-2.5 transition ${
                    active ? "bg-primary text-primary-foreground" : "bg-transparent text-foreground"
                  }`}
                >
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      active ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    {day.d}
                  </span>
                  <span className="mt-1 text-[18px] font-semibold">{day.n}</span>
                  <span
                    className={`mt-1 h-1 w-1 rounded-full ${
                      has ? (active ? "bg-primary-foreground" : "bg-primary") : "bg-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view !== "Month" && (
        <div className="px-6 mt-4 flex gap-2 overflow-x-auto pb-1">
          {(["All", "Appointments", "Status", "Tasks"] as CalendarFilter[]).map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium ${
                filter === item
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {view === "Month" && (
        <div className="px-6 mt-4">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <div key={`${day}-${index}`}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, index) => {
              const dayNumber = index - 3;
              if (dayNumber < 1 || dayNumber > 31) return <div key={index} />;
              const active = dayNumber === selected;
              const has = Boolean(EVENTS[dayNumber]?.length);
              return (
                <button
                  key={index}
                  onClick={() => {
                    setSelected(dayNumber);
                    setView("Week");
                  }}
                  className={`aspect-square rounded-xl text-[13px] flex flex-col items-center justify-center ${
                    active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                  }`}
                >
                  {dayNumber}
                  {has && (
                    <span
                      className={`mt-0.5 h-1 w-1 rounded-full ${
                        active ? "bg-primary-foreground" : "bg-primary"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view === "Week" && (
        <section className="px-6 mt-7">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            This week
          </h2>
          <div className="space-y-3">
            {weekSchedule.map((day) => (
              <DayGroup
                key={day.n}
                active={day.n === selected}
                dayLabel={`${day.d}, May ${day.n}`}
                events={day.events}
                onSelectDay={() => setSelected(day.n)}
                onOpenEvent={(event) => setOpen({ day: day.n, event })}
              />
            ))}
          </div>
        </section>
      )}

      {view === "Day" && (
        <section className="px-6 mt-7">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {selected === 26 ? "Today" : `May ${selected}`}
          </h2>
          <EventList
            events={events}
            emptyText="A quiet day for the care team."
            onOpenEvent={(event) => setOpen({ day: selected, event })}
          />
        </section>
      )}

      {open && (
        <VisitDetailSheet event={open.event} selected={open.day} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}

function ProductionCalendarUnavailable() {
  return (
    <div className="px-6 pt-14">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
        Not included in this release
      </p>
      <h1 className="mt-2 text-[28px] font-semibold tracking-tight">Calendar unavailable</h1>
      <p className="mt-3 max-w-[36ch] text-[15px] leading-relaxed text-muted-foreground">
        Calendar updates will remain unavailable until durable scheduling and access controls pass
        production review.
      </p>
    </div>
  );
}

function DayGroup({
  active,
  dayLabel,
  events,
  onSelectDay,
  onOpenEvent,
}: {
  active: boolean;
  dayLabel: string;
  events: CalendarEvent[];
  onSelectDay: () => void;
  onOpenEvent: (event: CalendarEvent) => void;
}) {
  return (
    <div className={`card-soft overflow-hidden ${active ? "ring-1 ring-primary/30" : ""}`}>
      <button
        onClick={onSelectDay}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-[14px] font-medium">{dayLabel}</p>
          <p className="text-[12px] text-muted-foreground">
            {events.length ? `${events.length} item${events.length === 1 ? "" : "s"}` : "Quiet day"}
          </p>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {active ? "Selected" : "View day"}
        </span>
      </button>
      <div className="divide-y hairline">
        <EventList
          compact
          emptyText="Nothing scheduled."
          events={events}
          onOpenEvent={onOpenEvent}
        />
      </div>
    </div>
  );
}

function EventList({
  compact = false,
  emptyText,
  events,
  onOpenEvent,
}: {
  compact?: boolean;
  emptyText: string;
  events: CalendarEvent[];
  onOpenEvent: (event: CalendarEvent) => void;
}) {
  if (events.length === 0) {
    return (
      <div className={compact ? "px-4 py-3" : "card-soft p-6 text-center"}>
        <p className="text-[13px] text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className={compact ? "" : "space-y-2.5"}>
      {events.map((event) => {
        const Icon = event.icon;
        return (
          <button
            key={`${event.time}-${event.title}`}
            onClick={() => onOpenEvent(event)}
            className={`w-full flex items-center gap-3 text-left ${
              compact ? "px-4 py-3" : "card-soft px-4 py-3.5"
            }`}
          >
            <span
              className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${getToneClass(
                event.tone,
              )}`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-[14px] font-medium">{event.title}</p>
              <p className="text-[12px] text-muted-foreground">
                {event.time} · {event.sub}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        );
      })}
    </div>
  );
}

function VisitDetailSheet({
  event,
  selected,
  onClose,
}: {
  event: CalendarEvent;
  selected: number;
  onClose: () => void;
}) {
  const [notice, setNotice] = useState<"document" | "thread" | null>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-[440px] bg-card rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-muted mb-5" />
        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
          Care detail
        </p>
        <h3 className="mt-1 text-[22px] font-semibold tracking-tight">{event.title}</h3>
        <p className="text-[14px] text-muted-foreground mt-1">
          May {selected} · {event.time}
        </p>

        <div className="mt-5 card-soft p-4 space-y-2">
          <Detail k="Location" v="Visit location pending" />
          <Detail k="Assigned to" v="Care team member" />
          <Detail k="Visibility" v="Family visible" />
        </div>

        <div className="mt-4">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Care prep
          </p>
          <ul className="card-soft p-4 space-y-2 text-[14px]">
            <li>Review current care notes</li>
            <li>Check care status updates</li>
            <li>Keep visit prep inside the family workspace</li>
          </ul>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setNotice("document")}
            className="rounded-full bg-secondary py-3 text-[14px] font-medium"
          >
            Link Vault placeholder
          </button>
          <button
            onClick={() => setNotice("thread")}
            className="rounded-full bg-primary text-primary-foreground py-3 text-[14px] font-medium"
          >
            Add care update
          </button>
        </div>
        {notice && (
          <CalendarNotice
            title={notice === "document" ? "Link Vault placeholder" : "Add a care update"}
            body={
              notice === "document"
                ? "Vault stays in the reviewed placeholder flow during beta. Content remains hidden."
                : "Real-time messaging is not part of this beta. Care updates stay available for the family to review."
            }
            onClose={() => setNotice(null)}
          />
        )}
      </div>
    </div>
  );
}

function CalendarNotice({
  body,
  onClose,
  title,
}: {
  body: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="mt-4 rounded-2xl bg-secondary p-4">
      <p className="text-[14px] font-semibold">{title}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
      <button
        onClick={onClose}
        className="mt-3 w-full rounded-full bg-card py-2.5 text-[13px] font-medium text-primary"
      >
        Got it
      </button>
    </div>
  );
}

function AddAppointmentPreview() {
  return (
    <section className="mt-4 card-soft p-4" aria-labelledby="calendar-add-preview-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
            Calendar preview
          </p>
          <h2 id="calendar-add-preview-title" className="mt-1 text-[17px] font-semibold">
            Appointment preview
          </h2>
        </div>
        <a
          href="/calendar"
          className="rounded-full bg-secondary px-3 py-1.5 text-[12px] font-medium text-muted-foreground"
        >
          Close
        </a>
      </div>
      <div className="mt-4 space-y-2.5">
        <Field label="Category" value="Care follow-up" />
        <Field label="Schedule" value="Tomorrow family check-in" />
        <Field label="Visibility" value="Maya, Jordan, and Sam" />
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
        This is a local preview. No appointment is saved or sent.
      </p>
      <a
        href="/calendar"
        className="mt-4 w-full rounded-full bg-primary py-3 text-[14px] font-medium text-primary-foreground"
      >
        Done
      </a>
    </section>
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

function getToneClass(tone: EventTone) {
  if (tone === "sky") return "bg-sky text-sky-foreground";
  if (tone === "blush") return "bg-blush text-blush-foreground";
  if (tone === "sage") return "bg-sage text-sage-foreground";
  return "bg-sand text-sand-foreground";
}

function filterEvents(events: CalendarEvent[], filter: CalendarFilter) {
  if (filter === "All") return events;
  if (filter === "Appointments") return events.filter((event) => event.kind === "appointment");
  if (filter === "Status") return events.filter((event) => event.kind === "medication");
  return events.filter((event) => event.kind === "task");
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 py-1">
      <span className="text-[12px] text-muted-foreground">{k}</span>
      <span className="text-[13px] font-medium text-right">{v}</span>
    </div>
  );
}
