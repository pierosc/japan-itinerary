// src/components/LandingPage.jsx
import { useState } from "react";
import TripCard from "./TripCard";

function NewTripDialog({ open, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("Japan");
  const [imageUrl, setImageUrl] = useState("");

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({
      title: title.trim() || "Sin título",
      destination: destination.trim() || "Japan",
      imageUrl: imageUrl.trim() || null,
    });
    setTitle("");
    setDestination("Japan");
    setImageUrl("");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 40,
      }}
    >
      <div
        className="panel"
        style={{
          maxWidth: 480,
          width: "100%",
          padding: 20,
        }}
      >
        <h2 style={{ marginBottom: 12 }}>Crear nuevo viaje</h2>
        <p className="text-xs" style={{ marginBottom: 12 }}>
          Define un título, el destino y opcionalmente una imagen que usaremos
          en la tarjeta y en el encabezado del planner.
        </p>

        <form onSubmit={handleSubmit} className="landing-new-trip-form">
          <label>
            <span className="text-xs">Nombre del viaje</span>
            <input
              className="input"
              placeholder="Ej. Japón 2026 con amigos"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            <span className="text-xs">Destino / país</span>
            <input
              className="input"
              placeholder="Japan"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </label>
          <label style={{ gridColumn: "span 2" }}>
            <span className="text-xs">URL de imagen (opcional)</span>
            <input
              className="input"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <span className="text-xs">
              Puede ser una foto de Unsplash, tu blog, etc.
            </span>
          </label>

          <div className="landing-new-trip-actions">
            <button type="button" className="btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn">
              Crear viaje
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LandingPage({
  trips,
  onEnterTrip,
  onAddTrip,
  isLoadingTrips,
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreate = (data) => {
    onAddTrip(data);
    setDialogOpen(false);
  };

  return (
    <div className="landing-root">
      {/* Encabezado */}
      <div className="landing-header">
        <div>
          <div className="landing-title">dibu trip planner</div>
          <div className="landing-subtitle">
            Organiza tus viajes con días, lugares, gastos y packing list. Tus
            viajes se guardan en tu cuenta para que puedas retomarlos cuando
            quieras.
          </div>
        </div>
        <button
          className="btn landing-new-trip-button"
          onClick={() => setDialogOpen(true)}
        >
          + Nuevo viaje
        </button>
      </div>

      {/* Estado de carga / vacío */}
      <div className="landing-trips-section">
        {isLoadingTrips ? (
          <div className="text-xs text-gray-600">
            Cargando tus viajes desde la nube...
          </div>
        ) : trips.length === 0 ? (
          <div className="panel" style={{ padding: 20, marginTop: 12 }}>
            <h3 className="font-semibold">Aún no tienes viajes</h3>
            <p className="text-xs">
              Haz clic en <strong>“Nuevo viaje”</strong> para crear el primero.
              Podrás añadir días, lugares, gastos y una lista de cosas para
              llevar.
            </p>
          </div>
        ) : (
          <div className="trips-grid" style={{ marginTop: 12 }}>
            {trips.map((t) => (
              <TripCard key={t.id} trip={t} onClick={() => onEnterTrip(t.id)} />
            ))}
          </div>
        )}
      </div>

      <NewTripDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
