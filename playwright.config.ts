import { defineConfig } from "@playwright/test";

const productionMode = process.env.E2E_APP_MODE === "production";
const port = productionMode ? 4174 : 4173;
const productionEnvironment =
  "VITE_APP_MODE=production VITE_REQUIRE_AUTH=true VITE_ENABLE_DEMO_WORKSPACE=false " +
  "VITE_SUPABASE_URL=https://example.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=test-public-key " +
  "VITE_PRIVACY_POLICY_URL=https://evernestcare.com/privacy " +
  "VITE_TERMS_URL=https://evernestcare.com/terms " +
  "VITE_SUPPORT_URL=https://support.evernestcare.com/help";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: productionMode
    ? "production-boundary.spec.ts"
    : ["accessibility.spec.ts", "golden-flows.spec.ts"],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    screenshot: "only-on-failure",
    trace: process.env.CI ? "retain-on-failure" : "off",
  },
  webServer: {
    command: `${productionMode ? `${productionEnvironment} ` : ""}node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port}`,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "true",
    timeout: 120_000,
    url: `http://127.0.0.1:${port}`,
  },
  projects: [
    {
      name: "mobile-chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
