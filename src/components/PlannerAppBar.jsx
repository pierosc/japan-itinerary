// src/components/PlannerAppBar.jsx
import { UserButton } from "@clerk/clerk-react";
import CurrencySelector from "./CurrencySelector";
import PdfExportButton from "./PdfExportButton";

export default function PlannerAppBar({
  trip,
  currentUser,
  hasClerk,
  onBack,
  onSaveNow,
  onStartTour,
  saveState,
  saveMessage,
}) {
  const isSignedIn = Boolean(currentUser?.id);
  const saving = saveState === "saving";

  return (
    <header className="planner-appbar" data-tour="trip-appbar">
      <div className="planner-appbar-left">
        <button
          className="planner-back-button"
          onClick={onBack}
          data-tour="trip-back"
        >
          <span aria-hidden="true">←</span>
          <span>Mis viajes</span>
        </button>

        <div className="planner-appbar-title-block" data-tour="trip-title">
          <div className="planner-appbar-trip-title">
            {trip?.title || "Sin título"}
          </div>
          {trip?.destination && (
            <div className="planner-appbar-subtitle">{trip.destination}</div>
          )}
        </div>
      </div>

      <div className="planner-appbar-right" data-tour="trip-actions">
        {onStartTour && (
          <button
            className="icon-button planner-help-button"
            type="button"
            onClick={onStartTour}
            title="Tutorial del trip"
            aria-label="Abrir tutorial del trip"
            data-tour="trip-help-button"
          >
            ?
          </button>
        )}

        <div data-tour="trip-currency">
          <CurrencySelector compact />
        </div>

        {saveMessage && (
          <span className="planner-appbar-status">{saveMessage}</span>
        )}

        {onSaveNow && (
          <button
            className="planner-save-button"
            onClick={onSaveNow}
            disabled={saving}
            title="Guardar ahora"
            data-tour="trip-save"
          >
            {saving ? "Guardando..." : "Guardar ahora"}
          </button>
        )}

        <div data-tour="trip-pdf">
          <PdfExportButton trip={trip} />
        </div>

        {hasClerk && isSignedIn && (
          <span data-tour="trip-account">
            <UserButton
              appearance={{ elements: { avatarBox: { width: 34, height: 34 } } }}
            />
          </span>
        )}
      </div>
    </header>
  );
}
