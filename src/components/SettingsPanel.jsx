// src/components/SettingsPanel.jsx
import { useItineraryStore } from "../hooks/useItineraryStore";

/**
 * Panel de configuración del viaje:
 * - Nombre, destino, URL de imagen -> se guardan en el objeto `trip`
 *   llamando a `onUpdateTripMeta`.
 * - Tema claro / oscuro -> viene del store (Zustand).
 * - Modo de guardado (local / online) -> también del store.
 *
 * IMPORTANTE:
 *  - Este componente asume que recibe props:
 *      - trip: { id, title, destination, imageUrl, ... }
 *      - onUpdateTripMeta: (patch) => void
 */
export default function SettingsPanel({ trip, onUpdateTripMeta }) {
  const ui = useItineraryStore((s) => s.ui);
  const setTheme = useItineraryStore((s) => s.setTheme);
  const setStorageMode = useItineraryStore((s) => s.setStorageMode);

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
    // Avisamos hacia arriba para que App actualice el array de trips
    if (typeof onUpdateTripMeta === "function") {
      onUpdateTripMeta({ [field]: value });
    }
  };

  const theme = ui.theme || "light";
  const storageMode = ui.storageMode || "online";

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
