import { createFileRoute } from "@tanstack/react-router";

import { PublicResourcePage, ResourceSection } from "@/components/app/public-resource-page";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms - Evernest Care" }] }),
  component: Terms,
});

function Terms() {
  return (
    <PublicResourcePage effectiveDate="Pending approval" title="Terms">
      <p className="text-muted-foreground">
        These draft terms describe the intended boundary for the first invite-only Evernest Care
        release. They must be reviewed and approved before production launch.
      </p>

      <ResourceSection title="Purpose">
        <p>
          Evernest Care is a family coordination workspace. It is not an emergency service, medical
          provider, electronic health record, or substitute for professional medical advice,
          diagnosis, or treatment.
        </p>
      </ResourceSection>

      <ResourceSection title="Authorized use">
        <p>
          Access is invite-only. Users are responsible for protecting their credentials, using the
          service lawfully, and entering information only when they have authority to do so.
        </p>
      </ResourceSection>

      <ResourceSection title="Service boundaries">
        <p>
          Features may change or be unavailable while the service is being prepared for launch.
          Users must not rely on Evernest Care for urgent safety needs, time-critical instructions,
          or clinical decisions.
        </p>
      </ResourceSection>

      <ResourceSection title="Account suspension and closure">
        <p>
          Access may be limited to protect users, comply with law, or address misuse. The reviewed
          account-closure and retention process must be approved before these terms become
          effective.
        </p>
      </ResourceSection>

      <ResourceSection title="Changes">
        <p>
          Material changes will be reflected by an updated effective date and appropriate notice
          before they apply.
        </p>
      </ResourceSection>
    </PublicResourcePage>
  );
}
