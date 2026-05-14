import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

let accessTokenProvider = null;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "[Supabase] Faltan variables VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY/VITE_SUPABASE_ANON_KEY"
  );
}

export function setSupabaseAccessTokenProvider(provider) {
  accessTokenProvider = typeof provider === "function" ? provider : null;
}

export async function getSupabaseAccessToken() {
  if (!accessTokenProvider) return null;
  try {
    return await accessTokenProvider();
  } catch (error) {
    console.warn("[Supabase] No se pudo obtener el token de Clerk", error);
    return null;
  }
}

export function getSupabaseFunctionUrl(path) {
  if (!supabaseUrl) return "";
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/${path.replace(
    /^\//,
    ""
  )}`;
}

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        accessToken: getSupabaseAccessToken,
      })
    : null;
