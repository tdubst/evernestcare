import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pin, Plus, Mic, Send, Paperclip, Camera, Search } from "lucide-react";

export const Route = createFileRoute("/_tabs/messages")({
  head: () => ({ meta: [{ title: "Messages — CareCircle" }] }),
  component: Messages,
});

const THREADS = [
  { id: "fam", name: "Chen Family", sub: "David: Picked up the prescription 💊", time: "2m", unread: 2, pinned: true, group: true, color: "bg-sky text-sky-foreground" },
  { id: "drp", name: "Dr. Patel · Neurology", sub: "MRI results are uploaded to the vault.", time: "1h", unread: 1, provider: true, color: "bg-sage text-sage-foreground" },
  { id: "sa", name: "Sarah", sub: "Can you take Tuesday's appointment?", time: "Yesterday", color: "bg-blush text-blush-foreground" },
  { id: "ch", name: "Caregiver — Maya", sub: "Mom slept well. Ate full breakfast.", time: "Yesterday", color: "bg-sand text-sand-foreground" },
  { id: "drc", name: "Dr. Okafor · Cardiology", sub: "Continue current meds. Re-check in 4 wks.", time: "Mon", provider: true, color: "bg-sage text-sage-foreground" },
];

function Messages() {
  const [open, setOpen] = useState<string | null>(null);
  const thread = THREADS.find((t) => t.id === open);

  if (thread) return <Thread thread={thread} onBack={() => setOpen(null)} />;

  return (
    <div>
      <header className="px-6 pt-14 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-semibold tracking-tight">Messages</h1>
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input placeholder="Search messages" className="bg-transparent outline-none text-[14px] flex-1" />
        </div>
      </header>

      <section className="px-3 mt-3">
        {THREADS.map((t) => (
          <button key={t.id} onClick={() => setOpen(t.id)} className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl active:bg-secondary text-left">
            <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${t.color} text-[13px] font-semibold relative`}>
              {t.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              {t.provider && <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-sage border-2 border-background" />}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {t.pinned && <Pin className="h-3 w-3 text-muted-foreground" />}
                <p className="text-[15px] font-medium truncate">{t.name}</p>
              </div>
              <p className="text-[13px] text-muted-foreground truncate">{t.sub}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`text-[11px] ${t.unread ? "text-primary font-medium" : "text-muted-foreground"}`}>{t.time}</span>
              {t.unread && (
                <span className="inline-flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
                  {t.unread}
                </span>
              )}
            </div>
          </button>
        ))}
      </section>
    </div>
  );
}

function Thread({ thread, onBack }: { thread: typeof THREADS[number]; onBack: () => void }) {
  const [text, setText] = useState("");
  const msgs = thread.id === "fam" ? [
    { who: "Sarah", t: "Quick update — Mom's BP was 124/78 this morning", time: "9:14 AM", me: true },
    { who: "David", t: "Picked up the prescription 💊 leaving on the counter", time: "9:42 AM" },
    { who: "Mom", t: "Thank you both. Feeling good today.", time: "10:01 AM" },
    { who: "David", t: "Want me to take her to cardiology tomorrow?", time: "10:03 AM" },
    { who: "Sarah", t: "Yes please — I'll prep the visit notes tonight", time: "10:05 AM", me: true },
  ] : [
    { who: thread.name, t: thread.sub, time: "1h" },
    { who: "Sarah", t: "Thank you, I'll share with the family.", time: "1h", me: true },
  ];

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-10 bg-card/85 backdrop-blur-xl border-b hairline px-4 pt-12 pb-3 flex items-center gap-3">
        <button onClick={onBack} className="text-[15px] text-primary">‹</button>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${thread.color} text-[12px] font-semibold`}>
          {thread.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </span>
        <div className="flex-1">
          <p className="text-[14px] font-semibold">{thread.name}</p>
          <p className="text-[11px] text-muted-foreground">{thread.provider ? "Provider · verified" : "5 members · active now"}</p>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-3">
        {thread.id === "fam" && (
          <div className="card-soft p-3 flex items-start gap-3 bg-sand/50">
            <Pin className="h-4 w-4 text-sand-foreground mt-0.5" />
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-sand-foreground">Pinned update</p>
              <p className="text-[13px] mt-0.5">Cardiology visit tomorrow at 11:30 AM. David driving.</p>
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.me ? "items-end" : "items-start"}`}>
            {!m.me && <p className="text-[11px] text-muted-foreground mb-1 ml-3">{m.who}</p>}
            <div className={`max-w-[78%] px-4 py-2.5 rounded-3xl text-[15px] leading-snug ${m.me ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-foreground rounded-bl-md"}`}>
              {m.t}
            </div>
            <p className={`text-[10px] text-muted-foreground mt-1 ${m.me ? "mr-3" : "ml-3"}`}>{m.time}</p>
          </div>
        ))}
      </div>

      {/* iOS-style composer */}
      <div className="sticky bottom-24 bg-background/70 backdrop-blur-xl px-3 pb-3 pt-2 border-t hairline">
        <div className="flex items-end gap-2">
          <button className="h-9 w-9 rounded-full bg-secondary inline-flex items-center justify-center shrink-0">
            <Plus className="h-4 w-4" />
          </button>
          <div className="flex-1 flex items-end gap-1 rounded-3xl bg-secondary px-3 py-2 min-h-9">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="iMessage"
              className="flex-1 bg-transparent outline-none text-[15px] py-1"
            />
            <button className="h-7 w-7 inline-flex items-center justify-center text-muted-foreground"><Camera className="h-4 w-4" /></button>
            <button className="h-7 w-7 inline-flex items-center justify-center text-muted-foreground"><Paperclip className="h-4 w-4" /></button>
          </div>
          {text ? (
            <button className="h-9 w-9 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center shrink-0">
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <button className="h-9 w-9 rounded-full bg-secondary inline-flex items-center justify-center shrink-0">
              <Mic className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
