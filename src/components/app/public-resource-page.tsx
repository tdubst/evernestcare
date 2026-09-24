import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import type { ReactNode } from "react";

type PublicResourcePageProps = {
  children: ReactNode;
  effectiveDate: string;
  title: string;
};

export function PublicResourcePage({ children, effectiveDate, title }: PublicResourcePageProps) {
  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-8 sm:py-14">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-primary">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Heart className="h-4 w-4" fill="currentColor" />
          </span>
          Evernest Care
        </Link>

        <header className="mt-10 border-b hairline pb-7">
          <p className="text-sm font-medium text-primary">Pre-launch review draft</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">Effective date: {effectiveDate}</p>
        </header>

        <div className="prose prose-slate mt-8 max-w-none space-y-8 text-[15px] leading-7 text-foreground">
          {children}
        </div>

        <footer className="mt-12 border-t hairline pt-6 text-sm text-muted-foreground">
          <Link to="/" className="font-medium text-primary">
            Back to Evernest Care
          </Link>
        </footer>
      </div>
    </main>
  );
}

export function ResourceSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}
