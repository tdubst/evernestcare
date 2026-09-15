import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/sign-in")({
  head: () => ({ meta: [{ title: "Sign in - Evernest Care" }] }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const { client, signInWithPassword, status } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      void navigate({ to: "/today", replace: true });
    }
  }, [navigate, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setNotice(null);
    const result = await signInWithPassword(email.trim(), password);
    setSubmitting(false);

    if (result.status === "ready") {
      void navigate({ to: "/today", replace: true });
      return;
    }

    setNotice(
      result.status === "invalid"
        ? "We could not sign you in with those details."
        : "Sign-in is unavailable right now. Please try again later.",
    );
  }

  return (
    <main className="phone-shell grad-hero flex min-h-dvh flex-col px-6 pb-10 pt-12">
      <Link to="/" className="text-[13px] font-medium text-muted-foreground">
        Back to Evernest Care
      </Link>

      <div className="mt-12">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sage text-sage-foreground">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <h1 className="mt-5 text-[30px] font-semibold leading-tight tracking-tight">
          Sign in to your care workspace
        </h1>
        <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-muted-foreground">
          Access is limited to invited family members and approved caregivers.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card-soft mt-8 space-y-4 p-5">
        <label className="block">
          <span className="text-[13px] font-medium">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-2xl border hairline bg-background px-4 py-3 text-[16px] outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-medium">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-2xl border hairline bg-background px-4 py-3 text-[16px] outline-none focus:ring-2 focus:ring-primary"
          />
        </label>

        {notice && (
          <p
            role="alert"
            className="rounded-2xl bg-blush px-4 py-3 text-[13px] text-blush-foreground"
          >
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={!client || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-[15px] font-medium text-primary-foreground disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"
        >
          <LockKeyhole className="h-4 w-4" />
          {submitting ? "Signing in..." : "Sign in"}
        </button>

        {!client && (
          <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
            Sign-in is not connected in this environment.
          </p>
        )}
      </form>

      <p className="mt-auto pt-10 text-center text-[12px] leading-relaxed text-muted-foreground">
        Do not use Evernest Care for emergencies or medical decisions.
      </p>
    </main>
  );
}
