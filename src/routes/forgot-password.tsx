import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { KeyRound } from "lucide-react";

import { PublicResourceLinks } from "@/components/app/public-resource-links";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password - Evernest Care" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setNotice(null);
    const result = await requestPasswordReset(email.trim());
    setSubmitting(false);
    if (result.status !== "ready") {
      setNotice("Password reset is unavailable right now. Please try again later.");
      return;
    }
    setSent(true);
  }

  return (
    <main className="phone-shell grad-hero flex min-h-dvh flex-col px-6 pb-10 pt-12">
      <Link to="/sign-in" className="text-[13px] font-medium text-muted-foreground">
        Back to sign in
      </Link>
      <div className="mt-12">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sage text-sage-foreground">
          <KeyRound className="h-5 w-5" />
        </span>
        <h1 className="mt-5 text-[30px] font-semibold tracking-tight">Reset your password</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Enter the email address associated with your invited account.
        </p>
      </div>

      {sent ? (
        <div role="status" className="card-soft mt-8 p-5 text-[14px] leading-relaxed">
          If an invited account matches that address, password reset instructions will arrive by
          email.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card-soft mt-8 space-y-4 p-5">
          <label className="block">
            <span className="text-[13px] font-medium">Email</span>
            <input
              type="email"
              autoComplete="email"
              disabled={!hydrated || submitting}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border hairline bg-background px-4 py-3 text-[16px] outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          {notice && (
            <p role="alert" className="rounded-2xl bg-blush px-4 py-3 text-[13px]">
              {notice}
            </p>
          )}
          <button
            type="submit"
            disabled={!hydrated || submitting}
            className="w-full rounded-full bg-primary py-3.5 text-[15px] font-medium text-primary-foreground disabled:bg-secondary disabled:text-muted-foreground"
          >
            {submitting ? "Sending..." : "Send reset instructions"}
          </button>
        </form>
      )}
      <div className="mt-auto pt-10">
        <PublicResourceLinks />
      </div>
    </main>
  );
}
