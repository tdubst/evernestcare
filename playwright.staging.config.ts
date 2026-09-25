import { defineConfig } from "@playwright/test";

const port = 4175;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "production-staging-browser.spec.ts",
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    screenshot: "off",
    trace: "off",
    video: "off",
  },
  webServer: {
    command:
      "npm run build:vercel && node ./node_modules/vite/bin/vite.js preview --config vite.vercel.config.ts --outDir dist-vercel --host 127.0.0.1 --port 4175 --strictPort",
    reuseExistingServer: false,
    timeout: 120_000,
    url: `http://127.0.0.1:${port}`,
  },
  projects: [
    {
      name: "staging-mobile-chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "staging-mobile-webkit",
      use: {
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "staging-desktop-firefox",
      use: {
        browserName: "firefox",
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
