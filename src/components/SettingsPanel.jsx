// src/components/SettingsPanel.jsx
import { useItineraryStore } from "../hooks/useItineraryStore";

export default function SettingsPanel() {
  const theme = useItineraryStore((s) => s.ui.theme);
  const toggleTheme = useItineraryStore((s) => s.toggleTheme);
  const storageMode = useItineraryStore((s) => s.ui.storageMode);
  const setStorageMode = useItineraryStore((s) => s.setStorageMode);

  const isLight = theme === "light";

  return (
    <div className="card">
      <h2 className="font-semibold mb-2">Configuración</h2>

      {/* Tema */}
      <div className="mb-3">
        <p className="text-xs mb-2">
          Tema actual: <strong>{isLight ? "Claro" : "Oscuro"}</strong>
        </p>
        <button className="btn-outline" onClick={toggleTheme}>
          Cambiar a tema {isLight ? "oscuro" : "claro"}
        </button>
      </div>

      {/* Modo de guardado */}
      <div className="mb-2">
        <h3 className="font-semibold mb-1">Modo de guardado</h3>
        <p className="text-xs text-gray-600 mb-2">
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

      <p className="text-xs text-gray-600 mt-2">
        Los botones &quot;Guardar&quot; y &quot;Cargar&quot; del planner usan el
        modo seleccionado aquí.
      </p>
    </div>
  );
}
