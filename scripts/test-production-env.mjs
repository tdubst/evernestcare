import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const validator = fileURLToPath(new URL("./validate-production-env.mjs", import.meta.url));
const publicResources = {
  VITE_PRIVACY_POLICY_URL: "https://evernestcare.vercel.app/privacy",
  VITE_SUPPORT_URL: "https://evernestcare.vercel.app/support",
  VITE_TERMS_URL: "https://evernestcare.vercel.app/terms",
};
const wrongApprovedResourceUrls = {
  VITE_PRIVACY_POLICY_URL: "https://evernestcare.vercel.app/privacy-notice",
  VITE_SUPPORT_URL: "https://evernestcare.vercel.app/contact",
  VITE_TERMS_URL: "https://evernestcare.vercel.app/legal",
};
const unsafePublicResourceUrls = [
  "http://evernestcare.vercel.app/privacy",
  "https://localhost./privacy",
  "https://legal.local/privacy",
  "https://10.0.0.1/privacy",
  "https://169.254.169.254/latest/meta-data",
  "https://[fd00::1]/privacy",
  "https://user:password@evernestcare.vercel.app/privacy",
  "https://evernestcare.vercel.app:444/privacy",
  "https://evernestcare.vercel.app/privacy?token=value",
  "https://evernestcare.vercel.app/privacy#account",
  "https://evernestcare.vercel.app/privacy?",
  "https://evernestcare.vercel.app/privacy#",
  "https://evernestcare.vercel.app/privacy?#",
  "https://example.com/privacy",
  "https://privacy.example.com/policy",
  "https://service.example/policy",
  "https://legal.example/policy",
  "https://privacy.onion/policy",
  "https://privacy.alt/policy",
  "https://home.arpa/policy",
  "https://privacy.corp/policy",
  "https://privacy.evernestcare.vercel.app/policy",
  "https://xn--e1awd7f.com/privacy",
];

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
    ...publicResources,
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
    ...publicResources,
  }).status,
  0,
  "production should accept complete fail-closed configuration",
);

for (const name of Object.keys(publicResources)) {
  const missing = { ...publicResources };
  delete missing[name];
  assert.notEqual(
    run({
      VITE_APP_MODE: "production",
      VITE_ENABLE_DEMO_WORKSPACE: "false",
      VITE_REQUIRE_AUTH: "true",
      VITE_SUPABASE_PUBLISHABLE_KEY: "public-test-key",
      VITE_SUPABASE_URL: "https://example.supabase.co",
      ...missing,
    }).status,
    0,
    `production must reject missing ${name}`,
  );

  for (const unsafeUrl of unsafePublicResourceUrls) {
    assert.notEqual(
      run({
        VITE_APP_MODE: "production",
        VITE_ENABLE_DEMO_WORKSPACE: "false",
        VITE_REQUIRE_AUTH: "true",
        VITE_SUPABASE_PUBLISHABLE_KEY: "public-test-key",
        VITE_SUPABASE_URL: "https://example.supabase.co",
        ...publicResources,
        [name]: unsafeUrl,
      }).status,
      0,
      `production must reject an unsafe ${name}`,
    );
  }

  assert.notEqual(
    run({
      VITE_APP_MODE: "production",
      VITE_ENABLE_DEMO_WORKSPACE: "false",
      VITE_REQUIRE_AUTH: "true",
      VITE_SUPABASE_PUBLISHABLE_KEY: "public-test-key",
      VITE_SUPABASE_URL: "https://example.supabase.co",
      ...publicResources,
      [name]: wrongApprovedResourceUrls[name],
    }).status,
    0,
    `production must reject the wrong approved-host path for ${name}`,
  );
}

console.log("Production environment guard tests passed.");
