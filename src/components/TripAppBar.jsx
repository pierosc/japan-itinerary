// src/components/TripAppBar.jsx
import { useUser, UserButton } from "@clerk/clerk-react";

export default function TripAppBar({ trip, onBack, onSave, showSaveButton }) {
  const { isSignedIn } = useUser();

  return (
    <header className="card planner-header">
      <div className="flex justify-between items-center">
        {/* Izquierda: volver + nombre + mini portada */}
        <div className="flex items-center gap-3">
          <button className="btn-outline text-xs" onClick={onBack}>
            ← Volver a mis viajes
          </button>

          <div className="flex items-center gap-2">
            {trip.coverUrl && (
              <img
                src={trip.coverUrl}
                alt="Portada"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  objectFit: "cover",
                  border: "1px solid var(--border)",
                }}
              />
            )}
            <h2 className="font-semibold">{trip.title}</h2>
          </div>
        </div>

        {/* Derecha: destino + acciones */}
        <div className="flex items-center gap-2">
          {trip.destination && <span className="chip">{trip.destination}</span>}
          {showSaveButton && (
            <button
              className="btn text-xs"
              onClick={onSave}
              title="Guardar el estado actual del itinerario"
            >
              Guardar
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
      </div>
    </header>
  );
}
