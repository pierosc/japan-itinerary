// src/components/PlannerAppBar.jsx
import { useUser, UserButton } from "@clerk/clerk-react";

export default function PlannerAppBar({
  trip,
  onBack,
  onSaveNow,
  saveState, // "idle" | "saving" | "saved" | "error"
  saveMessage, // string
}) {
  const { isSignedIn } = useUser();
  const saving = saveState === "saving";

  return (
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

        {/* ✅ siempre muestra algo */}
        {saveMessage && (
          <span className="planner-appbar-status">{saveMessage}</span>
        )}

        {onSaveNow && (
          <button
            className="btn-outline text-xs"
            onClick={onSaveNow}
            disabled={saving}
            title="Guardar ahora"
          >
            {saving ? "Guardando…" : "Guardar ahora"}
          </button>
        )}

        {isSignedIn && (
          <UserButton
            appearance={{ elements: { avatarBox: { width: 32, height: 32 } } }}
          />
        )}
      </div>
    </header>
  );
}
