// src/lib/onlineStorage.js
import { supabase } from "./supabaseClient";

/**
 * Guarda el itinerario completo de un trip en Supabase (tabla trip_data).
 * - Si ya existe ese trip_id -> hace upsert (update).
 */
export async function saveTripOnline({ tripId, title, userId, data }) {
  if (!supabase) {
    const error = new Error("Supabase no está configurado.");
    console.error("[Supabase] saveTripOnline:", error);
    return { ok: false, error };
  }

  try {
    const payload = {
      trip_id: tripId,
      title: title ?? null,
      user_id: userId ?? null,
      data,
    };

    const { data: row, error } = await supabase
      .from("trip_data")
      .upsert(payload, { onConflict: "trip_id" })
      .select("trip_id, title, updated_at")
      .single();

    if (error) {
      console.error("[Supabase] saveTripOnline error:", error);
      return { ok: false, error };
    }

    return { ok: true, data: row };
  } catch (err) {
    console.error("[Supabase] saveTripOnline exception:", err);
    return { ok: false, error: err };
  }
}

/**
 * Carga el JSON de un trip concreto.
 */
export async function loadTripOnline({ tripId, userId }) {
  if (!supabase) {
    const error = new Error("Supabase no está configurado.");
    console.error("[Supabase] loadTripOnline:", error);
    return { ok: false, error };
  }

  try {
    let query = supabase
      .from("trip_data")
      .select("data, title, updated_at, user_id")
      .eq("trip_id", tripId);

    if (userId) query = query.eq("user_id", userId);

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("[Supabase] loadTripOnline error:", error);
      return { ok: false, error };
    }

    if (!data) {
      const notFound = new Error("No se encontró este viaje en Supabase.");
      return { ok: false, error: notFound };
    }

    return {
      ok: true,
      data: data.data,
      meta: { title: data.title, updated_at: data.updated_at },
    };
  } catch (err) {
    console.error("[Supabase] loadTripOnline exception:", err);
    return { ok: false, error: err };
  }
}

/**
 * Lista todos los trips del usuario (solo con metadata).
 * Esto se usa para la pantalla de “Mis viajes”.
 */
export async function fetchTripsForUser(userId) {
  if (!supabase) {
    const error = new Error("Supabase no está configurado.");
    console.error("[Supabase] fetchTripsForUser:", error);
    return { ok: false, error };
  }

  try {
    const { data, error } = await supabase
      .from("trip_data")
      .select("trip_id, title, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[Supabase] fetchTripsForUser error:", error);
      return { ok: false, error };
    }

    const trips = (data || []).map((row) => ({
      id: row.trip_id,
      title: row.title || "Sin título",
      subtitle: row.updated_at ? new Date(row.updated_at).toLocaleString() : "",
      destination: "Japan",
      coverUrl: null,
    }));

    return { ok: true, trips };
  } catch (err) {
    console.error("[Supabase] fetchTripsForUser exception:", err);
    return { ok: false, error: err };
  }
}
