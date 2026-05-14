import { useEffect } from "react";
import ItineraryList from "./ItineraryList";
import ImportExport from "./ImportExport";
import DaySelector from "./day/DaySelector";
import FinancePanel from "./finance/FinancePanel";
import MyPlacesPanel from "./MyPlacesPanel";
import SettingsPanel from "./SettingsPanel";
import UsersPanel from "./UsersPanel";
import PackingListPanel from "./PackingListPanel";
import TimelinePanel from "./TimelinePanel";
import { useItineraryStore } from "../hooks/useItineraryStore";

const NAV_ITEMS = [
  { id: "itinerary", label: "Itinerario", short: "Plan", icon: "#" },
  { id: "timeline", label: "Timeline", short: "Time", icon: "T" },
  { id: "myplaces", label: "My places", short: "Places", icon: "*" },
  { id: "finance", label: "Gastos y finanzas", short: "Gastos", icon: "JPY" },
  { id: "packing", label: "Packing list", short: "Packing", icon: "[]" },
  { id: "users", label: "Users", short: "Users", icon: "@" },
  { id: "settings", label: "Configuración", short: "Config", icon: "..." },
];

export default function Sidebar({ trip, currentUser, onUpdateTripMeta }) {
  const ui = useItineraryStore((state) => state.ui);
  const setSidebarTab = useItineraryStore((state) => state.setSidebarTab);
  const storageMode = ui.storageMode || "online";
  const unassignedCount = useItineraryStore(
    (state) => state.unassignedPlaces().length
  );
  const activeTab = NAV_ITEMS.some((item) => item.id === ui.sidebarTab)
    ? ui.sidebarTab
    : "itinerary";

  useEffect(() => {
    if (activeTab !== ui.sidebarTab) setSidebarTab(activeTab);
  }, [activeTab, setSidebarTab, ui.sidebarTab]);

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
          value={activeTab}
          onChange={(event) => setSidebarTab(event.target.value)}
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
                (activeTab === item.id ? "sidebar-tab--active" : "")
              }
              onClick={() => setSidebarTab(item.id)}
              role="tab"
              aria-selected={activeTab === item.id}
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

      {activeTab === "itinerary" && (
        <div className="sidebar-pane">
          <section className="workspace-section">
            <DaySelector />
          </section>
          <section className="workspace-section sidebar-list-card">
            <ItineraryList />
          </section>
        </div>
      )}

      {activeTab === "timeline" && (
        <section className="workspace-section sidebar-scroll-pane">
          <TimelinePanel />
        </section>
      )}

      {activeTab === "myplaces" && (
        <section className="workspace-section sidebar-list-card">
          <MyPlacesPanel />
        </section>
      )}

      {activeTab === "finance" && (
        <section className="workspace-section sidebar-scroll-pane">
          <FinancePanel trip={trip} currentUser={currentUser} />
        </section>
      )}

      {activeTab === "packing" && (
        <section className="workspace-section sidebar-list-card">
          <PackingListPanel />
        </section>
      )}

      {activeTab === "users" && (
        <section className="workspace-section sidebar-list-card">
          <UsersPanel
            trip={trip}
            currentUser={currentUser}
            onUpdateTripMeta={onUpdateTripMeta}
          />
        </section>
      )}

      {activeTab === "settings" && (
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
