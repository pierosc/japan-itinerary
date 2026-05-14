import {
  getSupabaseAccessToken,
  getSupabaseFunctionUrl,
  supabase,
} from "../lib/supabaseClient";

function missingSupabaseError() {
  return new Error("Supabase no configurado.");
}

async function callTripsApi(path, { method = "GET", body } = {}) {
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error("No se pudo obtener sesión de Clerk.");

  const response = await fetch(getSupabaseFunctionUrl(`trips-api/${path}`), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Error ${response.status}`);
  }
  return payload;
}

export function getProfileDraftFromClerkUser(user) {
  if (!user?.id) return null;

  return {
    email: user.primaryEmailAddress?.emailAddress || "",
    fullName: user.fullName || user.username || "",
    avatarUrl: user.imageUrl || "",
  };
}

export async function syncCurrentUserProfile(user) {
  if (!supabase) return { ok: false, error: missingSupabaseError() };
  const profile = getProfileDraftFromClerkUser(user);
  if (!user?.id || !profile) return { ok: false, error: new Error("Missing user") };

  try {
    return {
      ok: true,
      ...(await callTripsApi("profiles/me", {
        method: "POST",
        body: profile,
      })),
    };
  } catch (error) {
    return { ok: false, error };
  }
}

export async function fetchProfilesByIds(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!supabase) return { ok: false, error: missingSupabaseError() };
  if (!ids.length) return { ok: true, profiles: [] };

  try {
    const params = new URLSearchParams({ ids: ids.join(",") });
    return { ok: true, ...(await callTripsApi(`profiles?${params}`)) };
  } catch (error) {
    return { ok: false, error };
  }
}

export async function searchProfiles(term) {
  if (!supabase) return { ok: false, error: missingSupabaseError() };
  if (!term?.trim()) return { ok: true, profiles: [] };

  try {
    const params = new URLSearchParams({ q: term.trim() });
    return { ok: true, ...(await callTripsApi(`profiles?${params}`)) };
  } catch (error) {
    return { ok: false, error };
  }
}

export async function updateTripSharing(tripId, sharedWithUserIds) {
  if (!supabase) return { ok: false, error: missingSupabaseError() };
  if (!tripId) return { ok: false, error: new Error("Missing tripId") };

  try {
    return {
      ok: true,
      ...(await callTripsApi("trip-share", {
        method: "POST",
        body: { tripId, sharedWithUserIds },
      })),
    };
  } catch (error) {
    return { ok: false, error };
  }
}
