import { useMemo } from "react";
import { useItineraryStore } from "../hooks/useItineraryStore";
import { formatConvertedJPY } from "../utils/money";

function minutesFromTime(value, fallback) {
  if (!value) return fallback;
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour)) return fallback;
  return hour * 60 + (Number.isFinite(minute) ? minute : 0);
}

function timeFromMinutes(value) {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export default function TimelinePanel() {
  const {
    selectedDate,
    placesBySelectedDate,
    routesBySelectedDate,
    setSelected,
    setShowMap,
    currency,
  } = useItineraryStore();

  const places = placesBySelectedDate();
  const routes = routesBySelectedDate();

  const items = useMemo(() => {
    let cursor = 9 * 60;
    return places.map((place, index) => {
      const start = minutesFromTime(place.startTime, cursor);
      const duration = Number(place.durationMin) || 60;
      const route = routes.find((candidate) => candidate.fromId === place.id);
      cursor = start + duration + (Number(route?.durationMin) || 20);

      return {
        place,
        index,
        start,
        end: start + duration,
        route,
      };
    });
  }, [places, routes]);

  return (
    <div className="timeline-panel">
      <div className="section-heading">
        <div>
          <h2 className="font-semibold">Timeline diario</h2>
          <div className="text-xs">{selectedDate}</div>
        </div>
        <span className="section-meta">{items.length} bloques</span>
      </div>

      {!items.length ? (
        <div className="empty-state empty-state--rich">
          <div className="empty-state-kicker">Agenda visual</div>
          <div className="font-medium">Sin bloques todavía</div>
          <div className="text-xs">
            Añade lugares al día para ver horarios, gastos y traslados.
          </div>
        </div>
      ) : (
        <ol className="timeline-list">
          {items.map(({ place, index, start, end, route }) => (
            <li key={place.id} className="timeline-item">
              <div className="timeline-time">
                <span>{timeFromMinutes(start)}</span>
                <span>{timeFromMinutes(end)}</span>
              </div>
              <button
                className="timeline-card"
                onClick={() => {
                  setSelected(place.id);
                  setShowMap(false);
                }}
              >
                <div className="timeline-index">{index + 1}</div>
                <div>
                  <div className="font-medium">{place.name}</div>
                  <div className="text-xs">
                    {place.category || "otro"} · {place.durationMin || 60} min
                  </div>
                  {Number(place.spendJPY) > 0 && (
                    <div className="text-xs">
                      JPY {place.spendJPY} ·{" "}
                      {formatConvertedJPY(place.spendJPY, currency)}
                    </div>
                  )}
                  {route && (
                    <div className="timeline-route text-xs">
                      Traslado: {route.mode || "walk"} ·{" "}
                      {route.durationMin ? `${route.durationMin} min` : "estimado"}
                    </div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
