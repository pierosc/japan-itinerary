import { useItineraryStore } from "../hooks/useItineraryStore";
import MenuImageModal from "./MenuImageModal";
import { useMemo, useState } from "react";
import PlaceForm from "./PlaceForm";

export default function SelectedPlaceView() {
  const { places, selectedId, setShowMap } = useItineraryStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const place = useMemo(
    () => places.find((p) => p.id === selectedId),
    [places, selectedId]
  );
  if (!place) return null;

  return (
    <div className="h-full w-full" style={{ padding: 12 }}>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <button className="btn-outline" onClick={() => setShowMap(true)}>
          ← Volver al mapa
        </button>
        <div className="text-xs">
          Lat: {place.lat.toFixed(5)} · Lng: {place.lng.toFixed(5)}
        </div>
      </div>

      <div
        className="grid"
        style={{
          gridTemplateColumns: "1.2fr 1fr",
          gap: 12,
          marginTop: 12,
          height: "calc(100% - 48px)",
        }}
      >
        <div className="card" style={{ overflow: "auto" }}>
          <h2 className="font-semibold" style={{ marginBottom: 8 }}>
            {place.name}
          </h2>
          {place.sourceUrl && (
            <a
              className="text-blue-600"
              href={place.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Fuente
            </a>
          )}
          {place.menuImageUrl && place.category === "restaurante" && (
            <div className="mt-2">
              <button className="btn" onClick={() => setMenuOpen(true)}>
                Ver menú
              </button>
            </div>
          )}
          <div className="mt-2 text-xs">
            {place.startTime ? `Inicio: ${place.startTime} · ` : ""}Estancia:{" "}
            {place.durationMin ?? 60} min
            {place.priceRange ? ` · Precio: ${place.priceRange}` : ""}
            {typeof place.spendJPY === "number"
              ? ` · Gasto: ¥${place.spendJPY}`
              : ""}
          </div>
          <div className="mt-2 text-xs">{place.notes}</div>
        </div>

        {/* Editor rápido a la derecha */}
        <div className="card" style={{ overflow: "auto" }}>
          <PlaceForm />
        </div>
      </div>

      {menuOpen && place.menuImageUrl && (
        <MenuImageModal
          url={place.menuImageUrl}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}
