import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const validator = fileURLToPath(new URL("./validate-production-env.mjs", import.meta.url));

function run(overrides) {
  return spawnSync(process.execPath, [validator], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      VERCEL_ENV: "production",
      ...overrides,
    },
  });
}

assert.notEqual(run({}).status, 0, "production must reject missing configuration");
assert.notEqual(
  run({
    VITE_APP_MODE: "production",
    VITE_ENABLE_DEMO_WORKSPACE: "true",
    VITE_REQUIRE_AUTH: "true",
    VITE_SUPABASE_PUBLISHABLE_KEY: "public-test-key",
    VITE_SUPABASE_URL: "https://example.supabase.co",
  }).status,
  0,
  "production must reject the demo workspace",
);
assert.equal(
  run({
    VITE_APP_MODE: "production",
    VITE_ENABLE_DEMO_WORKSPACE: "false",
    VITE_REQUIRE_AUTH: "true",
    VITE_SUPABASE_PUBLISHABLE_KEY: "public-test-key",
    VITE_SUPABASE_URL: "https://example.supabase.co",
  }).status,
  0,
  "production should accept complete fail-closed configuration",
);

console.log("Production environment guard tests passed.");
