// src/components/SettingsPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { useItineraryStore } from "../hooks/useItineraryStore";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "./lib/supabaseClient";

/**
 * Panel de configuración del viaje:
 * - Nombre, destino, URL de imagen -> se guardan en el objeto `trip`
 *   llamando a `onUpdateTripMeta`.
 * - Tema claro / oscuro -> viene del store (Zustand).
 * - Modo de guardado (local / online) -> también del store.
 *
 * EXTRA:
 * - Botón "Perfil público" para publicar tu perfil en Supabase (profiles)
 *   y que otros puedan encontrarte en búsquedas.
 */
export default function SettingsPanel({ trip, onUpdateTripMeta }) {
  const ui = useItineraryStore((s) => s.ui);
  const setTheme = useItineraryStore((s) => s.setTheme);
  const setStorageMode = useItineraryStore((s) => s.setStorageMode);

  const { isSignedIn, user } = useUser();

  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState(null);
  const [isPublic, setIsPublic] = useState(false);
  const [publicLoaded, setPublicLoaded] = useState(false);

  const theme = ui.theme || "light";
  const storageMode = ui.storageMode || "online";

  const myProfilePayload = useMemo(() => {
    if (!user) return null;
    const email = user.primaryEmailAddress?.emailAddress || null;
    const fullName =
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      user.username ||
      (email ? email.split("@")[0] : null);

    return {
      user_id: user.id,
      email,
      full_name: fullName,
      avatar_url: user.imageUrl || null,
    };
  }, [user]);

  // Cargar estado actual "is_public" (si existe)
  useEffect(() => {
    if (!supabase) return;
    if (!isSignedIn || !user?.id) return;

    let cancelled = false;
    setPublicError(null);

    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("is_public")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          // si no existe row, asumimos false
          console.warn("[profiles] read is_public error:", error);
          setIsPublic(false);
        } else {
          setIsPublic(Boolean(data?.is_public));
        }
        setPublicLoaded(true);
      } catch (e) {
        if (cancelled) return;
        console.warn("[profiles] read exception:", e);
        setIsPublic(false);
        setPublicLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, user?.id]);

  if (!trip) {
    return (
      <div>
        <h2 className="font-semibold mb-1">Configuración del viaje</h2>
        <p className="text-xs text-gray-600">
          No hay ningún viaje seleccionado. Vuelve a la lista y elige uno.
        </p>
      </div>
    );
  }

  const handleMetaChange = (field) => (e) => {
    const value = e.target.value;
    if (typeof onUpdateTripMeta === "function") {
      onUpdateTripMeta({ [field]: value });
    }
  };

  async function setProfilePublic(next) {
    setPublicError(null);

    if (!supabase) {
      setPublicError("Supabase no está configurado.");
      return;
    }
    if (!isSignedIn || !user?.id || !myProfilePayload) {
      setPublicError("Debes iniciar sesión para publicar tu perfil.");
      return;
    }

    setPublicLoading(true);
    try {
      // upsert tu fila, marcando público/no público
      const { error } = await supabase.from("profiles").upsert(
        {
          ...myProfilePayload,
          is_public: Boolean(next),
        },
        { onConflict: "user_id" }
      );

      if (error) throw error;

      setIsPublic(Boolean(next));
    } catch (e) {
      console.error("[profiles] upsert error:", e);
      setPublicError(e?.message || "Error actualizando tu perfil.");
    } finally {
      setPublicLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="font-semibold mb-1">Configuración del viaje</h2>
        <p className="text-xs text-gray-600">
          Ajusta los datos básicos del viaje, la apariencia y dónde se guarda la
          información.
        </p>
      </div>

      {/* DATOS BÁSICOS */}
      <section className="card" style={{ padding: 12 }}>
        <h3 className="font-semibold text-xs mb-2">Datos básicos</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <label className="text-xs">
            Nombre del viaje
            <input
              className="input mt-1"
              value={trip.title || ""}
              onChange={handleMetaChange("title")}
              placeholder="Ej. Japón 2026 con amigos"
            />
          </label>

          <label className="text-xs">
            Destino / país
            <input
              className="input mt-1"
              value={trip.destination || ""}
              onChange={handleMetaChange("destination")}
              placeholder="Japan"
            />
          </label>
        </div>

        <label className="text-xs">
          URL de imagen (opcional)
          <input
            className="input mt-1"
            value={trip.imageUrl || ""}
            onChange={handleMetaChange("imageUrl")}
            placeholder="https://…"
          />
        </label>

        <p className="text-xs text-gray-600 mt-1">
          Se usa en la tarjeta del viaje y en el app bar. No hace falta guardar
          manualmente: se actualiza al escribir.
        </p>
      </section>

      {/* PERFIL PUBLICO (para búsquedas y compartir) */}
      <section className="card" style={{ padding: 12 }}>
        <h3 className="font-semibold text-xs mb-2">Perfil y búsquedas</h3>
        <p className="text-xs text-gray-600 mb-2">
          Si activas esto, tu usuario aparece en las búsquedas para que otras
          personas te puedan encontrar y compartir viajes contigo.
        </p>

        {!isSignedIn ? (
          <div className="text-xs text-gray-600">
            Inicia sesión para publicar tu perfil.
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div style={{ minWidth: 0 }}>
              <div className="font-medium" style={{ fontSize: 13 }}>
                Perfil público para búsquedas
              </div>
              <div className="text-xs text-gray-600">
                {publicLoaded
                  ? isPublic
                    ? "✅ Visible en búsquedas"
                    : "Oculto en búsquedas"
                  : "Leyendo estado…"}
              </div>
            </div>

            <button
              className={
                "btn-outline text-xs " + (isPublic ? "btn-active" : "")
              }
              disabled={publicLoading || !publicLoaded}
              onClick={() => setProfilePublic(!isPublic)}
              title="Publicar / ocultar perfil"
            >
              {publicLoading
                ? "Guardando…"
                : isPublic
                ? "Desactivar"
                : "Activar"}
            </button>
          </div>
        )}

        {publicError && (
          <div
            className="text-xs"
            style={{ color: "var(--danger)", marginTop: 8 }}
          >
            {publicError}
          </div>
        )}

        {isSignedIn && myProfilePayload && (
          <div className="text-xs text-gray-600 mt-2">
            Publicará: <strong>{myProfilePayload.full_name}</strong>{" "}
            {myProfilePayload.email ? `(${myProfilePayload.email})` : ""}
          </div>
        )}
      </section>

      {/* APARIENCIA */}
      <section className="card" style={{ padding: 12 }}>
        <h3 className="font-semibold text-xs mb-2">Apariencia</h3>
        <div className="flex gap-2">
          <button
            className={
              "btn-outline text-xs " + (theme === "light" ? "btn-active" : "")
            }
            onClick={() => setTheme("light")}
          >
            Tema claro
          </button>
          <button
            className={
              "btn-outline text-xs " + (theme === "dark" ? "btn-active" : "")
            }
            onClick={() => setTheme("dark")}
          >
            Tema oscuro
          </button>
        </div>
      </section>

      {/* MODO DE GUARDADO */}
      <section className="card" style={{ padding: 12 }}>
        <h3 className="font-semibold text-xs mb-2">Modo de guardado</h3>
        <p className="text-xs text-gray-600 mb-2">
          Elige dónde se guarda el contenido del viaje (lugares, rutas, días,
          etc.).
        </p>
        <div className="flex gap-2">
          <button
            className={
              "btn-outline text-xs " +
              (storageMode === "local" ? "btn-active" : "")
            }
            onClick={() => setStorageMode("local")}
          >
            Solo en este navegador
          </button>
          <button
            className={
              "btn-outline text-xs " +
              (storageMode === "online" ? "btn-active" : "")
            }
            onClick={() => setStorageMode("online")}
          >
            Online (Supabase)
          </button>
        </div>

        <p className="text-xs text-gray-600 mt-2">
          Si el auto-guardado está activo, los cambios se envían automáticamente
          cada cierto tiempo. El botón “Guardar” solo aparece cuando el modo es
          manual.
        </p>
      </section>
    </div>
  );
}
