// src/App.jsx
import { useEffect, useState } from "react";
import { useUser, SignInButton, UserButton } from "@clerk/clerk-react";

import MapPanel from "./components/MapPanel";
import Sidebar from "./components/Sidebar";
import LandingPage from "./components/LandingPage";

import { useItineraryStore } from "./hooks/useItineraryStore";
import {
  saveTripOnline,
  loadTripOnline,
  fetchTripsForUser,
} from "./components/lib/onlineStorage";

import "./styles.css";

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

/* ========= Componentes de UI ========= */

function EntryScreen({ onGuest }) {
  return (
    <div className="entry-root">
      <div className="entry-card">
        <h1 className="landing-title mb-2">Planner de viajes</h1>
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
      <header className="card planner-header">
        <div className="flex justify-between items-center">
          <div>
            <button className="btn-outline text-xs mb-1" onClick={onBack}>
              ← Volver a mis viajes
            </button>
            <h2 className="font-semibold">{trip.title}</h2>
            {trip.subtitle && (
              <div className="text-xs text-gray-600">{trip.subtitle}</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {trip.destination && (
              <span className="chip">{trip.destination}</span>
            )}
            <button className="btn-outline text-xs" onClick={onLoad}>
              Cargar
            </button>
            <button className="btn text-xs" onClick={onSave}>
              Guardar
            </button>
            {isSignedIn && (
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: { width: 32, height: 32 },
                  },
                }}
              />
            )}
          </div>
        </div>
      </header>

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

  // Cargar lista de trips desde Supabase cuando hay sesión
  useEffect(() => {
    if (!isSignedIn || !user?.id) return;

    (async () => {
      const res = await fetchTripsForUser(user.id);
      if (res.ok) {
        setTrips(res.trips);
      } else {
        console.error("No se pudieron cargar los viajes:", res.error);
      }
    })();
  }, [isSignedIn, user?.id]);

  const canEnter = isSignedIn || guest;
  const activeTrip = trips.find((t) => t.id === activeTripId) || null;

  const handleAddTrip = (data) => {
    const id = `trip-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    const newTrip = {
      id,
      title: data.title || "New Trip",
      subtitle: data.subtitle || "",
      destination: data.destination || "Japan",
      coverUrl: data.coverUrl || null,
    };
    setTrips((prev) => [newTrip, ...prev]);
    setActiveTripId(id);
  };

  const handleEnterTrip = (id) => {
    setActiveTripId(id);
  };

  const handleBackToTrips = () => {
    setActiveTripId(null);
  };

  // === Guardar según modo (local / online) ===
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

  // === Cargar según modo (local / online) ===
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
