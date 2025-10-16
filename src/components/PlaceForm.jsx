import { useMemo, useState } from "react";
import { useItineraryStore } from "../hooks/useItineraryStore";
import MenuImageModal from "./MenuImageModal";

const categories = [
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

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Editar: {place.name}</h3>
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
        <label className="col-span-2">
          <span className="text-xs">Nombre</span>
          <input
            className="input"
            value={place.name}
            onChange={(e) => updatePlace(place.id, { name: e.target.value })}
          />
        </label>

        <label>
          <span className="text-xs">Categoría</span>
          <select
            className="input"
            value={place.category}
            onChange={(e) =>
              updatePlace(place.id, { category: e.target.value })
            }
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-xs">Fecha (día del itinerario)</span>
          <input
            type="date"
            className="input"
            value={place.date || ""}
            onChange={(e) => updatePlace(place.id, { date: e.target.value })}
          />
        </label>

        <label>
          <span className="text-xs">Modo hacia el siguiente</span>
          <select
            className="input"
            value={place.modeToNext || "walk"}
            onChange={(e) =>
              updatePlace(place.id, { modeToNext: e.target.value })
            }
          >
            <option value="walk">walk</option>
            <option value="train">train</option>
            <option value="car">car</option>
          </select>
        </label>

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
              updatePlace(place.id, { durationMin: Number(e.target.value) })
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
              updatePlace(place.id, { spendJPY: Number(e.target.value) })
            }
          />
        </label>

        <label>
          <span className="text-xs">Rango de precio</span>
          <input
            className="input"
            placeholder="¥ / ¥¥ / ¥¥¥"
            value={place.priceRange || ""}
            onChange={(e) =>
              updatePlace(place.id, { priceRange: e.target.value })
            }
          />
        </label>

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

        <label>
          <span className="text-xs">Lat</span>
          <input
            type="number"
            step="0.000001"
            className="input"
            value={place.lat}
            onChange={(e) =>
              updatePlace(place.id, { lat: Number(e.target.value) })
            }
          />
        </label>

        <label>
          <span className="text-xs">Lng</span>
          <input
            type="number"
            step="0.000001"
            className="input"
            value={place.lng}
            onChange={(e) =>
              updatePlace(place.id, { lng: Number(e.target.value) })
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

      {menuOpen && place.menuImageUrl && (
        <MenuImageModal
          url={place.menuImageUrl}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
