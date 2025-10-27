// src/components/PlaceEditor.jsx
import { useState } from "react";
import { useItineraryStore } from "../hooks/useItineraryStore";
import MenuImageModal from "./MenuImageModal";
import PlaceItemsEditor from "./PlaceItemsEditor";

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

export default function PlaceEditor({ place }) {
  const { updatePlace, removePlace, setSelected } = useItineraryStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgUrl, setImgUrl] = useState(""); // para agregar imagen por URL

  if (!place) return null;

  const onNum = (v, fallback = 0) =>
    Number.isNaN(Number(v)) ? fallback : Number(v);

  const addImageFromUrl = () => {
    if (!imgUrl.trim()) return;
    const current = place.images || [];
    updatePlace(place.id, {
      images: [
        ...current,
        { name: imgUrl.split("/").pop() || "imagen", url: imgUrl.trim() },
      ],
    });
    setImgUrl("");
  };

  return (
    <>
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

        {/* Fecha */}
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

        {/* Imágenes del lugar: archivo + URL */}
        <div className="col-span-2">
          <span className="text-xs">Imágenes</span>
          <div
            className="mt-1"
            style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            {(place.images || []).map((img, i) => {
              const src = img.dataUrl || img.url;
              return (
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
                  {src ? (
                    <img
                      src={src}
                      alt={img.name || `img-${i}`}
                      style={{ maxWidth: 140, borderRadius: 8 }}
                    />
                  ) : (
                    <div className="text-xs" style={{ opacity: 0.7 }}>
                      (sin imagen)
                    </div>
                  )}
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
              );
            })}

            {/* Subir archivo */}
            <label className="btn-outline" style={{ cursor: "pointer" }}>
              + Subir archivo
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

            {/* Agregar por URL */}
            <div className="flex" style={{ gap: 8, alignItems: "center" }}>
              <input
                className="input"
                placeholder="https://imagen.com/foto.jpg"
                value={imgUrl}
                onChange={(e) => setImgUrl(e.target.value)}
                style={{ width: 260 }}
              />
              <button className="btn" onClick={addImageFromUrl}>
                + Agregar URL
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Editor de ítems (platos/compras) para restaurante/tienda/supermercado */}
      {["restaurante", "tienda", "supermercado"].includes(place.category) && (
        <PlaceItemsEditor place={place} />
      )}

      {/* Acciones comunes */}
      <div
        className="mt-2"
        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
      >
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

      {/* Modal de imagen de menú */}
      {menuOpen && place.menuImageUrl && (
        <MenuImageModal
          url={place.menuImageUrl}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
