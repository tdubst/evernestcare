import { readFile, readdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const assetsDirectory = new URL("../dist-vercel/assets/", import.meta.url);
const javascriptFiles = (await readdir(assetsDirectory)).filter((name) => name.endsWith(".js"));

if (javascriptFiles.length === 0) {
  throw new Error("No JavaScript assets were produced by the Vercel build.");
}

const sizes = await Promise.all(
  javascriptFiles.map(async (name) => {
    const contents = await readFile(new URL(name, assetsDirectory));
    return { gzipBytes: gzipSync(contents).byteLength, name, rawBytes: contents.byteLength };
  }),
);
const largest = sizes.toSorted((left, right) => right.rawBytes - left.rawBytes)[0];
const rawLimit = 540_000;
const gzipLimit = 165_000;

if (largest.rawBytes > rawLimit || largest.gzipBytes > gzipLimit) {
  throw new Error(
    `Largest JavaScript asset ${largest.name} exceeds the budget: ${largest.rawBytes} raw bytes, ${largest.gzipBytes} gzip bytes.`,
  );
}

console.log(
  `Web bundle budget passed: ${largest.name} is ${largest.rawBytes} raw bytes and ${largest.gzipBytes} gzip bytes.`,
);
