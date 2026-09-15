const isProductionDeploy = process.env.VERCEL_ENV === "production";

if (!isProductionDeploy) process.exit(0);

const publishableKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
const failures = [];

if (process.env.VITE_APP_MODE !== "production") {
  failures.push("VITE_APP_MODE must equal production");
}
if (process.env.VITE_REQUIRE_AUTH !== "true") {
  failures.push("VITE_REQUIRE_AUTH must equal true");
}
if (!process.env.VITE_SUPABASE_URL) failures.push("VITE_SUPABASE_URL is required");
if (!publishableKey) failures.push("a Supabase publishable key is required");
if (process.env.VITE_ENABLE_DEMO_WORKSPACE === "true") {
  failures.push("VITE_ENABLE_DEMO_WORKSPACE must not be true");
}
if (process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
  failures.push("VITE_SUPABASE_SERVICE_ROLE_KEY must never be exposed to the browser");
}

if (failures.length > 0) {
  console.error("Production environment validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Production environment validation passed.");
