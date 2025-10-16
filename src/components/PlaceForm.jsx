// src/components/PlaceForm.jsx
import { useMemo, useState } from "react";
import { useItineraryStore } from "../hooks/useItineraryStore";
import MenuImageModal from "./MenuImageModal";

const CATEGORIES = [
  "restaurante",
  "tienda",
  "supermercado",
  "bookoff",
  "atraccion",
  "cafe",
  "hotel",
  "otro",
];

export default function PlaceForm() {
  const { places, selectedId, updatePlace, removePlace, setSelected } =
    useItineraryStore();

  const place = useMemo(
    () => places.find((p) => p.id === selectedId),
    [places, selectedId]
  );

  const [menuOpen, setMenuOpen] = useState(false);

  if (!place) return null;

  const onNum = (v, fallback = 0) =>
    Number.isNaN(Number(v)) ? fallback : Number(v);

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Editar: {place.name || "Punto"}</h3>
        <button
          className="btn-outline"
          onClick={() => {
            if (confirm("¿Eliminar este punto?")) {
              removePlace(place.id);
              setSelected(null);
            }
          }}
        >
          Eliminar
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {/* Nombre */}
        <label className="col-span-2">
          <span className="text-xs">Nombre</span>
          <input
            className="input"
            value={place.name || ""}
            onChange={(e) => updatePlace(place.id, { name: e.target.value })}
          />
        </label>

        {/* Categoría */}
        <label>
          <span className="text-xs">Categoría</span>
          <select
            className="input"
            value={place.category || "otro"}
            onChange={(e) =>
              updatePlace(place.id, { category: e.target.value })
            }
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        {/* Fecha (día del itinerario) */}
        <label>
          <span className="text-xs">Fecha (día del itinerario)</span>
          <input
            type="date"
            className="input"
            value={place.date || ""}
            onChange={(e) => updatePlace(place.id, { date: e.target.value })}
          />
        </label>

        {/* Inicio y estancia */}
        <label>
          <span className="text-xs">Inicio (HH:mm)</span>
          <input
            className="input"
            placeholder="09:00"
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
              updatePlace(place.id, { durationMin: onNum(e.target.value, 60) })
            }
          />
        </label>

        {/* Costos */}
        <label>
          <span className="text-xs">Gasto (¥)</span>
          <input
            type="number"
            className="input"
            value={place.spendJPY ?? 0}
            onChange={(e) =>
              updatePlace(place.id, { spendJPY: onNum(e.target.value, 0) })
            }
          />
        </label>

        <label>
          <span className="text-xs">Rango de precio</span>
          <input
            className="input"
            placeholder="gratis / ¥ / ¥¥ / ¥¥¥"
            value={place.priceRange || ""}
            onChange={(e) =>
              updatePlace(place.id, { priceRange: e.target.value })
            }
          />
        </label>

        {/* Fuente */}
        <label className="col-span-2">
          <span className="text-xs">Fuente (URL)</span>
          <input
            className="input"
            placeholder="https://..."
            value={place.sourceUrl || ""}
            onChange={(e) =>
              updatePlace(place.id, { sourceUrl: e.target.value })
            }
          />
        </label>

        {/* Restaurante: URL imagen de menú + visor */}
        {place.category === "restaurante" && (
          <>
            <label className="col-span-2">
              <span className="text-xs">URL imagen del menú</span>
              <input
                className="input"
                placeholder="https://..."
                value={place.menuImageUrl || ""}
                onChange={(e) =>
                  updatePlace(place.id, { menuImageUrl: e.target.value })
                }
              />
            </label>
            <div className="col-span-2">
              <button
                className="btn"
                onClick={() => setMenuOpen(true)}
                disabled={!place.menuImageUrl}
                title={!place.menuImageUrl ? "Agrega primero una URL" : ""}
              >
                Ver menú (imagen online)
              </button>
            </div>
          </>
        )}

        {/* Coordenadas */}
        <label>
          <span className="text-xs">Lat</span>
          <input
            type="number"
            step="0.000001"
            className="input"
            value={place.lat ?? ""}
            onChange={(e) =>
              updatePlace(place.id, { lat: onNum(e.target.value, place.lat) })
            }
          />
        </label>

        <label>
          <span className="text-xs">Lng</span>
          <input
            type="number"
            step="0.000001"
            className="input"
            value={place.lng ?? ""}
            onChange={(e) =>
              updatePlace(place.id, { lng: onNum(e.target.value, place.lng) })
            }
          />
        </label>

        {/* Notas */}
        <label className="col-span-2">
          <span className="text-xs">Notas</span>
          <textarea
            className="input"
            value={place.notes || ""}
            onChange={(e) => updatePlace(place.id, { notes: e.target.value })}
          />
        </label>

        {/* Imágenes (dataURL en JSON) */}
        <div className="col-span-2">
          <span className="text-xs">Imágenes</span>
          <div
            className="mt-1"
            style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            {(place.images || []).map((img, i) => (
              <div
                key={i}
                className="card"
                style={{
                  padding: 6,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <img
                  src={img.dataUrl}
                  alt={img.name || `img-${i}`}
                  style={{ maxWidth: 140, borderRadius: 8 }}
                />
                <div
                  className="text-xs"
                  style={{ maxWidth: 140, textAlign: "center" }}
                >
                  {img.name || `imagen ${i + 1}`}
                </div>
                <button
                  className="btn-outline"
                  onClick={() => {
                    const next = [...(place.images || [])];
                    next.splice(i, 1);
                    updatePlace(place.id, { images: next });
                  }}
                >
                  Quitar
                </button>
              </div>
            ))}

            {/* Subir nueva */}
            <label className="btn-outline" style={{ cursor: "pointer" }}>
              + Subir
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const current = place.images || [];
                    updatePlace(place.id, {
                      images: [
                        ...current,
                        { name: file.name, dataUrl: reader.result },
                      ],
                    });
                  };
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Modal de imagen de menú (solo restaurantes) */}
      {menuOpen && place.menuImageUrl && (
        <MenuImageModal
          url={place.menuImageUrl}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
