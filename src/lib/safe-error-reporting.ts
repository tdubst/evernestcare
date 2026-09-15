export type SafeErrorCode =
  | "client_render_failed"
  | "server_request_failed"
  | "server_response_failed"
  | "server_start_failed";

export function classifyError(error: unknown) {
  if (error instanceof Error && error.name) return error.name;
  return typeof error === "string" ? "StringError" : "UnknownError";
}

export function reportSafeError(code: SafeErrorCode, error: unknown) {
  console.error(
    JSON.stringify({
      category: classifyError(error),
      code,
    }),
  );
}
