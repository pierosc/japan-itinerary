// src/components/PlannerShell.jsx
import MapPanel from "./MapPanel";
import Sidebar from "./Sidebar";
import PlannerAppBar from "./PlannerAppBar";
import { useItineraryStore } from "../hooks/useItineraryStore";

export default function PlannerShell({
  trip,
  currentUser,
  hasClerk,
  onBack,
  onSave,
  saveState,
  saveMessage,
  onUpdateTripMeta,
}) {
  const ui = useItineraryStore((s) => s.ui);
  const storageMode = ui.storageMode || "online";
  const autoSaveEnabled = ui.autoSaveEnabled !== false;
  const autoSaveIntervalMin = ui.autoSaveIntervalMin ?? 3;

  const defaultStatus =
    storageMode === "online"
      ? autoSaveEnabled
        ? `Auto-guardado cada ${autoSaveIntervalMin} min`
        : "Auto-guardado desactivado (manual)"
      : "Modo local";

  return (
    <div className="planner-shell h-full flex flex-col gap-3">
      <PlannerAppBar
        trip={trip}
        currentUser={currentUser}
        hasClerk={hasClerk}
        onBack={onBack}
        onSaveNow={onSave}
        saveState={saveState || "idle"}
        saveMessage={saveMessage || defaultStatus}
      />

      <div className="planner-main h-full">
        <div className="panel map-panel-wrap">
          <div className="h-full">
            <MapPanel />
          </div>
        </div>

        <div className="panel sidebar-panel overflow-hidden">
          <div className="h-full flex flex-col min-h-0">
            <Sidebar
              trip={trip}
              currentUser={currentUser}
              onUpdateTripMeta={onUpdateTripMeta}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
