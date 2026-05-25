// src/components/PlannerShell.jsx
import MapPanel from "./MapPanel";
import Sidebar from "./Sidebar";
import PlannerAppBar from "./PlannerAppBar";
import { useItineraryStore } from "../hooks/useItineraryStore";
import { useTripTour } from "../hooks/useTripTour";

export default function PlannerShell({
  trip,
  currentUser,
  hasClerk,
  onBack,
  onSave,
  saveState,
  saveMessage,
  onUpdateTripMeta,
  onUpdateTripVisibility,
}) {
  const ui = useItineraryStore((s) => s.ui);
  const startTripTour = useTripTour();
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
        onStartTour={startTripTour}
      />

      <div className="planner-main h-full" data-tour="trip-workspace">
        <div className="panel map-panel-wrap" data-tour="trip-map">
          <div className="h-full">
            <MapPanel trip={trip} currentUser={currentUser} />
          </div>
        </div>

        <div className="panel sidebar-panel overflow-hidden">
          <div className="h-full flex flex-col min-h-0">
            <Sidebar
              trip={trip}
              currentUser={currentUser}
              onUpdateTripMeta={onUpdateTripMeta}
              onUpdateTripVisibility={onUpdateTripVisibility}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
