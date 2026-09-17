const approvedHosts = new Set(["evernestcare.com", "support.evernestcare.com"]);

export const publicResourceUrls = Object.freeze({
  privacyPolicy: "https://evernestcare.com/privacy",
  support: "https://support.evernestcare.com/help",
  terms: "https://evernestcare.com/terms",
});

export function parsePublicResourceUrl(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048) return null;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const hasValidHostname =
      approvedHosts.has(hostname) &&
      !hostname.endsWith(".") &&
      !hostname.startsWith("[") &&
      !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) &&
      hostname
        .split(".")
        .every(
          (label) =>
            label.length > 0 &&
            label.length <= 63 &&
            !label.startsWith("-") &&
            !label.endsWith("-") &&
            !label.startsWith("xn--") &&
            /^[a-z0-9-]+$/.test(label),
        );

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      value.includes("?") ||
      value.includes("#") ||
      url.search ||
      url.hash ||
      !hasValidHostname
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}
