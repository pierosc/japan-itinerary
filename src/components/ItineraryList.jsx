import { useMemo } from "react";
import { useItineraryStore } from "../hooks/useItineraryStore";
import { haversineKm } from "../utils/geo";
import CategoryBadge from "./CategoryBadge";

function etaMins(distanceKm, speedKmh) {
  if (!speedKmh || speedKmh <= 0) return null;
  return Math.round((distanceKm / speedKmh) * 60);
}

export default function ItineraryList() {
  const {
    placesBySelectedDate,
    setSelected,
    selectedId,
    speedsKmh,
    addPlace,
    setShowMap,
  } = useItineraryStore();
  const places = placesBySelectedDate();

  const rows = useMemo(() => {
    const r = [];
    for (let i = 0; i < places.length; i++) {
      const cur = places[i];
      const next = places[i + 1];
      let travel = null;
      if (next) {
        const dist = haversineKm(cur, next);
        const spd = speedsKmh[cur.modeToNext || "walk"];
        travel = {
          to: next.name,
          km: dist,
          mode: cur.modeToNext || "walk",
          minutes: etaMins(dist, spd),
        };
      }
      r.push({ place: cur, travel });
    }
    return r;
  }, [places, speedsKmh]);

  return (
    <>
      <div
        className="flex"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <h2 className="font-semibold">Itinerario</h2>
        <button
          className="btn"
          onClick={() => {
            // centro de Tokio por defecto
            addPlace({
              name: "Nuevo punto",
              category: "otro",
              lat: 35.6804,
              lng: 139.769,
              notes: "",
            });
          }}
        >
          + Añadir punto
        </button>
      </div>

      <ol className="list">
        {rows.map(({ place, travel }, idx) => (
          <li
            key={place.id}
            className={`item ${selectedId === place.id ? "active" : ""}`}
            onClick={() => {
              setSelected(place.id);
              setShowMap(false);
            }}
          >
            <div
              className="flex"
              style={{ justifyContent: "space-between", alignItems: "center" }}
            >
              <div className="font-medium">
                {idx + 1}. {place.name}
              </div>
              <CategoryBadge category={place.category} />
            </div>
            <div className="text-xs">
              {place.startTime ? `Inicio: ${place.startTime} · ` : ""}Estancia:{" "}
              {place.durationMin ?? 60} min
              {place.priceRange ? ` · Precio: ${place.priceRange}` : ""}
              {typeof place.spendJPY === "number"
                ? ` · Gasto: ¥${place.spendJPY}`
                : ""}
            </div>
            {place.sourceUrl && (
              <a
                className="text-xs text-blue-600"
                href={place.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Ver fuente
              </a>
            )}
            {travel && (
              <div className="mt-2 text-xs">
                → {travel.to} ({travel.km.toFixed(1)} km, {travel.mode}
                {typeof travel.minutes === "number"
                  ? `, ~${travel.minutes} min`
                  : ""}
                )
              </div>
            )}
          </li>
        ))}
        {!rows.length && (
          <li className="item text-xs">
            Sin puntos en este día. Haz click en el mapa o usa “Añadir punto”.
          </li>
        )}
      </ol>
    </>
  );
}
