import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, Mic, Paperclip, Pin, Plus, Search, Send } from "lucide-react";

export const Route = createFileRoute("/_tabs/messages")({
  head: () => ({ meta: [{ title: "Messages — Evernest Care" }] }),
  component: Messages,
});

type ThreadSummary = {
  id: string;
  name: string;
  sub: string;
  time: string;
  unread?: number;
  pinned?: boolean;
  provider?: boolean;
  color: string;
};
type Message = { who: string; t: string; time: string; me?: boolean };

const THREADS: ThreadSummary[] = [
  {
    id: "fam",
    name: "Chen Family",
    sub: "David: Picked up the prescription",
    time: "2m",
    unread: 2,
    pinned: true,
    color: "bg-sky text-sky-foreground",
  },
  {
    id: "drp",
    name: "Dr. Patel · Neurology",
    sub: "MRI results are uploaded to the vault.",
    time: "1h",
    unread: 1,
    provider: true,
    color: "bg-sage text-sage-foreground",
  },
  {
    id: "sa",
    name: "Sarah",
    sub: "Can you take Tuesday's appointment?",
    time: "Yesterday",
    color: "bg-blush text-blush-foreground",
  },
  {
    id: "ch",
    name: "Caregiver — Maya",
    sub: "Mom slept well. Ate full breakfast.",
    time: "Yesterday",
    color: "bg-sand text-sand-foreground",
  },
  {
    id: "drc",
    name: "Dr. Okafor · Cardiology",
    sub: "Continue current meds. Re-check in 4 wks.",
    time: "Mon",
    provider: true,
    color: "bg-sage text-sage-foreground",
  },
];

const INITIAL_MESSAGES: Record<string, Message[]> = {
  fam: [
    { who: "Sarah", t: "Quick update: BP was 124/78 this morning", time: "9:14 AM", me: true },
    { who: "David", t: "Picked up the prescription and left it on the counter", time: "9:42 AM" },
    { who: "Mom", t: "Thank you both. Feeling good today.", time: "10:01 AM" },
    { who: "David", t: "Want me to take her to cardiology tomorrow?", time: "10:03 AM" },
    {
      who: "Sarah",
      t: "Yes please. I will prep the visit notes tonight",
      time: "10:05 AM",
      me: true,
    },
  ],
};

function Messages() {
  const [open, setOpen] = useState<string | null>(null);
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const thread = THREADS.find((item) => item.id === open);

  if (thread) return <Thread thread={thread} onBack={() => setOpen(null)} />;

  return (
    <div>
      <header className="px-6 pt-14 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-semibold tracking-tight">Messages</h1>
          <button
            onClick={() => setNewThreadOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card"
            aria-label="New message"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search messages"
            className="bg-transparent outline-none text-[14px] flex-1"
          />
        </div>
      </header>

      <section className="px-3 mt-3">
        {THREADS.map((threadItem) => (
          <button
            key={threadItem.id}
            onClick={() => setOpen(threadItem.id)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl active:bg-secondary text-left"
          >
            <span
              className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${threadItem.color} text-[13px] font-semibold relative`}
            >
              {initials(threadItem.name)}
              {threadItem.provider && (
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-sage border-2 border-background" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {threadItem.pinned && <Pin className="h-3 w-3 text-muted-foreground" />}
                <p className="text-[15px] font-medium truncate">{threadItem.name}</p>
              </div>
              <p className="text-[13px] text-muted-foreground truncate">{threadItem.sub}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span
                className={`text-[11px] ${
                  threadItem.unread ? "text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                {threadItem.time}
              </span>
              {threadItem.unread && (
                <span className="inline-flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
                  {threadItem.unread}
                </span>
              )}
            </div>
          </button>
        ))}
      </section>
      {newThreadOpen && (
        <MessagePrivacySheet title="New care message" onClose={() => setNewThreadOpen(false)} />
      )}
    </div>
  );
}

function Thread({ thread, onBack }: { thread: ThreadSummary; onBack: () => void }) {
  const [text, setText] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(
    INITIAL_MESSAGES[thread.id] ?? [
      { who: thread.name, t: thread.sub, time: "1h" },
      { who: "Sarah", t: "Thank you, I will share with the family.", time: "1h", me: true },
    ],
  );

  const sendMessage = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((current) => [...current, { who: "Sarah", t: trimmed, time: "Now", me: true }]);
    setText("");
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-10 bg-card/85 backdrop-blur-xl border-b hairline px-4 pt-12 pb-3 flex items-center gap-3">
        <button onClick={onBack} className="text-[15px] text-primary">
          Back
        </button>
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${thread.color} text-[12px] font-semibold`}
        >
          {initials(thread.name)}
        </span>
        <div className="flex-1">
          <p className="text-[14px] font-semibold">{thread.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {thread.provider ? "Included in visit summary" : "Family visible"}
          </p>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-3">
        {thread.id === "fam" && (
          <div className="card-soft p-3 flex items-start gap-3 bg-sand/50">
            <Pin className="h-4 w-4 text-sand-foreground mt-0.5" />
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-sand-foreground">
                Pinned update
              </p>
              <p className="text-[13px] mt-0.5">
                Cardiology visit tomorrow at 11:30 AM. David driving.
              </p>
            </div>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={`${message.time}-${index}`}
            className={`flex flex-col ${message.me ? "items-end" : "items-start"}`}
          >
            {!message.me && (
              <p className="text-[11px] text-muted-foreground mb-1 ml-3">{message.who}</p>
            )}
            <div
              className={`max-w-[78%] px-4 py-2.5 rounded-3xl text-[15px] leading-snug ${
                message.me
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-secondary text-foreground rounded-bl-md"
              }`}
            >
              {message.t}
            </div>
            <p className={`text-[10px] text-muted-foreground mt-1 ${message.me ? "mr-3" : "ml-3"}`}>
              {message.time}
            </p>
          </div>
        ))}
      </div>

      <div className="sticky bottom-24 bg-background/70 backdrop-blur-xl px-3 pb-3 pt-2 border-t hairline">
        <p className="mb-2 px-2 text-[11px] text-muted-foreground">
          Keep private care details out of notification previews. Attach files through Vault.
        </p>
        <div className="flex items-end gap-2">
          <button
            onClick={() => setAttachOpen(true)}
            className="h-9 w-9 rounded-full bg-secondary inline-flex items-center justify-center shrink-0"
            aria-label="Attach care file"
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="flex-1 flex items-end gap-1 rounded-3xl bg-secondary px-3 py-2 min-h-9">
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Care update"
              className="flex-1 bg-transparent outline-none text-[15px] py-1"
            />
            <button
              onClick={() => setAttachOpen(true)}
              className="h-7 w-7 inline-flex items-center justify-center text-muted-foreground"
              aria-label="Add photo"
            >
              <Camera className="h-4 w-4" />
            </button>
            <button
              onClick={() => setAttachOpen(true)}
              className="h-7 w-7 inline-flex items-center justify-center text-muted-foreground"
              aria-label="Attach document"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          </div>
          {text ? (
            <button
              onClick={sendMessage}
              className="h-9 w-9 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center shrink-0"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <button className="h-9 w-9 rounded-full bg-secondary inline-flex items-center justify-center shrink-0">
              <Mic className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {attachOpen && (
        <MessagePrivacySheet title="Attach from Vault" onClose={() => setAttachOpen(false)} />
      )}
    </div>
  );
}

function MessagePrivacySheet({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-[440px] rounded-t-3xl bg-card p-6 pb-10"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-muted" />
        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
          Message privacy
        </p>
        <h3 className="mt-1 text-[22px] font-semibold tracking-tight">{title}</h3>
        <div className="mt-4 space-y-2">
          <PrivacyRow label="Default" value="Family visible" />
          <PrivacyRow label="Sensitive files" value="Attach through Vault" />
          <PrivacyRow label="Notifications" value="No private details in preview" />
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

function PrivacyRow({ label, value }: { label: string; value: string }) {
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
