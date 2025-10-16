// src/components/SelectedPlaceView.jsx
import { useMemo } from "react";
import { useItineraryStore } from "../hooks/useItineraryStore";
import ImageCarousel from "./media/ImageCarousel";

export default function SelectedPlaceView() {
  const { places, selectedId, setShowMap, setSelected, updatePlace } =
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
          src: i.dataUrl,
          alt: i.name,
        }))}
        height={360}
      />

      <div
        className="card mt-3"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
      >
        <label className="col-span-2">
          <span className="text-xs">Nombre</span>
          <input
            className="input"
            value={place.name || ""}
            onChange={(e) => updatePlace(place.id, { name: e.target.value })}
          />
        </label>

        <label>
          <span className="text-xs">Inicio (HH:mm)</span>
          <input
            className="input"
            value={place.startTime || ""}
            onChange={(e) =>
              updatePlace(place.id, { startTime: e.target.value })
            }
          />
        </label>

        <label>
          <span className="text-xs">Estancia (min)</span>
          <input
            type="number"
            className="input"
            value={place.durationMin ?? 60}
            onChange={(e) =>
              updatePlace(place.id, {
                durationMin: Number(e.target.value) || 0,
              })
            }
          />
        </label>

        <label>
          <span className="text-xs">Gasto (¥)</span>
          <input
            type="number"
            className="input"
            value={place.spendJPY ?? 0}
            onChange={(e) =>
              updatePlace(place.id, { spendJPY: Number(e.target.value) || 0 })
            }
          />
        </label>

        <label className="col-span-2">
          <span className="text-xs">Notas</span>
          <textarea
            className="input"
            value={place.notes || ""}
            onChange={(e) => updatePlace(place.id, { notes: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
