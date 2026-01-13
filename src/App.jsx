// src/App.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useUser, SignInButton } from "@clerk/clerk-react";
import { createClient } from "@supabase/supabase-js";
import PlannerShell from "./components/PlannerShell";
import LandingPage from "./components/LandingPage";
import { useItineraryStore } from "./hooks/useItineraryStore";
import "./styles.css";

/* ========= Supabase client (singleton in-module) ========= */
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
    localStorage.setItem(LS_PREFIX + tripId, JSON.stringify(data));
  } catch (err) {
    console.error("Error guardando viaje en localStorage", err);
  }
}

function loadTripLocal(tripId) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + tripId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error leyendo viaje de localStorage", err);
    return null;
  }
}

/* ========= Supabase helpers ========= */
async function saveTripOnline({
  tripId,
  userId,
  data,
  title,
  destination,
  imageUrl,
}) {
  if (!supabase)
    return { ok: false, error: new Error("Supabase no configurado.") };
  if (!userId) return { ok: false, error: new Error("Missing userId") };

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

    if (error) return { ok: false, error };
    return { ok: true, data: upserted };
  } catch (err) {
    return { ok: false, error: err };
  }
}

// ✅ LISTA: propios + compartidos
async function fetchTripsOnline(userId) {
  if (!supabase || !userId)
    return { ok: false, error: new Error("Missing userId") };

  try {
    const { data, error } = await supabase
      .from("trip_data")
      .select(
        "trip_id, title, destination, image_url, updated_at, data, user_id, shared_with_user_ids"
      )
      .or(`user_id.eq.${userId},shared_with_user_ids.cs.{${userId}}`)
      .order("updated_at", { ascending: false });

    if (error) return { ok: false, error };

    const trips = (data || []).map((row) => ({
      id: row.trip_id,
      title: row.title || "Sin título",
      destination: row.destination || "Japan",
      coverImage: row.image_url || "",
      updatedAt: row.updated_at || null,
      data: row.data || null,
      ownerUserId: row.user_id || null,
      sharedWithUserIds: row.shared_with_user_ids || [],
    }));

    return { ok: true, trips };
  } catch (err) {
    return { ok: false, error: err };
  }
}

/* ========= Entry ========= */
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

export default function App() {
  const { isSignedIn, isLoaded, user } = useUser();

  // ✅ hooks del store SIEMPRE arriba
  const theme = useItineraryStore((s) => s.ui.theme);
  const storageMode = useItineraryStore((s) => s.ui.storageMode);
  const exportJSON = useItineraryStore((s) => s.exportJSON);
  const importJSON = useItineraryStore((s) => s.importJSON);
  const clearAll = useItineraryStore((s) => s.clearAll);

  // Estado app
  const [guest, setGuest] = useState(false);
  const [trips, setTrips] = useState([]);
  const [activeTripId, setActiveTripId] = useState(null);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [tripsError, setTripsError] = useState(null);

  // ✅ Estado guardado (para autosave + UI)
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [saveMessage, setSaveMessage] = useState("");

  // Evitar overlap de guardados
  const savingRef = useRef(false);

  const canEnter = isSignedIn || guest;

  const activeTrip = useMemo(
    () => trips.find((t) => t.id === activeTripId) || null,
    [trips, activeTripId]
  );

  // Tema body
  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    if (theme === "light") body.classList.add("theme-light");
    else body.classList.remove("theme-light");
  }, [theme]);

  // Cargar trips desde Supabase cuando hay sesión
  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user || !supabase) {
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

  const handleAddTrip = (data) => {
    const id = `trip-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

    // limpiar store para empezar viaje "vacío"
    clearAll();

    const newTrip = {
      id,
      title: data.title?.trim() || "Sin título",
      destination: data.destination?.trim() || "Japan",
      coverImage: data.imageUrl?.trim() || "",
      updatedAt: new Date().toISOString(),
      data: null,
      ownerUserId: user?.id ?? null,
      sharedWithUserIds: [],
    };

    setTrips((prev) => [newTrip, ...prev]);
    setActiveTripId(id);
  };

  const handleEnterTrip = (id) => {
    const trip = trips.find((t) => t.id === id) || null;
    setActiveTripId(id);

    // ✅ Online: si ya tenemos data en memoria, la importamos
    if (storageMode === "online" && trip?.data) {
      try {
        importJSON(JSON.stringify(trip.data));
      } catch (e) {
        console.error("Error importando trip.data", e);
      }
      return;
    }

    // ✅ Local: cargar desde localStorage
    if (storageMode === "local") {
      const localData = loadTripLocal(id);
      if (localData) {
        try {
          importJSON(JSON.stringify(localData));
        } catch (e) {
          console.error("Error importando localData", e);
        }
      } else {
        // si no hay, al menos queda store “como está”
        // (si prefieres limpio, descomenta)
        // clearAll();
      }
    }
  };

  const handleBackToTrips = () => {
    setActiveTripId(null);
  };

  // ✅ Guardar (manual o autosave)
  const performSave = async ({ silent = false } = {}) => {
    if (!activeTrip) return;

    if (savingRef.current) return; // evita overlaps
    savingRef.current = true;

    setSaveState("saving");
    setSaveMessage("Guardando…");

    let data;
    try {
      data = JSON.parse(exportJSON());
    } catch (e) {
      console.error("Bad exportJSON", e);
      setSaveState("error");
      setSaveMessage("Error al guardar");
      savingRef.current = false;
      if (!silent) alert("Error preparando datos para guardar.");
      return;
    }

    // ✅ Mantener data en memoria SIEMPRE (para resumen actualizado en Landing)
    setTrips((prev) =>
      prev.map((t) =>
        t.id === activeTrip.id
          ? { ...t, data, updatedAt: new Date().toISOString() }
          : t
      )
    );

    try {
      if (storageMode === "local") {
        saveTripLocal(activeTrip.id, data);
        setSaveState("saved");
        setSaveMessage("Guardado ✓");
        if (!silent) alert("✅ Guardado local.");
      } else {
        // si no hay sesión, no intentamos online
        if (!isSignedIn || !user?.id) {
          setSaveState("error");
          setSaveMessage("Inicia sesión para guardar");
          if (!silent) alert("Inicia sesión para guardar online.");
        } else {
          const result = await saveTripOnline({
            tripId: activeTrip.id,
            userId: user.id,
            data,
            title: activeTrip.title,
            destination: activeTrip.destination,
            imageUrl: activeTrip.coverImage,
          });

          if (!result.ok) {
            setSaveState("error");
            setSaveMessage("Error al guardar");
            if (!silent) {
              alert("❌ Error guardando: " + (result.error?.message || ""));
            } else {
              console.error("[Autosave] Error guardando", result.error);
            }
          } else {
            setSaveState("saved");
            setSaveMessage("Guardado ✓");
          }
        }
      }
    } finally {
      savingRef.current = false;

      // vuelve a normal luego de un ratito
      setTimeout(() => {
        setSaveState("idle");
        setSaveMessage("");
      }, 1800);
    }
  };

  const handleSave = () => performSave({ silent: false });

  // ✅ Autosave cada 30s (solo online + sesión + trip activo)
  useEffect(() => {
    if (!activeTrip) return;
    if (storageMode !== "online") return;
    if (!isSignedIn || !user?.id) return;

    const interval = setInterval(() => {
      performSave({ silent: true });
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTripId, storageMode, isSignedIn, user?.id]);

  return (
    <div className="h-screen w-screen p-3">
      {!isLoaded ? (
        <div className="entry-root">
          <div className="entry-card">
            <div className="font-semibold">Inicializando…</div>
            <div className="text-xs mt-2">Cargando sesión y configuración.</div>
          </div>
        </div>
      ) : !canEnter ? (
        <EntryScreen onGuest={() => setGuest(true)} />
      ) : activeTrip ? (
        <PlannerShell
          trip={activeTrip}
          onBack={handleBackToTrips}
          onSave={handleSave}
          // (si luego separas AppBar, puedes pasar saveState/saveMessage también)
          saveState={saveState}
          saveMessage={saveMessage}
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
