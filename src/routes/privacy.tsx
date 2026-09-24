import { createFileRoute } from "@tanstack/react-router";

import { PublicResourcePage, ResourceSection } from "@/components/app/public-resource-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy - Evernest Care" }] }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <PublicResourcePage effectiveDate="Pending approval" title="Privacy Policy">
      <p className="text-muted-foreground">
        This draft explains the intended privacy boundary for the first invite-only Evernest Care
        release. It must be reviewed and approved before production launch.
      </p>

      <ResourceSection title="Information Evernest Care handles">
        <p>
          The service may process account details, family care-coordination information entered by
          authorized users, permission and membership records, and limited security and reliability
          data needed to operate the service.
        </p>
      </ResourceSection>

      <ResourceSection title="How information is used">
        <p>
          Information is used to provide the authorized family workspace, enforce access controls,
          support account recovery, maintain service security, and respond to support requests.
        </p>
      </ResourceSection>

      <ResourceSection title="Sharing and sale">
        <p>
          Evernest Care does not sell personal information. Information may be handled by reviewed
          service providers only as needed to operate, secure, and support the service, or when
          required by law.
        </p>
      </ResourceSection>

      <ResourceSection title="Retention, access, and deletion">
        <p>
          Retention and deletion periods are being finalized for launch. Authorized users will have
          a reviewed path to request access, correction, or account closure. Do not send care
          details through a public support channel.
        </p>
      </ResourceSection>

      <ResourceSection title="Security and health information">
        <p>
          Evernest Care uses access controls and reviewed technical safeguards, but no online
          service can guarantee absolute security. HIPAA applicability, vendor agreements, and
          production data-processing obligations remain launch gates and are not represented as
          complete by this draft.
        </p>
      </ResourceSection>
    </PublicResourcePage>
  );
}
