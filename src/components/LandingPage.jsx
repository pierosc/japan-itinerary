// src/components/LandingPage.jsx
import { useState } from "react";
import TripCard from "./TripCard";

export default function LandingPage({ trips, onEnterTrip, onAddTrip }) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [destination, setDestination] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [mapCenterText, setMapCenterText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Ponle al menos un nombre al viaje 🙂");
      return;
    }

    let mapCenter = null;
    if (mapCenterText.trim()) {
      const [latStr, lngStr] = mapCenterText.split(",").map((s) => s.trim());
      const lat = Number(latStr);
      const lng = Number(lngStr);
      if (!isNaN(lat) && !isNaN(lng)) {
        mapCenter = [lat, lng];
      }
    }

    onAddTrip({
      title: title.trim(),
      subtitle: subtitle.trim() || "",
      destination: destination.trim() || "",
      coverImage: coverImage.trim() || "",
      mapCenter,
    });

    // limpiar
    setTitle("");
    setSubtitle("");
    setDestination("");
    setCoverImage("");
    setMapCenterText("");
    setShowNewForm(false);
  };

  return (
    <div className="landing-root">
      <header className="landing-header">
        <div>
          <h1 className="landing-title">Tus viajes planificados</h1>
          <p className="landing-subtitle">
            Elige un viaje para continuar planificando o crea uno nuevo.
          </p>
        </div>

        <button
          className="btn landing-new-trip-button"
          onClick={() => setShowNewForm((v) => !v)}
        >
          + Planificar nuevo viaje
        </button>
      </header>

      {showNewForm && (
        <div className="card landing-new-trip-card">
          <h2 className="font-semibold mb-2">Nuevo viaje</h2>
          <form
            onSubmit={handleSubmit}
            className="landing-new-trip-form"
            autoComplete="off"
          >
            <label>
              <span className="text-xs">Nombre del viaje *</span>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="p. ej. Japón 2026 con amigos"
              />
            </label>

            <label>
              <span className="text-xs">Subtítulo (opcional)</span>
              <input
                className="input"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="p. ej. Tokio · Kioto · Osaka"
              />
            </label>

            <label>
              <span className="text-xs">Destino (visible en la card)</span>
              <input
                className="input"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="p. ej. Japón"
              />
            </label>

            <label>
              <span className="text-xs">URL de imagen de fondo</span>
              <input
                className="input"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="URL de una foto (Unsplash, etc.)"
              />
            </label>

            <label>
              <span className="text-xs">
                Centro del mapa (lat,lng) – opcional
              </span>
              <input
                className="input"
                value={mapCenterText}
                onChange={(e) => setMapCenterText(e.target.value)}
                placeholder="35.681236, 139.767125"
              />
            </label>

            <div className="landing-new-trip-actions">
              <button
                type="button"
                className="btn-outline"
                onClick={() => setShowNewForm(false)}
              >
                Cancelar
              </button>
              <button type="submit" className="btn">
                Crear viaje
              </button>
            </div>
          </form>
        </div>
      )}

      <section className="landing-trips-section">
        {trips.length === 0 ? (
          <p className="text-xs">
            Aún no tienes viajes. Crea uno con &quot;Planificar nuevo
            viaje&quot;.
          </p>
        ) : (
          <div className="trips-grid">
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onClick={() => onEnterTrip(trip.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
