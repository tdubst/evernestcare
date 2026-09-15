import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { ShieldCheck } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Choose a password - Evernest Care" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const { session, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (password !== confirmation) {
      setNotice("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setNotice(null);
    const result = await updatePassword(password);
    setSubmitting(false);
    if (result.status === "ready") {
      setSaved(true);
      return;
    }
    setNotice("Your password could not be updated. Request a new reset link and try again.");
  }

  return (
    <main className="phone-shell grad-hero flex min-h-dvh flex-col px-6 pb-10 pt-12">
      <div className="mt-12">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sage text-sage-foreground">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <h1 className="mt-5 text-[30px] font-semibold tracking-tight">Choose a new password</h1>
      </div>

      {saved ? (
        <div className="card-soft mt-8 space-y-4 p-5" role="status">
          <p className="text-[14px]">Your password has been updated.</p>
          <Link to="/today" className="block text-[14px] font-medium text-primary">
            Open your workspace
          </Link>
        </div>
      ) : session ? (
        <form onSubmit={handleSubmit} className="card-soft mt-8 space-y-4 p-5">
          <PasswordField label="New password" value={password} onChange={setPassword} />
          <PasswordField
            label="Confirm new password"
            value={confirmation}
            onChange={setConfirmation}
          />
          {notice && (
            <p role="alert" className="rounded-2xl bg-blush px-4 py-3 text-[13px]">
              {notice}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-primary py-3.5 text-[15px] font-medium text-primary-foreground disabled:bg-secondary disabled:text-muted-foreground"
          >
            {submitting ? "Updating..." : "Update password"}
          </button>
        </form>
      ) : (
        <div className="card-soft mt-8 space-y-4 p-5">
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            This reset link is unavailable or has expired.
          </p>
          <Link to="/forgot-password" className="block text-[14px] font-medium text-primary">
            Request a new reset link
          </Link>
        </div>
      )}
    </main>
  );
}

function PasswordField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium">{label}</span>
      <input
        type="password"
        autoComplete="new-password"
        minLength={12}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border hairline bg-background px-4 py-3 text-[16px] outline-none focus:ring-2 focus:ring-primary"
      />
    </label>
  );
}
