const requiredEnvironment = [
  "EXPECTED_DEPLOYMENT_ID",
  "EXPECTED_RELEASE_SHA",
  "PRODUCTION_HEALTHCHECK_URL",
];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]?.trim());

if (missingEnvironment.length > 0) {
  fail(`missing required environment: ${missingEnvironment.join(", ")}`);
}

const expectedSha = process.env.EXPECTED_RELEASE_SHA.trim();
const expectedDeploymentId = process.env.EXPECTED_DEPLOYMENT_ID.trim();
const productionUrl = parseProductionUrl(process.env.PRODUCTION_HEALTHCHECK_URL.trim());
const attempts = readPositiveInteger(process.env.DEPLOYMENT_VERIFY_ATTEMPTS, 120);
const intervalMs = readPositiveInteger(process.env.DEPLOYMENT_VERIFY_INTERVAL_MS, 5_000);

if (!/^[0-9a-f]{40}$/i.test(expectedSha)) {
  fail("EXPECTED_RELEASE_SHA must be a full Git commit SHA");
}

if (!/^dpl_[A-Za-z0-9]+$/.test(expectedDeploymentId)) {
  fail("EXPECTED_DEPLOYMENT_ID must be a Vercel deployment ID");
}

if (!productionUrl) {
  fail("PRODUCTION_HEALTHCHECK_URL must be a public HTTPS URL");
}

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  if (await verifyDeployment()) {
    console.log("Production deployment verification passed.");
    process.exit(0);
  }

  if (attempt < attempts) await delay(intervalMs);
}

fail("the expected release did not become healthy before the verification window closed");

async function verifyDeployment() {
  const nonce = Date.now().toString(36);
  const releaseResponse = await safeFetch(new URL(`/release.json?check=${nonce}`, productionUrl));

  if (!releaseResponse?.ok) return false;

  const release = await releaseResponse.json().catch(() => null);
  if (
    release?.appMode !== "production" ||
    release?.commit !== expectedSha ||
    release?.deploymentId !== expectedDeploymentId ||
    release?.environment !== "production" ||
    release?.version !== "0.1.0"
  ) {
    return false;
  }

  const [entryResponse, signInResponse] = await Promise.all([
    safeFetch(new URL(`/?check=${nonce}`, productionUrl)),
    safeFetch(new URL(`/sign-in?check=${nonce}`, productionUrl)),
  ]);

  return [entryResponse, signInResponse].every(
    (response) =>
      response?.ok &&
      response.headers.get("content-type")?.includes("text/html") &&
      hasSecurityHeaders(response.headers),
  );
}

function hasSecurityHeaders(headers) {
  return (
    headers.get("content-security-policy")?.includes("default-src 'self'") === true &&
    headers.get("x-content-type-options") === "nosniff" &&
    headers.get("x-frame-options") === "DENY" &&
    headers.get("referrer-policy") === "strict-origin-when-cross-origin" &&
    headers.get("permissions-policy")?.includes("camera=()") === true
  );
}

async function safeFetch(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    return await fetch(url, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
      redirect: "error",
      signal: controller.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function parseProductionUrl(value) {
  try {
    const parsed = new URL(value);
    const isPublicHost =
      parsed.hostname !== "localhost" &&
      parsed.hostname !== "127.0.0.1" &&
      parsed.hostname !== "[::1]";
    return parsed.protocol === "https:" && isPublicHost ? parsed : null;
  } catch {
    return null;
  }
}

function readPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function fail(message) {
  console.error(`Production deployment verification blocked: ${message}.`);
  process.exit(1);
}
