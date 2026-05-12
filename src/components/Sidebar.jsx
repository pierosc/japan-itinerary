// src/components/Sidebar.jsx
import ItineraryList from "./ItineraryList";
import ImportExport from "./ImportExport";
import DaySelector from "./day/DaySelector";
import FinancePanel from "./finance/FinancePanel";
import MyPlacesPanel from "./MyPlacesPanel";
import SettingsPanel from "./SettingsPanel";
import UsersPanel from "./UsersPanel";
import PackingListPanel from "./PackingListPanel";
import { useItineraryStore } from "../hooks/useItineraryStore";

const NAV_ITEMS = [
  { id: "itinerary", label: "Itinerario", short: "Plan", icon: "⌖" },
  { id: "myplaces", label: "My places", short: "Places", icon: "☆" },
  { id: "finance", label: "Gastos y finanzas", short: "Gastos", icon: "¥" },
  { id: "packing", label: "Packing list", short: "Packing", icon: "□" },
  { id: "users", label: "Users", short: "Users", icon: "@" },
  { id: "settings", label: "Configuración", short: "Config", icon: "⚙" },
];

export default function Sidebar({ trip, currentUser, onUpdateTripMeta }) {
  const ui = useItineraryStore((s) => s.ui);
  const setSidebarTab = useItineraryStore((s) => s.setSidebarTab);
  const storageMode = ui.storageMode || "online";

  // 👇 contador de "My places" (lugares sin date)
  const unassignedCount = useItineraryStore((s) => s.unassignedPlaces().length);

  return (
    <div className="sidebar-shell h-full w-full flex flex-col min-h-0">
      {storageMode === "local" && (
        <div className="toolbar card">
          <ImportExport />
        </div>
      )}

      <div className="sidebar-nav">
        <select
          className="input sidebar-nav-select"
          value={ui.sidebarTab}
          onChange={(e) => setSidebarTab(e.target.value)}
          aria-label="Cambiar sección"
        >
          {NAV_ITEMS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.id === "myplaces" && unassignedCount > 0
                ? `${item.label} (${unassignedCount})`
                : item.label}
            </option>
          ))}
        </select>

        <div className="sidebar-tabs" role="tablist" aria-label="Secciones">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={
                "sidebar-tab " +
                (ui.sidebarTab === item.id ? "sidebar-tab--active" : "")
              }
              onClick={() => setSidebarTab(item.id)}
              role="tab"
              aria-selected={ui.sidebarTab === item.id}
            >
              <span className="sidebar-tab-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.short}</span>
              {item.id === "myplaces" && unassignedCount > 0 && (
                <span className="sidebar-tab-count">{unassignedCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {ui.sidebarTab === "itinerary" && (
        <div className="sidebar-pane">
          <section className="workspace-section">
            <DaySelector />
          </section>
          <section className="workspace-section sidebar-list-card">
            <ItineraryList />
          </section>
        </div>
      )}

      {ui.sidebarTab === "myplaces" && (
        <section className="workspace-section sidebar-list-card">
          <MyPlacesPanel />
        </section>
      )}

      {ui.sidebarTab === "finance" && (
        <section className="workspace-section sidebar-scroll-pane">
          <FinancePanel trip={trip} currentUser={currentUser} />
        </section>
      )}

      {ui.sidebarTab === "packing" && (
        <section className="workspace-section sidebar-list-card">
          <PackingListPanel />
        </section>
      )}

      {ui.sidebarTab === "users" && (
        <section className="workspace-section sidebar-list-card">
          {/* OJO: UsersPanel ahora recibe trip (para id) */}
          <UsersPanel trip={trip} currentUser={currentUser} />
        </section>
      )}

      {ui.sidebarTab === "settings" && (
        <section className="workspace-section sidebar-scroll-pane">
          <SettingsPanel
            trip={trip}
            currentUser={currentUser}
            onUpdateTripMeta={onUpdateTripMeta}
          />
        </section>
      )}
    </div>
  );
}
