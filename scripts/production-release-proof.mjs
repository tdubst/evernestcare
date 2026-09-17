import { createHash } from "node:crypto";

export function isFullGitSha(value) {
  return /^[0-9a-f]{40}$/.test(value);
}

export function releaseProofIdForSha(sha) {
  if (!isFullGitSha(sha)) throw new Error("release SHA is invalid");

  const hex = createHash("sha256").update(`evernest-production-proof:${sha}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
