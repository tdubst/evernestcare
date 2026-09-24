export type SafeErrorCode =
  | "auth_password_reset_failed"
  | "auth_password_update_failed"
  | "auth_session_refresh_failed"
  | "auth_sign_in_failed"
  | "auth_sign_out_failed"
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
