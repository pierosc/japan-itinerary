// src/lib/onlineStorage.js
import { supabase } from "./supabaseClient";

export async function saveTripOnline({ tripId, userId, data }) {
  if (!supabase) {
    const error = new Error(
      "Supabase no está configurado. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY."
    );
    console.error("[Supabase] saveTripOnline:", error);
    return { ok: false, error };
  }

  try {
    const payload = { trip_id: tripId, user_id: userId ?? null, data };

    const { data: upserted, error } = await supabase
      .from("trip_data")
      .upsert(payload, { onConflict: "trip_id" })
      .select("trip_id, updated_at")
      .single();

    if (error) {
      console.error("[Supabase] saveTripOnline error:", error);
      return { ok: false, error };
    }

    console.log("[Supabase] Guardado OK:", upserted);
    return { ok: true, data: upserted };
  } catch (err) {
    console.error("[Supabase] saveTripOnline exception:", err);
    return { ok: false, error: err };
  }
}

export async function loadTripOnline({ tripId, userId }) {
  if (!supabase) {
    const error = new Error(
      "Supabase no está configurado. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY."
    );
    console.error("[Supabase] loadTripOnline:", error);
    return { ok: false, error };
  }

  try {
    let query = supabase
      .from("trip_data")
      .select("data, updated_at")
      .eq("trip_id", tripId);

    if (userId) query = query.eq("user_id", userId);

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("[Supabase] loadTripOnline error:", error);
      return { ok: false, error };
    }

    if (!data) {
      const notFound = new Error(
        "No se encontró ningún registro para este viaje."
      );
      console.warn("[Supabase] loadTripOnline:", notFound.message);
      return { ok: false, error: notFound };
    }

    console.log("[Supabase] Carga OK:", data);
    return { ok: true, data: data.data, meta: { updated_at: data.updated_at } };
  } catch (err) {
    console.error("[Supabase] loadTripOnline exception:", err);
    return { ok: false, error: err };
  }
}
