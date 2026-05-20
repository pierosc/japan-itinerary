// src/components/PlaceEditor.jsx
import { useState } from "react";
import { useItineraryStore } from "../hooks/useItineraryStore";
import MenuImageModal from "./MenuImageModal";
import PlaceItemsEditor from "./PlaceItemsEditor";
import { formatConvertedJPY } from "../utils/money";
import { useFeedback } from "./ui/FeedbackProvider";

const CATEGORIES = [
  "restaurante",
  "tienda",
  "supermercado",
  "bookoff",
  "atraccion",
  "cafe",
  "hotel",
  "airport",
  "otro",
];
const EDITABLE_CATEGORIES = CATEGORIES.filter((category) => category !== "hotel");
const DEFAULT_ANCHOR_TIME = "12:00";

function imageNameFromUrl(url, fallback = "imagen") {
  try {
    const parsed = new URL(url);
    const name = parsed.pathname.split("/").filter(Boolean).pop();
    return decodeURIComponent(name || fallback);
  } catch {
    return fallback;
  }
}

export default function PlaceEditor({ place, trip, currentUser }) {
  const { toast, confirm } = useFeedback();
  const { updatePlace, removePlace, setSelected, currency } =
    useItineraryStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgUrl, setImgUrl] = useState("");

  if (!place) return null;

  const isAirportEndpoint =
    place.category === "airport" &&
    ["arrival", "departure"].includes(place.airportRole);
  const isHotelEndpoint = Boolean(place.hotelEndpointRole);
  const isLockedAnchor = isAirportEndpoint || isHotelEndpoint;
  const isReadOnlyHotel = isHotelEndpoint;
  const categoryOptions = isLockedAnchor ? CATEGORIES : EDITABLE_CATEGORIES;
  const timeLabel = isAirportEndpoint
    ? place.airportRole === "arrival"
      ? "Hora llegada vuelo"
      : "Hora salida vuelo vuelta"
    : isHotelEndpoint
    ? place.hotelEndpointRole === "checkin"
      ? "Hora check-in"
      : "Hora check-out"
    : "Inicio";
  const onNum = (v, fallback = 0) =>
    Number.isNaN(Number(v)) ? fallback : Number(v);

  const addImageFromUrl = () => {
    const url = imgUrl.trim();
    if (!url) return;

    if (!/^https?:\/\/.+/i.test(url)) {
      toast({
        title: "URL inválida",
        message: "Debe empezar con http:// o https://.",
        tone: "warning",
      });
      return;
    }

    const current = place.images || [];
    updatePlace(place.id, {
      images: [
        ...current,
        { name: imageNameFromUrl(url, `imagen ${current.length + 1}`), url },
      ],
    });
    setImgUrl("");
  };

  const updateImage = (index, patch) => {
    const next = [...(place.images || [])];
    const current = next[index] || {};
    next[index] = {
      ...current,
      ...patch,
      name:
        patch.url && !patch.name
          ? imageNameFromUrl(patch.url, current.name || `imagen ${index + 1}`)
          : patch.name ?? current.name,
    };
    updatePlace(place.id, { images: next });
  };

  const removeImage = (index) => {
    const next = [...(place.images || [])];
    next.splice(index, 1);
    updatePlace(place.id, { images: next });
  };

  return (
    <>
      <div className="place-detail-form">
        <section className="place-detail-section">
          <div className="place-detail-section-title">Datos del punto</div>
          <div className="place-detail-grid">
            <label className="place-detail-field place-detail-field-wide">
              <span className="text-xs">Nombre</span>
              <input
                className="input"
                value={place.name || ""}
                disabled={isReadOnlyHotel}
                onChange={(e) =>
                  updatePlace(place.id, { name: e.target.value })
                }
              />
            </label>

            <label className="place-detail-field">
              <span className="text-xs">Categoría</span>
              <select
                className="input"
                value={place.category || "otro"}
                disabled={isLockedAnchor}
                onChange={(e) =>
                  updatePlace(place.id, { category: e.target.value })
                }
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            {place.category !== "hotel" && (
              <label className="place-detail-field">
                <span className="text-xs">Fecha</span>
                <input
                  type="date"
                  className="input"
                  value={place.date || ""}
                  disabled={isLockedAnchor}
                  onChange={(e) =>
                    updatePlace(place.id, { date: e.target.value })
                  }
                />
              </label>
            )}
          </div>
        </section>

        <section className="place-detail-section">
          <div className="place-detail-section-title">Horario y costo</div>
          <div className="place-detail-grid">
            <label className="place-detail-field">
              <span className="text-xs">{timeLabel}</span>
              <input
                className="input"
                type={isLockedAnchor ? "time" : "text"}
                placeholder="09:00"
                value={
                  place.startTime || (isLockedAnchor ? DEFAULT_ANCHOR_TIME : "")
                }
                disabled={isReadOnlyHotel}
                onChange={(e) =>
                  updatePlace(place.id, { startTime: e.target.value })
                }
              />
            </label>

            <label className="place-detail-field">
              <span className="text-xs">Estancia min</span>
              <input
                type="number"
                className="input"
                value={place.durationMin ?? 60}
                disabled={isReadOnlyHotel}
                onChange={(e) =>
                  updatePlace(place.id, {
                    durationMin: onNum(e.target.value, 60),
                  })
                }
              />
            </label>

            <label className="place-detail-field">
              <span className="text-xs">Gasto yen</span>
              <input
                type="number"
                className="input"
                value={place.spendJPY ?? 0}
                disabled={isReadOnlyHotel}
                onChange={(e) =>
                  updatePlace(place.id, { spendJPY: onNum(e.target.value, 0) })
                }
              />
              <span className="text-xs">
                {formatConvertedJPY(place.spendJPY || 0, currency)}
              </span>
            </label>

            <label className="place-detail-field">
              <span className="text-xs">Rango de precio</span>
              <input
                className="input"
                placeholder="gratis / yen / yen yen"
                value={place.priceRange || ""}
                disabled={isReadOnlyHotel}
                onChange={(e) =>
                  updatePlace(place.id, { priceRange: e.target.value })
                }
              />
            </label>
          </div>
        </section>

        {place.category === "hotel" && !isHotelEndpoint && (
          <section className="place-detail-section">
            <div className="place-detail-section-title">Estadia</div>
            <div className="place-detail-grid">
              <label className="place-detail-field">
                <span className="text-xs">Check-in</span>
                <input
                  type="date"
                  className="input"
                  value={place.checkInDate || place.date || ""}
                  onChange={(e) =>
                    updatePlace(place.id, {
                      checkInDate: e.target.value,
                      date: null,
                    })
                  }
                />
              </label>

              <label className="place-detail-field">
                <span className="text-xs">Check-out</span>
                <input
                  type="date"
                  className="input"
                  value={place.checkOutDate || ""}
                  onChange={(e) =>
                    updatePlace(place.id, { checkOutDate: e.target.value })
                  }
                />
              </label>

              <label className="place-detail-field">
                <span className="text-xs">Hora check-in</span>
                <input
                  type="time"
                  className="input"
                  value={place.checkInTime || DEFAULT_ANCHOR_TIME}
                  onChange={(e) =>
                    updatePlace(place.id, { checkInTime: e.target.value })
                  }
                />
              </label>

              <label className="place-detail-field">
                <span className="text-xs">Hora check-out</span>
                <input
                  type="time"
                  className="input"
                  value={place.checkOutTime || DEFAULT_ANCHOR_TIME}
                  onChange={(e) =>
                    updatePlace(place.id, { checkOutTime: e.target.value })
                  }
                />
              </label>
            </div>
          </section>
        )}

        <section className="place-detail-section">
          <div className="place-detail-section-title">Ubicación</div>
          <div className="place-detail-grid">
            {place.mapMode === "image" ? (
              <>
                <label className="place-detail-field">
                  <span className="text-xs">X en plano</span>
                  <input
                    type="number"
                    step="1"
                    className="input"
                    value={Math.round(place.mapX ?? 0)}
                    disabled={isReadOnlyHotel}
                    onChange={(e) =>
                      updatePlace(place.id, {
                        mapX: onNum(e.target.value, place.mapX),
                      })
                    }
                  />
                </label>
                <label className="place-detail-field">
                  <span className="text-xs">Y en plano</span>
                  <input
                    type="number"
                    step="1"
                    className="input"
                    value={Math.round(place.mapY ?? 0)}
                    disabled={isReadOnlyHotel}
                    onChange={(e) =>
                      updatePlace(place.id, {
                        mapY: onNum(e.target.value, place.mapY),
                      })
                    }
                  />
                </label>
              </>
            ) : (
              <>
                <label className="place-detail-field">
                  <span className="text-xs">Lat</span>
                  <input
                    type="number"
                    step="0.000001"
                    className="input"
                    value={place.lat ?? ""}
                    disabled={isReadOnlyHotel}
                    onChange={(e) =>
                      updatePlace(place.id, {
                        lat: onNum(e.target.value, place.lat),
                      })
                    }
                  />
                </label>
                <label className="place-detail-field">
                  <span className="text-xs">Lng</span>
                  <input
                    type="number"
                    step="0.000001"
                    className="input"
                    value={place.lng ?? ""}
                    disabled={isReadOnlyHotel}
                    onChange={(e) =>
                      updatePlace(place.id, {
                        lng: onNum(e.target.value, place.lng),
                      })
                    }
                  />
                </label>
              </>
            )}

            <label className="place-detail-field place-detail-field-wide">
              <span className="text-xs">Fuente URL</span>
              <input
                className="input"
                placeholder="https://..."
                value={place.sourceUrl || ""}
                disabled={isReadOnlyHotel}
                onChange={(e) =>
                  updatePlace(place.id, { sourceUrl: e.target.value })
                }
              />
            </label>
          </div>
        </section>

        {place.category === "restaurante" && (
          <section className="place-detail-section">
            <div className="place-detail-section-title">Menu</div>
            <div className="place-url-action-row">
              <label className="place-detail-field">
                <span className="text-xs">URL imagen del menu</span>
                <input
                  className="input"
                  placeholder="https://..."
                  value={place.menuImageUrl || ""}
                  onChange={(e) =>
                    updatePlace(place.id, { menuImageUrl: e.target.value })
                  }
                />
              </label>
              <button
                className="btn-outline"
                onClick={() => setMenuOpen(true)}
                disabled={!place.menuImageUrl}
                title={!place.menuImageUrl ? "Agrega primero una URL" : ""}
              >
                Ver menu
              </button>
            </div>
          </section>
        )}

        <section className="place-detail-section">
          <div className="place-detail-section-title">Notas</div>
          <label className="place-detail-field">
            <textarea
              className="input place-notes-input"
              placeholder="Notas, reservas, horarios especiales..."
              value={place.notes || ""}
              disabled={isReadOnlyHotel}
              onChange={(e) =>
                updatePlace(place.id, { notes: e.target.value })
              }
            />
          </label>
        </section>

        <section className="place-detail-section">
          <div className="place-detail-section-header">
            <div className="place-detail-section-title">Imágenes por URL</div>
            <span className="section-meta">
              {(place.images || []).length} imágenes
            </span>
          </div>

          <div className="place-image-add-row">
            <input
              className="input"
              placeholder="https://imagen.com/foto.jpg"
              value={imgUrl}
              disabled={isReadOnlyHotel}
              onChange={(e) => setImgUrl(e.target.value)}
            />
            <button
              className="btn"
              disabled={isReadOnlyHotel}
              onClick={addImageFromUrl}
            >
              Agregar URL
            </button>
          </div>

          {(place.images || []).length === 0 ? (
            <div className="empty-state text-xs">Sin imágenes aún.</div>
          ) : (
            <div className="place-image-list">
              {(place.images || []).map((img, i) => {
                const src = img.url || "";
                return (
                  <div key={`${src}-${i}`} className="place-image-row">
                    <div className="place-image-preview">
                      {src ? (
                        <img
                          src={src}
                          alt={img.name || `imagen ${i + 1}`}
                          onError={(e) => {
                            e.currentTarget.style.opacity = "0.18";
                          }}
                        />
                      ) : (
                        <span className="text-xs">Sin imagen</span>
                      )}
                    </div>

                    <div className="place-image-fields">
                      <input
                        className="input"
                        value={src}
                        placeholder="https://imagen.com/foto.jpg"
                        disabled={isReadOnlyHotel}
                        onChange={(e) =>
                          updateImage(i, { url: e.target.value })
                        }
                      />
                    </div>

                    <div className="place-image-actions">
                      {src && (
                        <a
                          className="btn-outline"
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir
                        </a>
                      )}
                      <button
                        className="btn-outline"
                        disabled={isReadOnlyHotel}
                        onClick={() => removeImage(i)}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {["restaurante", "tienda", "supermercado"].includes(place.category) && (
        <PlaceItemsEditor place={place} trip={trip} currentUser={currentUser} />
      )}

      {!isLockedAnchor && (
      <div className="place-danger-zone">
        <button
          className="btn-outline"
          onClick={async () => {
            const accepted = await confirm({
              title: "Eliminar punto",
              message: "Se quitará del itinerario, rutas incluidas.",
              confirmLabel: "Eliminar punto",
              tone: "danger",
            });
            if (accepted) {
              removePlace(place.id);
              setSelected(null);
            }
          }}
        >
          Eliminar punto
        </button>
      </div>
      )}

      {menuOpen && place.menuImageUrl && (
        <MenuImageModal
          url={place.menuImageUrl}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
