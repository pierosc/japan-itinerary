// src/lib/localStorageAdapter.js
const PREFIX = "trip-planner:";

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
