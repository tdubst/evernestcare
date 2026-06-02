import { mkdir, writeFile } from "node:fs/promises";

const outputDir = new URL("../dist-vercel/", import.meta.url);
const config = {
  rewrites: [
    {
      source: "/(.*)",
      destination: "/index.html",
    },
  ],
};

await mkdir(outputDir, { recursive: true });
await writeFile(new URL("vercel.json", outputDir), `${JSON.stringify(config, null, 2)}\n`);
