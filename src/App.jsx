// src/App.jsx
import { useEffect, useState } from "react";
import { useUser, SignInButton } from "@clerk/clerk-react";
import { createClient } from "@supabase/supabase-js";

import PlannerShell from "./components/PlannerShell";
import LandingPage from "./components/LandingPage";
import { useItineraryStore } from "./hooks/useItineraryStore";

import "./styles.css";

/* ========= Supabase client ========= */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "[Supabase] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env"
  );
}

const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/* ========= Helpers LOCAL (localStorage) ========= */

const LS_PREFIX = "trip-planner:";

function saveTripLocal(tripId, data) {
  try {
    const key = LS_PREFIX + tripId;
    const json = JSON.stringify(data);
    localStorage.setItem(key, json);
  } catch (err) {
    console.error("Error guardando viaje en localStorage", err);
  }
}

function loadTripLocal(tripId) {
  try {
    const key = LS_PREFIX + tripId;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error leyendo viaje de localStorage", err);
    return null;
  }
}

/* ========= Helpers ONLINE (Supabase) ========= */

// Guarda snapshot completo del viaje (data) + metadatos (title, destination, image_url)
async function saveTripOnline({
  tripId,
  userId,
  data,
  title,
  destination,
  imageUrl,
}) {
  if (!supabase) {
    const error = new Error(
      "Supabase no está configurado. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY."
    );
    console.error("[Supabase] saveTripOnline:", error);
    return { ok: false, error };
  }
  if (!userId) {
    const error = new Error(
      "No hay usuario logueado para guardar en Supabase."
    );
    console.error("[Supabase] saveTripOnline:", error);
    return { ok: false, error };
  }

  try {
    const payload = {
      trip_id: tripId,
      user_id: userId,
      data,
      title: title || "Sin título",
      destination: destination || "Japan",
      image_url: imageUrl || null,
    };

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

async function loadTripOnline({ tripId, userId }) {
  if (!supabase) {
    const error = new Error(
      "Supabase no está configurado. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY."
    );
    console.error("[Supabase] loadTripOnline:", error);
    return { ok: false, error };
  }
  if (!userId) {
    const error = new Error(
      "No hay usuario logueado para cargar desde Supabase."
    );
    console.error("[Supabase] loadTripOnline:", error);
    return { ok: false, error };
  }

  try {
    const { data, error } = await supabase
      .from("trip_data")
      .select("data, updated_at")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .maybeSingle();

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

// Lista los viajes del usuario (metadatos)
async function fetchTripsOnline(userId) {
  if (!supabase || !userId)
    return { ok: false, error: new Error("Missing userId") };

  try {
    const { data, error } = await supabase
      .from("trip_data")
      .select("trip_id, title, destination, image_url, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[Supabase] fetchTripsOnline error:", error);
      return { ok: false, error };
    }

    const trips = (data || []).map((row) => ({
      id: row.trip_id,
      title: row.title || "Sin título",
      destination: row.destination || "Japan",
      imageUrl: row.image_url || "",
      updatedAt: row.updated_at || null,
    }));

    return { ok: true, trips };
  } catch (err) {
    console.error("[Supabase] fetchTripsOnline exception:", err);
    return { ok: false, error: err };
  }
}

/* ========= Pantalla de entrada ========= */

function EntryScreen({ onGuest }) {
  return (
    <div className="entry-root">
      <div className="entry-card">
        <h1 className="landing-title mb-2">dibu trip planner</h1>
        <p className="landing-subtitle mb-3">
          Organiza tus viajes con días, lugares, gastos y packing list.
        </p>

        <div className="entry-actions">
          <SignInButton mode="modal">
            <button className="btn w-full">Entrar con mi cuenta</button>
          </SignInButton>
          <button className="btn-outline w-full" onClick={onGuest}>
            Continuar como invitado
          </button>
        </div>

        <p className="text-xs mt-2">
          Puedes usar la app sin registrarte. Si inicias sesión con Clerk luego
          podrás sincronizar tus viajes entre dispositivos.
        </p>
      </div>
    </div>
  );
}

/* ========= App principal ========= */

export default function App() {
  const { isSignedIn, isLoaded, user } = useUser();

  const theme = useItineraryStore((s) => s.ui.theme);
  const storageMode = useItineraryStore((s) => s.ui.storageMode);
  const autoSaveEnabled = useItineraryStore(
    (s) => s.ui.autoSaveEnabled ?? true
  );
  const autoSaveIntervalSec = useItineraryStore(
    (s) => s.ui.autoSaveIntervalSec ?? 60
  );
  const exportJSON = useItineraryStore((s) => s.exportJSON);
  const importJSON = useItineraryStore((s) => s.importJSON);

  const [guest, setGuest] = useState(false);
  const [trips, setTrips] = useState([]);
  const [activeTripId, setActiveTripId] = useState(null);

  const [loadingTrips, setLoadingTrips] = useState(false);
  const [tripsError, setTripsError] = useState(null);
  const [lastAutoSaveAt, setLastAutoSaveAt] = useState(null);

  const canEnter = isSignedIn || guest;
  const activeTrip = trips.find((t) => t.id === activeTripId) || null;

  /* ---- Tema claro/oscuro en <body> ---- */
  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    if (theme === "light") {
      body.classList.add("theme-light");
    } else {
      body.classList.remove("theme-light");
    }
  }, [theme]);

  /* ---- Carga de trips desde Supabase cuando hay sesión ---- */
  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user || !supabase) {
      // invitado o sin supabase: la lista vive solo en memoria
      setTrips([]);
      setLoadingTrips(false);
      setTripsError(null);
      return;
    }

    let cancelled = false;
    setLoadingTrips(true);
    setTripsError(null);

    (async () => {
      const res = await fetchTripsOnline(user.id);
      if (cancelled) return;
      if (!res.ok) {
        setTripsError(res.error?.message || "Error cargando viajes.");
        setTrips([]);
      } else {
        setTrips(res.trips);
      }
      setLoadingTrips(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user?.id]);

  /* ---- Crear viaje desde landing ---- */
  const handleAddTrip = (data) => {
    const id = `trip-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    const newTrip = {
      id,
      title: data.title?.trim() || "Sin título",
      destination: data.destination?.trim() || "Japan",
      imageUrl: data.imageUrl?.trim() || "",
    };
    setTrips((prev) => [newTrip, ...prev]);
    setActiveTripId(id);
  };

  /* ---- Abrir/Cerrar viaje ---- */
  const handleEnterTrip = (id) => {
    setActiveTripId(id);
  };

  const handleBackToTrips = () => {
    setActiveTripId(null);
  };

  /* ---- Actualizar metadatos del viaje (desde Settings) ---- */
  const handleUpdateTripMeta = async (patch) => {
    if (!activeTrip) return;

    // 1) actualiza estado local
    setTrips((prev) =>
      prev.map((t) => (t.id === activeTripId ? { ...t, ...patch } : t))
    );

    // 2) si estás online+logueado, manda los cambios a Supabase
    if (!supabase || storageMode !== "online" || !user) return;

    const supaPatch = {};
    if (patch.title !== undefined) supaPatch.title = patch.title;
    if (patch.destination !== undefined)
      supaPatch.destination = patch.destination;
    if (patch.imageUrl !== undefined) supaPatch.image_url = patch.imageUrl;

    if (Object.keys(supaPatch).length === 0) return;

    try {
      const { error } = await supabase
        .from("trip_data")
        .update(supaPatch)
        .eq("trip_id", activeTrip.id)
        .eq("user_id", user.id);

      if (error) console.error("[Supabase] update trip meta:", error);
    } catch (err) {
      console.error("[Supabase] update trip meta (exception):", err);
    }
  };

  /* ---- Guardar (manual o auto) ---- */
  const performSave = async ({ silent = false } = {}) => {
    if (!activeTrip) {
      if (!silent) alert("No hay viaje activo para guardar.");
      return;
    }

    const rawJson = exportJSON();
    let data;
    try {
      data = JSON.parse(rawJson);
    } catch (err) {
      console.error("Error parseando JSON para guardar", err);
      if (!silent) alert("Error preparando los datos para guardar.");
      return;
    }

    if (storageMode === "local") {
      saveTripLocal(activeTrip.id, data);
      if (!silent) {
        alert("✅ Viaje guardado localmente en este navegador.");
      }
      setLastAutoSaveAt(new Date());
    } else {
      const result = await saveTripOnline({
        tripId: activeTrip.id,
        userId: user?.id ?? null,
        data,
        title: activeTrip.title,
        destination: activeTrip.destination,
        imageUrl: activeTrip.imageUrl,
      });

      if (!result.ok) {
        if (!silent) {
          alert(
            "❌ No se pudo guardar en Supabase:\n" +
              (result.error?.message || "Error desconocido. Mira la consola.")
          );
        } else {
          console.error("[Autosave] Error guardando en Supabase", result.error);
        }
      } else {
        setLastAutoSaveAt(new Date(result.data?.updated_at || Date.now()));
        if (!silent) {
          alert(
            "✅ Viaje guardado en Supabase.\nÚltima actualización: " +
              (result.data?.updated_at || "")
          );
        }
      }
    }
  };

  const handleSave = () => performSave({ silent: false });

  /* ---- Cargar (local / online) ---- */
  const handleLoad = async () => {
    if (!activeTrip) {
      alert("No hay viaje activo para cargar.");
      return;
    }

    if (storageMode === "local") {
      const payload = loadTripLocal(activeTrip.id);
      if (!payload) {
        alert("No se encontró ningún guardado local para este viaje.");
        return;
      }
      importJSON(JSON.stringify(payload));
      alert("✅ Viaje cargado desde este navegador.");
    } else {
      const result = await loadTripOnline({
        tripId: activeTrip.id,
        userId: user?.id ?? null,
      });

      if (!result.ok) {
        alert(
          "❌ No se pudo cargar desde Supabase:\n" +
            (result.error?.message || "Error desconocido. Mira la consola.")
        );
        return;
      }

      importJSON(JSON.stringify(result.data));
      alert(
        "✅ Viaje cargado desde Supabase.\nÚltima actualización: " +
          (result.meta?.updated_at || "")
      );
    }
  };

  /* ---- Autosave periódicamente ---- */
  useEffect(() => {
    if (!activeTrip) return;
    if (!autoSaveEnabled) return;

    const intervalMs = (autoSaveIntervalSec || 60) * 1000;
    if (intervalMs < 10_000) return; // mínimo 10s para no freír nada

    const id = setInterval(() => {
      performSave({ silent: true });
    }, intervalMs);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTripId,
    autoSaveEnabled,
    autoSaveIntervalSec,
    storageMode,
    user?.id,
  ]);

  /* ---- Mientras Clerk resuelve sesión ---- */
  if (!isLoaded) {
    return (
      <div className="entry-root">
        <div className="entry-card">
          <h2 className="landing-title mb-2">dibu trip planner</h2>
          <p className="landing-subtitle mb-3">Comprobando tu sesión…</p>
        </div>
      </div>
    );
  }

  const autoSaveLabel = autoSaveEnabled
    ? "Auto-guardado activo"
    : "Guardado manual";

  const manualSaveVisible = !autoSaveEnabled; // solo botón cuando es manual

  return (
    <div className="h-screen w-screen p-3">
      {!canEnter ? (
        <EntryScreen onGuest={() => setGuest(true)} />
      ) : activeTrip ? (
        <PlannerShell
          trip={activeTrip}
          onBack={handleBackToTrips}
          onSave={manualSaveVisible ? handleSave : undefined}
          onLoad={handleLoad}
          onUpdateTripMeta={handleUpdateTripMeta}
          autoSaveLabel={autoSaveLabel}
        />
      ) : (
        <LandingPage
          trips={trips}
          loading={loadingTrips}
          error={tripsError}
          onEnterTrip={handleEnterTrip}
          onAddTrip={handleAddTrip}
        />
      )}
    </div>
  );
}
