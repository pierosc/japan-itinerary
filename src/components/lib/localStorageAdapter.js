// src/lib/localStorageAdapter.js
const PREFIX = "trip-planner:";
const TRIP_INDEX_KEY = `${PREFIX}trip-index`;

function normalizeTripMeta(trip) {
  return {
    id: trip.id,
    title: trip.title || "Sin titulo",
    destination: trip.destination || "Japan",
    coverImage: trip.coverImage || trip.imageUrl || "",
    updatedAt: trip.updatedAt || new Date().toISOString(),
    ownerUserId: trip.ownerUserId || null,
    sharedWithUserIds: Array.isArray(trip.sharedWithUserIds)
      ? trip.sharedWithUserIds
      : [],
    isPublic: Boolean(trip.isPublic),
  };
}

function sortTripsByUpdatedAt(trips) {
  return [...trips].sort(
    (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
  );
}

/**
 * Guarda un viaje en localStorage bajo la clave trip-planner:<tripId>
 */
export function saveTripLocal(tripId, data) {
  try {
    const key = PREFIX + tripId;
    const json = JSON.stringify(data);
    localStorage.setItem(key, json);
  } catch (err) {
    console.error("Error guardando viaje en localStorage", err);
  }
}

/**
 * Lee un viaje desde localStorage. Devuelve null si no existe o hay error.
 */
export function loadTripLocal(tripId) {
  try {
    const key = PREFIX + tripId;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error leyendo viaje de localStorage", err);
    return null;
  }
}

export function loadTripIndexLocal() {
  try {
    const raw = localStorage.getItem(TRIP_INDEX_KEY);
    if (!raw) return [];
    const trips = JSON.parse(raw);
    if (!Array.isArray(trips)) return [];
    return sortTripsByUpdatedAt(
      trips.filter((trip) => trip?.id).map(normalizeTripMeta)
    );
  } catch (err) {
    console.error("Error leyendo indice de viajes en localStorage", err);
    return [];
  }
}

export function saveTripIndexLocal(trips) {
  try {
    localStorage.setItem(
      TRIP_INDEX_KEY,
      JSON.stringify(sortTripsByUpdatedAt(trips.map(normalizeTripMeta)))
    );
  } catch (err) {
    console.error("Error guardando indice de viajes en localStorage", err);
  }
}

export function upsertTripMetaLocal(trip) {
  if (!trip?.id) return;

  const nextTrip = normalizeTripMeta(trip);
  const trips = loadTripIndexLocal().filter(
    (candidate) => candidate.id !== nextTrip.id
  );

  saveTripIndexLocal([nextTrip, ...trips]);
}
