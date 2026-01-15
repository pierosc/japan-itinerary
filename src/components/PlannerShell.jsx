// src/components/PlannerShell.jsx
import MapPanel from "./MapPanel";
import Sidebar from "./Sidebar";
import PlannerAppBar from "./PlannerAppBar";
import { useItineraryStore } from "../hooks/useItineraryStore";

export default function PlannerShell({
  trip,
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
    <div className="h-full flex flex-col gap-3">
      <PlannerAppBar
        trip={trip}
        onBack={onBack}
        onSaveNow={onSave}
        saveState={saveState || "idle"}
        saveMessage={saveMessage || defaultStatus}
      />

      <div className="h-full grid grid-cols-2 gap-3">
        <div className="panel">
          <div className="h-full">
            <MapPanel />
          </div>
        </div>

        <div className="panel overflow-auto">
          <div className="h-full flex flex-col gap-3 p-3">
            <Sidebar trip={trip} onUpdateTripMeta={onUpdateTripMeta} />
          </div>
        </div>
      </div>
    </div>
  );
}
