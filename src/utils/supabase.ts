import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "Supabase env vars are missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;