// Import only from server routes. The publishable key is used with anon RLS,
// never with service-role privileges; no sessions or authentication are created.
import { createClient } from "@supabase/supabase-js";

export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url && !key) return null;
  if (!url || !key) throw new Error("Supabase configuration incomplete");
  if (key.startsWith("sb_secret_")) throw new Error("Use a publishable key");
  if (key.startsWith("eyJ")) {
    const claims = JSON.parse(
      Buffer.from(key.split(".")[1], "base64url").toString(),
    );
    if (claims.role !== "anon")
      throw new Error("Use a publishable or legacy anon key");
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
