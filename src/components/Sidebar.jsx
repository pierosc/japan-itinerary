// src/components/Sidebar.jsx
import ItineraryList from "./ItineraryList";
import PlaceForm from "./PlaceForm";
import ImportExport from "./ImportExport";
import DaySelector from "./day/DaySelector";
import FinancePanel from "./finance/FinancePanel";
import MyPlacesPanel from "./MyPlacesPanel";
import SettingsPanel from "./SettingsPanel";
import { useItineraryStore } from "../hooks/useItineraryStore";

export default function Sidebar() {
  const selectedId = useItineraryStore((s) => s.selectedId);
  const ui = useItineraryStore((s) => s.ui);
  const setSidebarTab = useItineraryStore((s) => s.setSidebarTab);
  const storageMode = ui.storageMode;

  const tabClass = (tab) =>
    "btn-outline flex-1 text-xs " + (ui.sidebarTab === tab ? "btn-active" : "");

  return (
    <div className="h-full w-full flex flex-col gap-3">
      {/* Import/Export SOLO en modo local */}
      {storageMode === "local" && (
        <div className="toolbar card">
          <ImportExport />
        </div>
      )}

      {/* Menú de pestañas */}
      <div className="card">
        <div className="flex gap-2 flex-wrap">
          <button
            className={tabClass("itinerary")}
            onClick={() => setSidebarTab("itinerary")}
          >
            Itinerario
          </button>
          <button
            className={tabClass("myplaces")}
            onClick={() => setSidebarTab("myplaces")}
          >
            My places
          </button>
          <button
            className={tabClass("finance")}
            onClick={() => setSidebarTab("finance")}
          >
            Gastos y finanzas
          </button>
          <button
            className={tabClass("settings")}
            onClick={() => setSidebarTab("settings")}
          >
            Configuración
          </button>
        </div>
      </div>

      {/* Contenido según pestaña */}
      {ui.sidebarTab === "itinerary" && (
        <>
          <div className="card">
            <DaySelector />
          </div>

          <div className="card">
            <ItineraryList />
          </div>
        </>
      )}

      {ui.sidebarTab === "myplaces" && <MyPlacesPanel />}
      {ui.sidebarTab === "finance" && <FinancePanel />}
      {ui.sidebarTab === "settings" && <SettingsPanel />}

      {/* Editor si hay un lugar seleccionado */}
      {selectedId && (
        <div className="card">
          <PlaceForm />
        </div>
      )}
    </div>
  );
}
