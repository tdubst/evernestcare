import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseRuntimeConfig } from "./config";

let browserClient: SupabaseClient | null | undefined;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (browserClient !== undefined) {
    return browserClient;
  }

  const config = getSupabaseRuntimeConfig();
  if (!config) {
    browserClient = null;
    return browserClient;
  }

  browserClient = createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });

  return browserClient;
}
