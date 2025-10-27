// src/components/SelectedPlaceView.jsx
import { useMemo } from "react";
import { useItineraryStore } from "../hooks/useItineraryStore";
import ImageCarousel from "./media/ImageCarousel";
import PlaceEditor from "./PlaceEditor";

export default function SelectedPlaceView() {
  const { places, selectedId, setShowMap, setSelected } = useItineraryStore();
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
          src: i.dataUrl || i.url,
          alt: i.name,
        }))}
        height={360}
      />

      {/* Editor completo de configuraciones */}
      <div className="card mt-3">
        <PlaceEditor place={place} />
      </div>
    </div>
  );
}
