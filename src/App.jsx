import { useEffect, useMemo, useRef, useState } from "react";
import { SignInButton } from "@clerk/clerk-react";
import PlannerShell from "./components/PlannerShell";
import LandingPage from "./components/LandingPage";
import PublicTripPage from "./components/PublicTripPage";
import { useItineraryStore } from "./hooks/useItineraryStore";
import { supabase } from "./components/lib/supabaseClient";
import {
  loadTripIndexLocal,
  loadTripLocal,
  saveTripLocal,
  upsertTripMetaLocal,
} from "./components/lib/localStorageAdapter";
import {
  fetchPublicTripsOnline,
  fetchTripsOnline,
  saveTripOnline,
  updateTripVisibilityOnline,
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

function loadTripsLocal() {
  return loadTripIndexLocal().map((trip) => ({
    ...trip,
    data: loadTripLocal(trip.id),
  }));
}

export default function App({ auth }) {
  const { isSignedIn, isLoaded, user, hasClerk, supabaseReady = true } = auth;
  const { toast } = useFeedback();

  const theme = useItineraryStore((state) => state.ui.theme);
  const storageMode = useItineraryStore((state) => state.ui.storageMode);
  const autoSaveEnabled = useItineraryStore(
    (state) => state.ui.autoSaveEnabled
  );
  const autoSaveIntervalMin = useItineraryStore(
    (state) => state.ui.autoSaveIntervalMin
  );
  const exportJSON = useItineraryStore((state) => state.exportJSON);
  const importJSON = useItineraryStore((state) => state.importJSON);
  const clearAll = useItineraryStore((state) => state.clearAll);

  const [guest, setGuest] = useState(false);
  const [trips, setTrips] = useState([]);
  const [publicTrips, setPublicTrips] = useState([]);
  const [activeTripId, setActiveTripId] = useState(null);
  const [activePublicTrip, setActivePublicTrip] = useState(null);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [tripsError, setTripsError] = useState(null);
  const [loadingPublicTrips, setLoadingPublicTrips] = useState(false);
  const [publicTripsError, setPublicTripsError] = useState(null);
  const [publicTripsRefreshKey, setPublicTripsRefreshKey] = useState(0);
  const [saveState, setSaveState] = useState("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [duplicatingTripId, setDuplicatingTripId] = useState(null);

  const savingRef = useRef(false);
  const activeTripRef = useRef(null);
  const metaSaveTimeoutRef = useRef(null);
  const previousStorageModeRef = useRef(storageMode);
  const canEnter = isSignedIn || guest;
  const isPublicView =
    typeof window !== "undefined" && window.location.hash.startsWith("#public=");

  const activeTrip = useMemo(
    () => trips.find((trip) => trip.id === activeTripId) || null,
    [trips, activeTripId]
  );

  useEffect(() => {
    activeTripRef.current = activeTrip;
  }, [activeTrip]);

  useEffect(() => {
    return () => {
      if (metaSaveTimeoutRef.current) {
        clearTimeout(metaSaveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("theme-light", theme === "light");
  }, [theme]);

  useEffect(() => {
    const previousStorageMode = previousStorageModeRef.current;
    previousStorageModeRef.current = storageMode;

    if (!activeTrip) return;
    if (storageMode !== "local" || previousStorageMode === "local") return;

    performSave({ silent: true, tripOverride: activeTripRef.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrip, storageMode]);

  useEffect(() => {
    if (!isLoaded || !supabaseReady || storageMode !== "online") return;

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
  }, [isLoaded, isSignedIn, storageMode, supabaseReady, user]);

  useEffect(() => {
    if (!isLoaded || !canEnter || storageMode !== "local" || activeTripId) {
      return;
    }

    setTrips(loadTripsLocal());
    setLoadingTrips(false);
    setTripsError(null);
  }, [activeTripId, canEnter, isLoaded, storageMode]);

  useEffect(() => {
    if (!isLoaded || !supabaseReady || !canEnter) return;

    if (!supabase) {
      setPublicTrips([]);
      setLoadingPublicTrips(false);
      setPublicTripsError("Supabase no configurado.");
      return;
    }

    let cancelled = false;
    setLoadingPublicTrips(true);
    setPublicTripsError(null);

    (async () => {
      const result = await fetchPublicTripsOnline();
      if (cancelled) return;

      if (!result.ok) {
        setPublicTrips([]);
        setPublicTripsError(
          result.error?.message || "Error cargando viajes públicos."
        );
      } else {
        setPublicTrips(result.trips);
      }

      setLoadingPublicTrips(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [canEnter, isLoaded, publicTripsRefreshKey, supabaseReady]);

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
      isPublic: false,
    };

    setTrips((currentTrips) => [newTrip, ...currentTrips]);
    setActivePublicTrip(null);
    setActiveTripId(id);

    if (storageMode === "local") {
      try {
        const dataSnapshot = stripBase64FromExport(JSON.parse(exportJSON()));
        saveTripLocal(id, dataSnapshot);
        upsertTripMetaLocal({ ...newTrip, data: dataSnapshot });
      } catch (error) {
        console.error("Error creando viaje local", error);
      }
    }
  };

  const cloneTripData = (data) => {
    if (!data) return null;
    return JSON.parse(JSON.stringify(data));
  };

  const handleDuplicateTrip = async (trip, { openCopy = false } = {}) => {
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
      ownerUserId: user?.id ?? null,
      sharedWithUserIds: [],
      isPublic: false,
    };

    const openDuplicatedTrip = () => {
      if (data) {
        try {
          importJSON(JSON.stringify(data));
        } catch (error) {
          console.error("Error importando copia", error);
        }
      }
      setActivePublicTrip(null);
      setActiveTripId(id);
    };

    setDuplicatingTripId(trip.id);
    setTrips((currentTrips) => [duplicatedTrip, ...currentTrips]);

    try {
      if (storageMode === "local") {
        if (data) saveTripLocal(id, data);
        upsertTripMetaLocal(duplicatedTrip);
        toast({ title: "Viaje duplicado", tone: "success" });
        if (openCopy) openDuplicatedTrip();
        return;
      }

      if (!isSignedIn || !user?.id) {
        toast({
          title: "Viaje duplicado en esta sesion",
          message: "Inicia sesion o usa modo local para conservarlo.",
          tone: "warning",
        });
        if (openCopy) openDuplicatedTrip();
        return;
      }

      const result = await saveTripOnline({
        tripId: id,
        userId: user.id,
        ownerUserId: user.id,
        sharedWithUserIds: [],
        isPublic: false,
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
      if (openCopy) openDuplicatedTrip();
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
    const currentTrip = activeTripRef.current;
    if (!activeTripId || !currentTrip) return;

    const normalizedPatch = { ...patch };
    if (Object.prototype.hasOwnProperty.call(normalizedPatch, "imageUrl")) {
      normalizedPatch.coverImage = normalizedPatch.imageUrl;
      delete normalizedPatch.imageUrl;
    }
    const updatedAt = new Date().toISOString();
    const updatedTrip = {
      ...currentTrip,
      ...normalizedPatch,
      updatedAt,
    };

    activeTripRef.current = updatedTrip;
    setTrips((currentTrips) =>
      currentTrips.map((trip) =>
        trip.id === activeTripId
          ? { ...trip, ...normalizedPatch, updatedAt }
          : trip
      )
    );

    if (metaSaveTimeoutRef.current) {
      clearTimeout(metaSaveTimeoutRef.current);
      metaSaveTimeoutRef.current = null;
    }

    if (storageMode === "local") {
      upsertTripMetaLocal(updatedTrip);
      return;
    }

    if (storageMode !== "online" || !isSignedIn || !user?.id) return;

    const runMetaSave = async () => {
      const latestTrip = activeTripRef.current;
      const latestMode = useItineraryStore.getState().ui.storageMode;

      if (!latestTrip || latestTrip.id !== updatedTrip.id) return;
      if (latestMode !== "online") return;

      if (savingRef.current) {
        metaSaveTimeoutRef.current = setTimeout(runMetaSave, 1000);
        return;
      }

      await performSave({ silent: true, tripOverride: latestTrip });
    };

    metaSaveTimeoutRef.current = setTimeout(runMetaSave, 900);
  };

  const handleUpdateTripVisibility = async (nextIsPublic) => {
    if (!activeTrip) {
      return { ok: false, error: new Error("No hay viaje activo.") };
    }

    if (storageMode !== "online") {
      return {
        ok: false,
        error: new Error("Los viajes públicos necesitan modo Online."),
      };
    }

    if (!isSignedIn || !user?.id) {
      return {
        ok: false,
        error: new Error("Inicia sesión para publicar un viaje."),
      };
    }

    if (activeTrip.ownerUserId && activeTrip.ownerUserId !== user.id) {
      return {
        ok: false,
        error: new Error("Solo el dueño puede publicar este viaje."),
      };
    }

    if (savingRef.current) {
      return {
        ok: false,
        error: new Error("Espera a que termine el guardado actual."),
      };
    }

    let data;
    try {
      data = stripBase64FromExport(JSON.parse(exportJSON()));
    } catch (error) {
      console.error("Bad exportJSON", error);
      return {
        ok: false,
        error: new Error("No se pudo preparar el viaje para publicarlo."),
      };
    }

    savingRef.current = true;
    setSaveState("saving");
    setSaveMessage("Guardando visibilidad...");

    setTrips((currentTrips) =>
      currentTrips.map((trip) =>
        trip.id === activeTrip.id
          ? {
              ...trip,
              data,
              isPublic: Boolean(nextIsPublic),
              updatedAt: new Date().toISOString(),
            }
          : trip
      )
    );

    try {
      const saveResult = await saveTripOnline({
        tripId: activeTrip.id,
        userId: user.id,
        ownerUserId: activeTrip.ownerUserId || user.id,
        sharedWithUserIds: activeTrip.sharedWithUserIds || [],
        isPublic: Boolean(nextIsPublic),
        data,
        title: activeTrip.title,
        destination: activeTrip.destination,
        imageUrl: activeTrip.coverImage,
      });

      if (!saveResult.ok) {
        setTrips((currentTrips) =>
          currentTrips.map((trip) =>
            trip.id === activeTrip.id
              ? { ...trip, isPublic: Boolean(activeTrip.isPublic) }
              : trip
          )
        );
        setSaveState("error");
        setSaveMessage("Error al guardar");
        return {
          ok: false,
          error: saveResult.error || new Error("No se pudo guardar el viaje."),
        };
      }

      const visibilityResult = await updateTripVisibilityOnline({
        tripId: activeTrip.id,
        userId: user.id,
        isPublic: Boolean(nextIsPublic),
      });

      if (!visibilityResult.ok) {
        setTrips((currentTrips) =>
          currentTrips.map((trip) =>
            trip.id === activeTrip.id
              ? { ...trip, isPublic: Boolean(activeTrip.isPublic) }
              : trip
          )
        );
        setSaveState("error");
        setSaveMessage("Error al publicar");
        return {
          ok: false,
          error:
            visibilityResult.error ||
            new Error("No se pudo actualizar la visibilidad."),
        };
      }

      const updatedTrip = {
        ...visibilityResult.trip,
        data,
        title: activeTrip.title,
        destination: activeTrip.destination,
        coverImage: activeTrip.coverImage,
        sharedWithUserIds: activeTrip.sharedWithUserIds || [],
      };

      activeTripRef.current = updatedTrip;
      setTrips((currentTrips) =>
        currentTrips.map((trip) =>
          trip.id === activeTrip.id ? updatedTrip : trip
        )
      );
      setPublicTripsRefreshKey((key) => key + 1);
      setSaveState("saved");
      setSaveMessage("Guardado");

      return { ok: true };
    } finally {
      savingRef.current = false;
      setTimeout(() => {
        setSaveState("idle");
        setSaveMessage("");
      }, 1800);
    }
  };

  async function performSave({ silent = false, tripOverride = null } = {}) {
    const tripToSave = tripOverride || activeTripRef.current;
    if (!tripToSave || savingRef.current) return false;

    if (metaSaveTimeoutRef.current) {
      clearTimeout(metaSaveTimeoutRef.current);
      metaSaveTimeoutRef.current = null;
    }

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
      return false;
    }

    const updatedAt = new Date().toISOString();
    setTrips((currentTrips) =>
      currentTrips.map((trip) =>
        trip.id === tripToSave.id
          ? {
              ...trip,
              title: tripToSave.title,
              destination: tripToSave.destination,
              coverImage: tripToSave.coverImage,
              sharedWithUserIds: tripToSave.sharedWithUserIds || [],
              isPublic: Boolean(tripToSave.isPublic),
              data,
              updatedAt,
            }
          : trip
      )
    );

    try {
      if (storageMode === "local") {
        saveTripLocal(tripToSave.id, data);
        upsertTripMetaLocal({ ...tripToSave, data, updatedAt });
        setSaveState("saved");
        setSaveMessage("Guardado");
        if (!silent) toast({ title: "Guardado local", tone: "success" });
        return true;
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
        return false;
      }

      const result = await saveTripOnline({
        tripId: tripToSave.id,
        userId: user.id,
        ownerUserId: tripToSave.ownerUserId || user.id,
        sharedWithUserIds: tripToSave.sharedWithUserIds || [],
        isPublic: Boolean(tripToSave.isPublic),
        data,
        title: tripToSave.title,
        destination: tripToSave.destination,
        imageUrl: tripToSave.coverImage,
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
        return false;
      }

      setSaveState("saved");
      setSaveMessage("Guardado");
      return true;
    } finally {
      savingRef.current = false;
      setTimeout(() => {
        setSaveState("idle");
        setSaveMessage("");
      }, 1800);
    }
  }

  useEffect(() => {
    if (!activeTrip) return;
    if (storageMode !== "online") return;
    if (!isSignedIn || !user?.id) return;
    if (autoSaveEnabled === false) return;

    const intervalMs =
      Math.max(1, Number(autoSaveIntervalMin) || 3) * 60 * 1000;

    const interval = setInterval(() => {
      performSave({ silent: true });
    }, intervalMs);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTripId,
    autoSaveEnabled,
    autoSaveIntervalMin,
    storageMode,
    isSignedIn,
    user?.id,
  ]);

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
      ) : activePublicTrip ? (
        <PublicTripPage
          payload={{ trip: activePublicTrip, data: activePublicTrip.data || {} }}
          onBack={() => setActivePublicTrip(null)}
          onCopy={() => handleDuplicateTrip(activePublicTrip, { openCopy: true })}
          copyDisabled={duplicatingTripId === activePublicTrip.id}
        />
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
          onUpdateTripVisibility={handleUpdateTripVisibility}
        />
      ) : (
        <LandingPage
          trips={trips}
          publicTrips={publicTrips}
          loading={loadingTrips}
          loadingPublic={loadingPublicTrips}
          error={tripsError}
          publicError={publicTripsError}
          onEnterTrip={handleEnterTrip}
          onEnterPublicTrip={(trip) => setActivePublicTrip(trip)}
          onAddTrip={handleAddTrip}
          onDuplicateTrip={handleDuplicateTrip}
          duplicatingTripId={duplicatingTripId}
        />
      )}
    </div>
  );
}
