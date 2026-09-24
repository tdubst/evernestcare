import { parsePublicResourceUrl } from "@/lib/public-resource-url.mjs";

const resources = [
  {
    href: parsePublicResourceUrl(import.meta.env.VITE_PRIVACY_POLICY_URL),
    label: "Privacy Policy",
  },
  { href: parsePublicResourceUrl(import.meta.env.VITE_TERMS_URL), label: "Terms" },
  { href: parsePublicResourceUrl(import.meta.env.VITE_SUPPORT_URL), label: "Support" },
].filter((resource): resource is { href: string; label: string } => resource.href !== null);

export function PublicResourceLinks() {
  if (resources.length === 0) return null;

  return (
    <nav aria-label="Privacy, terms, and support" className="flex flex-wrap justify-center gap-4">
      {resources.map((resource) => (
        <a
          key={resource.label}
          href={resource.href}
          rel="noreferrer"
          className="inline-flex min-h-11 items-center px-1 text-[12px] font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          {resource.label}
        </a>
      ))}
    </nav>
  );
}
