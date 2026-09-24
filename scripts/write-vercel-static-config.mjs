import { mkdir, readFile, writeFile } from "node:fs/promises";

const outputDir = new URL("../dist-vercel/", import.meta.url);
const packageMetadata = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const config = {
  headers: [
    {
      source: "/release.json",
      headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
    },
  ],
  rewrites: [
    {
      source: "/(.*)",
      destination: "/index.html",
    },
  ],
};
const release = {
  appMode: process.env.VITE_APP_MODE === "production" ? "production" : "beta",
  commit: process.env.VERCEL_GIT_COMMIT_SHA?.trim() || "local",
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID?.trim() || "local",
  environment: process.env.VERCEL_ENV?.trim() || "local",
  version: packageMetadata.version,
};

await mkdir(outputDir, { recursive: true });
await writeFile(new URL("vercel.json", outputDir), `${JSON.stringify(config, null, 2)}\n`);
await writeFile(new URL("release.json", outputDir), `${JSON.stringify(release)}\n`);
