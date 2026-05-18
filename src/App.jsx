import { useEffect, useMemo, useRef, useState } from "react";
import { SignInButton } from "@clerk/clerk-react";
import PlannerShell from "./components/PlannerShell";
import LandingPage from "./components/LandingPage";
import PublicTripPage from "./components/PublicTripPage";
import { useItineraryStore } from "./hooks/useItineraryStore";
import { supabase } from "./components/lib/supabaseClient";
import {
  loadTripLocal,
  saveTripLocal,
} from "./components/lib/localStorageAdapter";
import {
  fetchTripsOnline,
  saveTripOnline,
} from "./components/services/tripService";
import { syncCurrentUserProfile } from "./components/services/userService";
import { useFeedback } from "./components/ui/FeedbackProvider";
import "./styles.css";

function EntryScreen({ onGuest, hasClerk }) {
  return (
    <div className="entry-root">
      <div className="entry-card">
        <h1 className="landing-title mb-2">dibu trip planner</h1>
        <p className="landing-subtitle mb-3">
          Organiza tus viajes con días, lugares, gastos y packing list.
        </p>

        <div className="entry-actions">
          {hasClerk ? (
            <SignInButton mode="modal">
              <button className="btn w-full">Entrar con mi cuenta</button>
            </SignInButton>
          ) : (
            <button className="btn w-full" type="button" disabled>
              Login no configurado
            </button>
          )}
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

function stripBase64FromExport(data) {
  if (!data) return data;

  return {
    ...data,
    places: (data.places || []).map((place) => ({
      ...place,
      images: (place.images || [])
        .map((image) => ({
          name: image.name,
          url: image.url || null,
        }))
        .filter((image) => image.url),
      items: (place.items || []).map((item) => {
        const clean = { ...item };
        delete clean.imageDataUrl;
        return clean;
      }),
    })),
    dayMaps: Object.fromEntries(
      Object.entries(data.dayMaps || {}).filter(([, map]) =>
        /^https?:\/\//i.test(map?.imageUrl || "")
      )
    ),
  };
}

export default function App({ auth }) {
  const { isSignedIn, isLoaded, user, hasClerk, supabaseReady = true } = auth;
  const { toast } = useFeedback();

  const theme = useItineraryStore((state) => state.ui.theme);
  const storageMode = useItineraryStore((state) => state.ui.storageMode);
  const exportJSON = useItineraryStore((state) => state.exportJSON);
  const importJSON = useItineraryStore((state) => state.importJSON);
  const clearAll = useItineraryStore((state) => state.clearAll);

  const [guest, setGuest] = useState(false);
  const [trips, setTrips] = useState([]);
  const [activeTripId, setActiveTripId] = useState(null);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [tripsError, setTripsError] = useState(null);
  const [saveState, setSaveState] = useState("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [duplicatingTripId, setDuplicatingTripId] = useState(null);

  const savingRef = useRef(false);
  const canEnter = isSignedIn || guest;
  const isPublicView =
    typeof window !== "undefined" && window.location.hash.startsWith("#public=");

  const activeTrip = useMemo(
    () => trips.find((trip) => trip.id === activeTripId) || null,
    [trips, activeTripId]
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("theme-light", theme === "light");
  }, [theme]);

  useEffect(() => {
    if (!isLoaded || !supabaseReady) return;

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
      const result = await fetchTripsOnline(user.id);
      if (cancelled) return;

      if (!result.ok) {
        setTripsError(result.error?.message || "Error cargando viajes.");
        setTrips([]);
      } else {
        setTrips(result.trips);
      }

      setLoadingTrips(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, supabaseReady, user]);

  useEffect(() => {
    if (!isLoaded || !supabaseReady || !isSignedIn || !user?.id || !supabase) {
      return;
    }

    syncCurrentUserProfile(user).then((result) => {
      if (!result.ok) {
        console.warn("[profiles] No se pudo sincronizar el perfil", result.error);
      }
    });
  }, [isLoaded, isSignedIn, supabaseReady, user]);

  const handleAddTrip = (data) => {
    const id = `trip-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

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

    setTrips((currentTrips) => [newTrip, ...currentTrips]);
    setActiveTripId(id);
  };

  const cloneTripData = (data) => {
    if (!data) return null;
    return JSON.parse(JSON.stringify(data));
  };

  const handleDuplicateTrip = async (trip) => {
    if (!trip || duplicatingTripId) return;

    const id = `trip-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    const now = new Date().toISOString();
    let data = cloneTripData(trip.data);

    if (!data && storageMode === "local") {
      data = cloneTripData(loadTripLocal(trip.id));
    }

    const duplicatedTrip = {
      ...trip,
      id,
      title: `${trip.title || "Sin titulo"} (copia)`,
      updatedAt: now,
      data,
      ownerUserId: user?.id ?? trip.ownerUserId ?? null,
      sharedWithUserIds: [],
    };

    setDuplicatingTripId(trip.id);
    setTrips((currentTrips) => [duplicatedTrip, ...currentTrips]);

    try {
      if (storageMode === "local") {
        if (data) saveTripLocal(id, data);
        toast({ title: "Viaje duplicado", tone: "success" });
        return;
      }

      if (!isSignedIn || !user?.id) {
        toast({
          title: "Viaje duplicado en esta sesion",
          message: "Inicia sesion o usa modo local para conservarlo.",
          tone: "warning",
        });
        return;
      }

      const result = await saveTripOnline({
        tripId: id,
        userId: user.id,
        ownerUserId: user.id,
        sharedWithUserIds: [],
        data: data || {},
        title: duplicatedTrip.title,
        destination: duplicatedTrip.destination,
        imageUrl: duplicatedTrip.coverImage,
      });

      if (!result.ok) {
        setTrips((currentTrips) =>
          currentTrips.filter((candidate) => candidate.id !== id)
        );
        toast({
          title: "No se pudo duplicar",
          message: result.error?.message || "El guardado online fallo.",
          tone: "danger",
        });
        return;
      }

      toast({ title: "Viaje duplicado", tone: "success" });
    } finally {
      setDuplicatingTripId(null);
    }
  };

  const handleEnterTrip = (id) => {
    const trip = trips.find((candidate) => candidate.id === id) || null;
    setActiveTripId(id);

    if (storageMode === "online" && trip?.data) {
      try {
        importJSON(JSON.stringify(trip.data));
      } catch (error) {
        console.error("Error importando trip.data", error);
      }
      return;
    }

    if (storageMode === "local") {
      const localData = loadTripLocal(id);
      if (!localData) return;

      try {
        importJSON(JSON.stringify(localData));
      } catch (error) {
        console.error("Error importando localData", error);
      }
    }
  };

  const handleUpdateTripMeta = (patch) => {
    if (!activeTripId) return;
    setTrips((currentTrips) =>
      currentTrips.map((trip) =>
        trip.id === activeTripId
          ? { ...trip, ...patch, updatedAt: new Date().toISOString() }
          : trip
      )
    );
  };

  const performSave = async ({ silent = false } = {}) => {
    if (!activeTrip || savingRef.current) return;

    savingRef.current = true;
    setSaveState("saving");
    setSaveMessage("Guardando...");

    let data;
    try {
      data = stripBase64FromExport(JSON.parse(exportJSON()));
    } catch (error) {
      console.error("Bad exportJSON", error);
      setSaveState("error");
      setSaveMessage("Error al guardar");
      savingRef.current = false;
      if (!silent) {
        toast({
          title: "No se pudo preparar el guardado",
          message: "Revisa el contenido del viaje e intenta de nuevo.",
          tone: "danger",
        });
      }
      return;
    }

    setTrips((currentTrips) =>
      currentTrips.map((trip) =>
        trip.id === activeTrip.id
          ? { ...trip, data, updatedAt: new Date().toISOString() }
          : trip
      )
    );

    try {
      if (storageMode === "local") {
        saveTripLocal(activeTrip.id, data);
        setSaveState("saved");
        setSaveMessage("Guardado");
        if (!silent) toast({ title: "Guardado local", tone: "success" });
        return;
      }

      if (!isSignedIn || !user?.id) {
        setSaveState("error");
        setSaveMessage("Inicia sesión para guardar");
        if (!silent) {
          toast({
            title: "Inicia sesión para guardar online",
            message: "También puedes cambiar a modo local desde Configuración.",
            tone: "warning",
          });
        }
        return;
      }

      const result = await saveTripOnline({
        tripId: activeTrip.id,
        userId: user.id,
        ownerUserId: activeTrip.ownerUserId || user.id,
        sharedWithUserIds: activeTrip.sharedWithUserIds || [],
        data,
        title: activeTrip.title,
        destination: activeTrip.destination,
        imageUrl: activeTrip.coverImage,
      });

      if (!result.ok) {
        setSaveState("error");
        setSaveMessage("Error al guardar");
        if (!silent) {
          toast({
            title: "Error guardando",
            message: result.error?.message || "Supabase rechazó el guardado.",
            tone: "danger",
          });
        } else {
          console.error("[Autosave] Error guardando", result.error);
        }
        return;
      }

      setSaveState("saved");
      setSaveMessage("Guardado");
    } finally {
      savingRef.current = false;
      setTimeout(() => {
        setSaveState("idle");
        setSaveMessage("");
      }, 1800);
    }
  };

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
      {isPublicView ? (
        <PublicTripPage />
      ) : !isLoaded ? (
        <div className="entry-root">
          <div className="entry-card">
            <div className="font-semibold">Inicializando...</div>
            <div className="text-xs mt-2">Cargando sesión y configuración.</div>
          </div>
        </div>
      ) : !canEnter ? (
        <EntryScreen onGuest={() => setGuest(true)} hasClerk={hasClerk} />
      ) : activeTrip ? (
        <PlannerShell
          trip={activeTrip}
          currentUser={user}
          hasClerk={hasClerk}
          onBack={() => setActiveTripId(null)}
          onSave={() => performSave({ silent: false })}
          saveState={saveState}
          saveMessage={saveMessage}
          onUpdateTripMeta={handleUpdateTripMeta}
        />
      ) : (
        <LandingPage
          trips={trips}
          loading={loadingTrips}
          error={tripsError}
          onEnterTrip={handleEnterTrip}
          onAddTrip={handleAddTrip}
          onDuplicateTrip={handleDuplicateTrip}
          duplicatingTripId={duplicatingTripId}
        />
      )}
    </div>
  );
}
