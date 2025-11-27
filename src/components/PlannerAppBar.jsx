// src/components/PlannerAppBar.jsx
import { UserButton } from "@clerk/clerk-react";

export default function PlannerAppBar({
  trip,
  countryLabel = "Japan",
  onBack,
  showSaveButton,
  onSave,
  autoSaveEnabled,
}) {
  const backgroundImage = trip.imageUrl
    ? `linear-gradient(to right, rgba(15,23,42,0.88), rgba(15,23,42,0.6)), url(${trip.imageUrl})`
    : "linear-gradient(to right, #0f172a, #1d4ed8)";

  return (
    <header
      className="card"
      style={{
        padding: "10px 16px",
        borderRadius: 16,
        backgroundImage,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "#fff",
      }}
    >
      <div className="flex justify-between items-center">
        {/* Izquierda */}
        <div className="flex items-center gap-3">
          <button
            className="btn-outline text-xs"
            style={{
              background: "rgba(15,23,42,0.55)",
              borderColor: "rgba(148,163,184,0.4)",
            }}
            onClick={onBack}
          >
            ← Volver a mis viajes
          </button>
          <div className="flex items-center gap-3">
            {trip.imageUrl && (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "2px solid rgba(255,255,255,0.7)",
                  boxShadow: "0 4px 14px rgba(15,23,42,0.6)",
                }}
              >
                <img
                  src={trip.imageUrl}
                  alt={trip.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {trip.title || "Sin título"}
              </div>
              {trip.subtitle && (
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.85,
                    marginTop: 2,
                  }}
                >
                  {trip.subtitle}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Derecha */}
        <div className="flex items-center gap-3">
          <span
            className="chip"
            style={{
              background: "rgba(15,23,42,0.55)",
              borderColor: "rgba(148,163,184,0.4)",
            }}
          >
            {countryLabel}
          </span>

          <span
            className="text-xs"
            style={{
              padding: "4px 8px",
              borderRadius: 999,
              background: autoSaveEnabled
                ? "rgba(34,197,94,0.2)"
                : "rgba(148,163,184,0.2)",
              border: "1px solid rgba(148,163,184,0.4)",
              color: autoSaveEnabled ? "#bbf7d0" : "#e5e7eb",
            }}
          >
            {autoSaveEnabled ? "Auto-guardado activo" : "Guardado manual"}
          </span>

          {showSaveButton && (
            <button className="btn text-xs" onClick={onSave}>
              Guardar ahora
            </button>
          )}

          <UserButton
            appearance={{
              elements: {
                avatarBox: { width: 32, height: 32 },
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}
