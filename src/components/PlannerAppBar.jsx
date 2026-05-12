// src/components/PlannerAppBar.jsx
import { UserButton } from "@clerk/clerk-react";

export default function PlannerAppBar({
  trip,
  currentUser,
  hasClerk,
  onBack,
  onSaveNow,
  saveState,
  saveMessage,
}) {
  const isSignedIn = Boolean(currentUser?.id);
  const saving = saveState === "saving";

  return (
    <header className="planner-appbar">
      <div className="planner-appbar-left">
        <button className="planner-back-button" onClick={onBack}>
          <span aria-hidden="true">←</span>
          <span>Mis viajes</span>
        </button>

        <div className="planner-appbar-title-block">
          <div className="planner-appbar-trip-title">
            {trip?.title || "Sin título"}
          </div>
          {trip?.destination && (
            <div className="planner-appbar-subtitle">{trip.destination}</div>
          )}
        </div>
      </div>

      <div className="planner-appbar-right">
        {saveMessage && (
          <span className="planner-appbar-status">{saveMessage}</span>
        )}

        {onSaveNow && (
          <button
            className="planner-save-button"
            onClick={onSaveNow}
            disabled={saving}
            title="Guardar ahora"
          >
            {saving ? "Guardando..." : "Guardar ahora"}
          </button>
        )}

        {hasClerk && isSignedIn && (
          <UserButton
            appearance={{ elements: { avatarBox: { width: 34, height: 34 } } }}
          />
        )}
      </div>
    </header>
  );
}
