export type SupabaseRuntimeConfig = {
  anonKey: string;
  authRequired: boolean;
  url: string;
};

export function getSupabaseRuntimeConfig(): SupabaseRuntimeConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
  const authRequired = import.meta.env.VITE_REQUIRE_AUTH === "true";

  if (!url || !anonKey) {
    return null;
  }

  return { anonKey, authRequired, url };
}

export function isAuthRequiredForRoutes() {
  return import.meta.env.VITE_REQUIRE_AUTH === "true";
}
