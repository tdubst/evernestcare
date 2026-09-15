import { createFileRoute } from "@tanstack/react-router";
import { BellOff, Lock, MessageCircle, ShieldCheck } from "lucide-react";

import { isProductionRuntime } from "@/lib/runtime-mode";

export const Route = createFileRoute("/_tabs/messages")({
  head: () => ({ meta: [{ title: "Messages — Evernest Care" }] }),
  component: Messages,
});

const readinessRows = [
  {
    icon: ShieldCheck,
    label: "Care updates",
    value: "Deferred",
    detail: "Realtime chat is not part of this beta preview.",
  },
  {
    icon: BellOff,
    label: "Notifications",
    value: "Off",
    detail: "No care details are sent through push notifications.",
  },
  {
    icon: Lock,
    label: "Attachments",
    value: "Vault only",
    detail: "Files stay in the reviewed Vault placeholder flow.",
  },
] as const;

function Messages() {
  const production = isProductionRuntime();

  return (
    <div>
      <header className="px-6 pb-3 pt-14">
        <h1 className="text-[28px] font-semibold tracking-tight">Messages</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          {production
            ? "Family messaging is not included in this release."
            : "Family messaging is paused for beta hardening while access and notification rules are reviewed."}
        </p>
      </header>

      <section className="px-6 pt-3">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage text-sage-foreground">
            <MessageCircle className="h-5 w-5" />
          </div>
          <p className="mt-4 text-[18px] font-semibold">
            {production ? "Messaging unavailable" : "Messaging unavailable in this beta"}
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            Use care notes and approved Care Circle workflows for this release. Message delivery,
            media, voice, and notifications require a separate privacy and security review.
          </p>
        </div>
      </section>

      <section className="px-6 pt-5">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
          Beta readiness
        </p>
        <div className="mt-3 space-y-3">
          {readinessRows.map((row) => (
            <div
              key={row.label}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                <row.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[14px] font-semibold">{row.label}</p>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-primary">
                    {row.value}
                  </span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  {row.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
