import { createFileRoute } from "@tanstack/react-router";

import { PublicResourcePage, ResourceSection } from "@/components/app/public-resource-page";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Support - Evernest Care" }] }),
  component: Support,
});

function Support() {
  return (
    <PublicResourcePage effectiveDate="Pending launch" title="Support">
      <p className="text-muted-foreground">
        Evernest Care support is being prepared for the invite-only production release. The public
        support contact and response targets must be approved before launch.
      </p>

      <ResourceSection title="Before contacting support">
        <p>
          Never include care details, passwords, access tokens, document contents, or sensitive
          family information in a public issue or message.
        </p>
      </ResourceSection>

      <ResourceSection title="Account access">
        <p>
          Use the password-recovery path from the sign-in screen. Recovery responses do not confirm
          whether an account exists.
        </p>
      </ResourceSection>

      <ResourceSection title="Emergencies">
        <p>
          Evernest Care support is not monitored as an emergency service. For an urgent safety or
          medical situation, contact the appropriate local emergency service or qualified
          professional.
        </p>
      </ResourceSection>

      <ResourceSection title="Launch status">
        <p>
          A private support channel, primary and backup owners, response targets, and an escalation
          drill remain required before production access is opened.
        </p>
      </ResourceSection>
    </PublicResourcePage>
  );
}
