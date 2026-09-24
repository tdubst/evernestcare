export type AppRuntimeMode = "beta" | "production";

export function getAppRuntimeMode(): AppRuntimeMode {
  return import.meta.env.VITE_APP_MODE === "production" ? "production" : "beta";
}

export function isProductionRuntime() {
  return getAppRuntimeMode() === "production";
}

export function isDemoWorkspaceEnabled() {
  return !isProductionRuntime() && import.meta.env.VITE_ENABLE_DEMO_WORKSPACE !== "false";
}
