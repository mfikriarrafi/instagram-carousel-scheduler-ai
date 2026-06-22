import { createClient } from "@supabase/supabase-js";

// Lazy extraction to avoid module-load crashes if keys are not defined
let supabaseClient: any = null;

export function getSupabase() {
  if (supabaseClient) return supabaseClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes("your-project") || url.includes("your-supabase")) {
    // Treat placeholder URL as unconfigured
    return null;
  }

  // Double check if the URL starts with http:// or https:// to prevent client initialization crash
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return null;
    }
  } catch (e) {
    // If not a valid URL, fallback gracefully to our integrated persistent JSON db.json store
    return null;
  }

  try {
    supabaseClient = createClient(url, anonKey);
    return supabaseClient;
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    return null;
  }
}

// Check if Supabase configuration is fully complete and valid
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  
  if (!url || !anonKey || url.includes("your-project") || url.includes("your-supabase")) {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}
