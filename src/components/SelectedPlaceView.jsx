// src/components/SelectedPlaceView.jsx
import { useMemo } from "react";
import { useItineraryStore } from "../hooks/useItineraryStore";
import ImageCarousel from "./media/ImageCarousel";
import PlaceEditor from "./PlaceEditor";

export default function SelectedPlaceView({ trip, currentUser }) {
  const { places, selectedId, setShowMap, setSelected, setSidebarTab } =
    useItineraryStore();
  const place = useMemo(
    () => places.find((p) => p.id === selectedId),
    [places, selectedId]
  );

  if (!place) return null;

  return (
    <div className="h-full w-full p-3 overflow-auto">
      <div
        className="flex"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h2 className="font-semibold text-lg">{place.name || "Punto"}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-outline" onClick={() => setShowMap(true)}>
            ← Volver al mapa
          </button>
          <button className="btn-outline" onClick={() => setSelected(null)}>
            Cerrar
          </button>
        </div>
      </div>

      {/* Carrusel de imágenes grande */}
      <ImageCarousel
        images={(place.images || []).map((i) => ({
          src: i.url,
          alt: i.name,
        }))}
        height={260}
      />

      <div className="card mt-3">
        {place.category === "hotel" && !place.hotelEndpointRole ? (
          <div className="empty-state">
            <div className="font-medium">Este hotel se edita desde Hotel</div>
            <div className="text-xs">
              Usa la pestaña Hotel para cambiar nombre, fechas, horarios y
              ubicación.
            </div>
            <button
              className="btn-outline"
              onClick={() => {
                setSidebarTab("hotels");
                setShowMap(true);
              }}
            >
              Ir a Hotel
            </button>
          </div>
        ) : (
          <PlaceEditor place={place} trip={trip} currentUser={currentUser} />
        )}
      </div>
    </div>
  );
}
