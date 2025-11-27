// src/components/PlannerShell.jsx
import { useUser, UserButton } from "@clerk/clerk-react";
import MapPanel from "./MapPanel";
import Sidebar from "./Sidebar";

export default function PlannerShell({
  trip,
  onBack,
  onSave,
  onLoad,
  onUpdateTripMeta,
  autoSaveLabel,
}) {
  const { isSignedIn } = useUser();

  return (
    <div className="h-full flex flex-col gap-3">
      {/* AppBar */}
      <header className="planner-appbar">
        <div className="planner-appbar-left">
          <button className="btn-outline text-xs" onClick={onBack}>
            ← Volver a mis viajes
          </button>
          <div className="planner-appbar-title-block">
            <div className="planner-appbar-trip-title">
              {trip?.title || "Sin título"}
            </div>
          </div>
        </div>

        <div className="planner-appbar-right">
          {trip?.destination && (
            <span className="planner-appbar-chip">{trip.destination}</span>
          )}

          {autoSaveLabel && (
            <span className="planner-appbar-status">{autoSaveLabel}</span>
          )}

          {/* Solo mostramos el botón Guardar si el modo de guardado es manual.
              Eso ya lo controlas desde App pasándole onSave solo cuando toque */}
          {onSave && (
            <button className="btn-outline text-xs" onClick={onSave}>
              Guardar ahora
            </button>
          )}

          {onLoad && (
            <button className="btn-outline text-xs" onClick={onLoad}>
              Cargar
            </button>
          )}

          {isSignedIn && (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: { width: 32, height: 32 },
                },
              }}
            />
          )}
        </div>
      </header>

      {/* Layout principal */}
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
