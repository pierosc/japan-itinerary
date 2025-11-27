// src/components/Sidebar.jsx
import ItineraryList from "./ItineraryList";
import PlaceForm from "./PlaceForm";
import ImportExport from "./ImportExport";
import DaySelector from "./day/DaySelector";
import FinancePanel from "./finance/FinancePanel";
import MyPlacesPanel from "./MyPlacesPanel";
import SettingsPanel from "./SettingsPanel";
import UsersPanel from "./UsersPanel";
import PackingListPanel from "./PackingListPanel";
import { useItineraryStore } from "../hooks/useItineraryStore";

export default function Sidebar({ trip, onUpdateTripMeta }) {
  const selectedId = useItineraryStore((s) => s.selectedId);
  const ui = useItineraryStore((s) => s.ui);
  const setSidebarTab = useItineraryStore((s) => s.setSidebarTab);
  const storageMode = ui.storageMode || "online";

  const tabClass = (tab) =>
    "btn-outline flex-1 text-xs " + (ui.sidebarTab === tab ? "btn-active" : "");

  return (
    <div className="h-full w-full flex flex-col gap-3">
      {/* Import / Export solo si estoy en modo LOCAL */}
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
            className={tabClass("packing")}
            onClick={() => setSidebarTab("packing")}
          >
            Packing list
          </button>
          <button
            className={tabClass("users")}
            onClick={() => setSidebarTab("users")}
          >
            Users
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

      {ui.sidebarTab === "myplaces" && (
        <div className="card">
          <MyPlacesPanel />
        </div>
      )}

      {ui.sidebarTab === "finance" && (
        <div className="card">
          <FinancePanel />
        </div>
      )}

      {ui.sidebarTab === "packing" && (
        <div className="card">
          <PackingListPanel />
        </div>
      )}

      {ui.sidebarTab === "users" && (
        <div className="card">
          <UsersPanel trip={trip} />
        </div>
      )}

      {ui.sidebarTab === "settings" && (
        <div className="card">
          <SettingsPanel trip={trip} onUpdateTripMeta={onUpdateTripMeta} />
        </div>
      )}

      {/* Editor de lugar, siempre abajo si hay seleccionado */}
      {selectedId && (
        <div className="card">
          <PlaceForm />
        </div>
      )}
    </div>
  );
}
