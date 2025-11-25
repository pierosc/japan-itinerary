// src/components/SettingsPanel.jsx
import { useItineraryStore } from "../hooks/useItineraryStore";

export default function SettingsPanel() {
  const theme = useItineraryStore((s) => s.ui.theme);
  const toggleTheme = useItineraryStore((s) => s.toggleTheme);

  const isLight = theme === "light";

  return (
    <div className="card">
      <h2 className="font-semibold mb-2">Configuración</h2>

      <div className="mb-2">
        <p className="text-xs mb-2">
          Tema actual: <strong>{isLight ? "Claro" : "Oscuro"}</strong>
        </p>
        <button className="btn-outline" onClick={toggleTheme}>
          Cambiar a tema {isLight ? "oscuro" : "claro"}
        </button>
      </div>

      <p className="text-xs text-gray-600 mt-2">
        El tema afecta a toda la interfaz (mapa, paneles y listas) usando
        variables CSS. Puedes cambiarlo en cualquier momento.
      </p>
    </div>
  );
}
