// src/App.jsx
import { useEffect, useState } from "react";
import { useUser, SignInButton, UserButton } from "@clerk/clerk-react";
import { createClient } from "@supabase/supabase-js";

import MapPanel from "./components/MapPanel";
import Sidebar from "./components/Sidebar";
import LandingPage from "./components/LandingPage";
import ImportExport from "./components/ImportExport";
import { useItineraryStore } from "./hooks/useItineraryStore";

import "./styles.css";

/* ========= Cliente Supabase ========= */

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

async function saveTripOnline({ tripId, title, userId, data }) {
  if (!supabase) {
    const error = new Error(
      "Supabase no está configurado. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY."
    );
    console.error("[Supabase] saveTripOnline:", error);
    return { ok: false, error };
  }

  try {
    const payload = {
      trip_id: tripId,
      user_id: userId ?? null,
      title: title ?? null,
      data,
    };

    const { data: upserted, error } = await supabase
      .from("trip_data")
      .upsert(payload, { onConflict: "trip_id" })
      .select("trip_id, title, updated_at")
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

/** Lista todos los viajes de un usuario (solo metadatos) */
async function listTripsOnline(userId) {
  if (!supabase || !userId) return { ok: false, data: [], error: null };

  const { data, error } = await supabase
    .from("trip_data")
    .select("trip_id, title, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[Supabase] listTripsOnline error:", error);
    return { ok: false, data: [], error };
  }

  return { ok: true, data, error: null };
}

/* ========= Componentes de UI ========= */

function EntryScreen({ onGuest }) {
  return (
    <div className="entry-root">
      <div className="entry-card">
        <h1 className="landing-title mb-2">Dibu Trip Planner</h1>
        <p className="landing-subtitle mb-3">
          Organiza tus días, lugares y gastos en un solo lugar.
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
          Puedes usar la app sin registrarte. Si inicias sesión con Clerk, luego
          podrás sincronizar tus viajes entre dispositivos.
        </p>
      </div>
    </div>
  );
}

function PlannerShell({ trip, onBack, onSave, onLoad }) {
  const { isSignedIn } = useUser();

  return (
    <div className="h-full flex flex-col gap-3">
      {/* APP BAR */}
      <header className="card planner-header">
        <div className="flex justify-between items-center gap-3">
          <div className="flex flex-col gap-1">
            <button className="btn-outline text-xs" onClick={onBack}>
              ← Volver a mis viajes
            </button>
            <div>
              <h2 className="font-semibold">{trip.title}</h2>
              {trip.subtitle && (
                <div className="text-xs text-gray-600">{trip.subtitle}</div>
              )}
              {trip.destination && (
                <div className="mt-1">
                  <span className="chip">{trip.destination}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Import/Export JSON subido al AppBar */}
            <div className="toolbar">
              <ImportExport />
            </div>

            {/* Separador visual */}
            <div className="flex items-center gap-2">
              <button className="btn-outline text-xs" onClick={onLoad}>
                Cargar
              </button>
              <button className="btn text-xs" onClick={onSave}>
                Guardar
              </button>
            </div>

            {isSignedIn && (
              <UserButton
                appearance={{
                  elements: { avatarBox: { width: 32, height: 32 } },
                }}
              />
            )}
          </div>
        </div>
      </header>

      {/* Layout principal: mapa + sidebar */}
      <div className="h-full grid grid-cols-2 gap-3">
        <div className="panel">
          <div className="h-full">
            <MapPanel />
          </div>
        </div>
        <div className="panel overflow-auto">
          <div className="h-full flex flex-col gap-3 p-3">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========= App principal ========= */

export default function App() {
  const { isSignedIn, user } = useUser();
  const theme = useItineraryStore((s) => s.ui.theme);
  const storageMode = useItineraryStore((s) => s.ui.storageMode);
  const exportJSON = useItineraryStore((s) => s.exportJSON);
  const importJSON = useItineraryStore((s) => s.importJSON);

  const [guest, setGuest] = useState(false);
  const [trips, setTrips] = useState([]); // sin ejemplos
  const [activeTripId, setActiveTripId] = useState(null);

  // Tema claro/oscuro
  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    if (theme === "light") {
      body.classList.add("theme-light");
    } else {
      body.classList.remove("theme-light");
    }
  }, [theme]);

  // Cargar lista de viajes ONLINE cuando el usuario está logueado
  useEffect(() => {
    const fetchTrips = async () => {
      if (!isSignedIn || !user?.id) return;
      if (storageMode !== "online") return;

      const result = await listTripsOnline(user.id);
      if (!result.ok) {
        console.warn("[App] No se pudo cargar lista de viajes:", result.error);
        return;
      }

      const mapped = result.data.map((row) => ({
        id: row.trip_id,
        title: row.title || "Viaje sin título",
        subtitle: "",
        destination: "",
      }));

      setTrips(mapped);
    };

    fetchTrips();
  }, [isSignedIn, user?.id, storageMode]);

  const canEnter = isSignedIn || guest;
  const activeTrip = trips.find((t) => t.id === activeTripId) || null;

  const handleAddTrip = (data) => {
    const id = `trip-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    const newTrip = { id, ...data };

    setTrips((prev) => [...prev, newTrip]);

    // Nuevo viaje => planner vacío
    useItineraryStore.getState().clearAll();

    setActiveTripId(id);
  };

  const handleEnterTrip = (id) => {
    setActiveTripId(id);
  };

  const handleBackToTrips = () => {
    setActiveTripId(null);
  };

  // Guardar según modo (local / online)
  const handleSave = async () => {
    if (!activeTrip) {
      alert("No hay viaje activo para guardar.");
      return;
    }

    const rawJson = exportJSON();
    const data = JSON.parse(rawJson);

    if (storageMode === "local") {
      saveTripLocal(activeTrip.id, data);
      alert("✅ Viaje guardado localmente en este navegador.");
    } else {
      const result = await saveTripOnline({
        tripId: activeTrip.id,
        title: activeTrip.title,
        userId: user?.id ?? null,
        data,
      });

      if (result.ok) {
        alert(
          "✅ Viaje guardado en Supabase.\nÚltima actualización: " +
            (result.data?.updated_at || "")
        );
      } else {
        alert(
          "❌ No se pudo guardar en Supabase:\n" +
            (result.error?.message || "Error desconocido. Mira la consola.")
        );
      }
    }
  };

  // Cargar según modo (local / online)
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

  return (
    <div className="h-screen w-screen p-3">
      {!canEnter ? (
        <EntryScreen onGuest={() => setGuest(true)} />
      ) : activeTrip ? (
        <PlannerShell
          trip={activeTrip}
          onBack={handleBackToTrips}
          onSave={handleSave}
          onLoad={handleLoad}
        />
      ) : (
        <LandingPage
          trips={trips}
          onEnterTrip={handleEnterTrip}
          onAddTrip={handleAddTrip}
        />
      )}
    </div>
  );
}
