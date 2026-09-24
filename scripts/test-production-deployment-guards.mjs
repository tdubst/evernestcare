import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const verifier = fileURLToPath(new URL("./verify-production-deployment.mjs", import.meta.url));
const validEnvironment = {
  EXPECTED_APP_MODE: "production",
  EXPECTED_DEPLOYMENT_ID: "dpl_ProductionGuard",
  EXPECTED_RELEASE_SHA: "0123456789abcdef0123456789abcdef01234567",
  PRODUCTION_HEALTHCHECK_URL: "https://example.com",
};

assertBlocked({}, "missing required environment");
assertBlocked({ ...validEnvironment, EXPECTED_APP_MODE: "preview" }, "must be beta or production");
assertBlocked(
  { ...validEnvironment, EXPECTED_RELEASE_SHA: "not-a-sha" },
  "must be a full Git commit SHA",
);
assertBlocked(
  { ...validEnvironment, EXPECTED_DEPLOYMENT_ID: "invalid" },
  "must be a Vercel deployment ID",
);

console.log("Production deployment guard tests passed.");

function assertBlocked(environment, expectedMessage) {
  const result = spawnSync(process.execPath, [verifier], {
    encoding: "utf8",
    env: { PATH: process.env.PATH, ...environment },
    timeout: 5_000,
  });
  const output = `${result.stdout}${result.stderr}`;

  if (result.status !== 1 || !output.includes(expectedMessage)) {
    throw new Error("Production deployment guard test failed.");
  }
}
