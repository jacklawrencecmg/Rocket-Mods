import { createClient } from "@supabase/supabase-js";

const url  = import.meta.env.VITE_SUPABASE_URL  as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabaseConfigured = !!(url && anon);

// Fall back to placeholder values so createClient doesn't throw;
// the app will show a config error screen instead of a white page.
export const supabase = createClient(
  url  || "https://placeholder.supabase.co",
  anon || "placeholder-anon-key"
);
