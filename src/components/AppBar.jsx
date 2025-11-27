// src/components/AppBar.jsx
import { useState } from "react";

export default function AppBar({ trip, onUpdateTripMeta }) {
  const [editingImage, setEditingImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState(trip.imageUrl || "");

  const handleImageChange = () => {
    if (newImageUrl !== trip.imageUrl) {
      onUpdateTripMeta({ imageUrl: newImageUrl });
    }
    setEditingImage(false);
  };

  return (
    <header
      style={{
        backgroundImage: trip.imageUrl
          ? `url(${trip.imageUrl})`
          : "linear-gradient(90deg, #0f172a 0%, #1d4ed8 40%, #2563eb 70%, #22c55e 100%)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        padding: "10px",
        color: "#fff",
      }}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            className="btn-outline text-xs"
            onClick={() => window.history.back()}
          >
            ← Volver a mis viajes
          </button>
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 16,
                textShadow: "0 1px 3px rgba(0,0,0,0.6)",
              }}
            >
              {trip.title || "Sin título"}
            </div>
          </div>
        </div>

        {editingImage ? (
          <div>
            <input
              type="text"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="Nueva imagen URL"
            />
            <button onClick={handleImageChange}>Guardar</button>
          </div>
        ) : (
          <button onClick={() => setEditingImage(true)}>Editar imagen</button>
        )}

        {trip.destination && (
          <span
            className="chip"
            style={{
              background: "rgba(15,23,42,0.75)",
              borderColor: "rgba(148,163,184,0.4)",
              color: "#e5e7eb",
            }}
          >
            {trip.destination}
          </span>
        )}
        <UserButton
          appearance={{
            elements: {
              avatarBox: { width: 32, height: 32 },
            },
          }}
        />
      </div>
    </header>
  );
}
