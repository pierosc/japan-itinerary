// src/components/SettingsPanel.jsx
import { useItineraryStore } from "../hooks/useItineraryStore";

export default function SettingsPanel({ trip, onUpdateTripMeta }) {
  const ui = useItineraryStore((s) => s.ui);
  const setTheme = useItineraryStore((s) => s.setTheme);
  const setStorageMode = useItineraryStore((s) => s.setStorageMode);
  const setBasemap = useItineraryStore((s) => s.setBasemap);

  const storageMode = ui.storageMode;

  const handleTripChange = (field, value) => {
    if (!onUpdateTripMeta || !trip) return;
    onUpdateTripMeta({ [field]: value });
  };

  return (
    <div className="card">
      <h2>Configuración</h2>

      {/* === Configuración del viaje actual === */}
      <div className="mt-2">
        <h3 className="mb-2">Viaje actual</h3>
        {!trip && (
          <p className="text-xs text-gray-600">
            Aún no has seleccionado un viaje.
          </p>
        )}
        {trip && (
          <div className="flex flex-col gap-2">
            <label className="text-xs">
              Nombre del viaje
              <input
                className="input mt-1"
                value={trip.title || ""}
                onChange={(e) => handleTripChange("title", e.target.value)}
                placeholder="Ej. Japón 2026 con amigos"
              />
            </label>

            <label className="text-xs">
              Destino / país
              <input
                className="input mt-1"
                value={trip.destination || ""}
                onChange={(e) =>
                  handleTripChange("destination", e.target.value)
                }
                placeholder="Ej. Japan"
              />
            </label>

            <label className="text-xs">
              URL de imagen de portada
              <input
                className="input mt-1"
                value={trip.coverUrl || ""}
                onChange={(e) => handleTripChange("coverUrl", e.target.value)}
                placeholder="https://..."
              />
            </label>

            {trip.coverUrl && (
              <div className="mt-1">
                <div className="text-xs mb-1">Vista previa:</div>
                <img
                  src={trip.coverUrl}
                  alt="Portada del viaje"
                  style={{
                    maxWidth: "100%",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* === Modo de guardado === */}
      <div className="mt-2">
        <h3 className="mb-1">Modo de guardado</h3>
        <p className="text-xs text-gray-600 mb-1">
          Elige si deseas guardar el itinerario localmente o en la nube.
        </p>
        <div className="flex gap-2">
          <button
            className={
              "btn-outline text-xs " +
              (storageMode === "local" ? "btn-active" : "")
            }
            onClick={() => setStorageMode("local")}
          >
            Local
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
      </div>

      {/* === Tema === */}
      <div className="mt-2">
        <h3 className="mb-1">Tema</h3>
        <div className="flex gap-2">
          <button
            className={
              "btn-outline text-xs " +
              (ui.theme === "light" ? "btn-active" : "")
            }
            onClick={() => setTheme("light")}
          >
            Claro
          </button>
          <button
            className={
              "btn-outline text-xs " + (ui.theme === "dark" ? "btn-active" : "")
            }
            onClick={() => setTheme("dark")}
          >
            Oscuro
          </button>
        </div>
      </div>

      {/* === Mapa base === */}
      <div className="mt-2">
        <h3 className="mb-1">Mapa base</h3>
        <select
          className="input"
          value={ui.basemap}
          onChange={(e) => setBasemap(e.target.value)}
        >
          <option value="esri-worldgray">Esri World Gray</option>
          <option value="esri-worldstreet">Esri World Street</option>
          <option value="carto-en">Carto Positron</option>
          <option value="carto-dark-en">Carto Dark</option>
          <option value="osm">OSM estándar</option>
          <option value="osmjp">OSM Japan</option>
          <option value="maptiler-es">MapTiler (ES, requiere key)</option>
        </select>
        <p className="text-xs text-gray-600 mt-1">
          Puedes cambiar el estilo del mapa según prefieras.
        </p>
      </div>
    </div>
  );
}
