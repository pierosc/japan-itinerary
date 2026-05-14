import {
  getSupabaseAccessToken,
  getSupabaseFunctionUrl,
  supabase,
} from "../lib/supabaseClient";

function missingSupabaseError() {
  return new Error("Supabase no configurado.");
}

function normalizeSupabaseError(error) {
  const message = error?.message || String(error || "");
  if (/no suitable key|wrong key type|invalid jwt|jwt/i.test(message)) {
    return new Error(
      "Supabase rechazó el token de Clerk. La app usará la Edge Function segura como puente mientras configuras Third-Party Auth."
    );
  }
  return error;
}

function normalizeTripRow(row) {
  return {
    id: row.trip_id,
    title: row.title || "Sin título",
    destination: row.destination || "Japan",
    coverImage: row.image_url || "",
    updatedAt: row.updated_at || null,
    data: row.data || null,
    ownerUserId: row.user_id || null,
    sharedWithUserIds: row.shared_with_user_ids || [],
  };
}

async function callTripsApi(method, body) {
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error("No se pudo obtener sesión de Clerk.");

  const response = await fetch(getSupabaseFunctionUrl("trips-api/trips"), {
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

async function fetchTripsWithPostgrest(userId) {
  const { data, error } = await supabase
    .from("trip_data")
    .select(
      "trip_id, title, destination, image_url, updated_at, data, user_id, shared_with_user_ids"
    )
    .or(`user_id.eq.${userId},shared_with_user_ids.cs.{${userId}}`)
    .order("updated_at", { ascending: false });

  if (error) throw normalizeSupabaseError(error);
  return { trips: (data || []).map(normalizeTripRow) };
}

export async function fetchTripsOnline(userId) {
  if (!supabase) return { ok: false, error: missingSupabaseError() };
  if (!userId) return { ok: false, error: new Error("Missing userId") };

  try {
    return { ok: true, ...(await callTripsApi("GET")) };
  } catch (edgeError) {
    try {
      return { ok: true, ...(await fetchTripsWithPostgrest(userId)) };
    } catch (postgrestError) {
      return {
        ok: false,
        error: normalizeSupabaseError(edgeError || postgrestError),
      };
    }
  }
}

export async function saveTripOnline({
  tripId,
  userId,
  ownerUserId,
  sharedWithUserIds = [],
  data,
  title,
  destination,
  imageUrl,
}) {
  if (!supabase) return { ok: false, error: missingSupabaseError() };
  if (!userId) return { ok: false, error: new Error("Missing userId") };

  try {
    const result = await callTripsApi("POST", {
      tripId,
      userId,
      ownerUserId,
      sharedWithUserIds,
      data,
      title,
      destination,
      imageUrl,
    });

    return { ok: true, data: result.data };
  } catch (error) {
    return { ok: false, error: normalizeSupabaseError(error) };
  }
}
