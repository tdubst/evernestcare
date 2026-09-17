import { defineConfig } from "@playwright/test";

const productionMode = process.env.E2E_APP_MODE === "production";
const port = productionMode ? 4174 : 4173;
const buildCommand = productionMode ? "npm run build:production" : "npm run build:vercel";
const webServerCommand = `${buildCommand} && node ./node_modules/vite/bin/vite.js preview --config vite.vercel.config.ts --outDir dist-vercel --host 127.0.0.1 --port ${port} --strictPort`;

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
    command: webServerCommand,
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
    {
      name: "mobile-webkit",
      use: {
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "desktop-firefox",
      use: {
        browserName: "firefox",
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
