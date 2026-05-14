import { useMemo } from "react";
import { formatConvertedJPY } from "../utils/money";

function readPublicPayload() {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#public=")) return null;
  try {
    return JSON.parse(decodeURIComponent(atob(hash.slice("#public=".length))));
  } catch {
    return null;
  }
}

export default function PublicTripPage() {
  const payload = useMemo(readPublicPayload, []);

  if (!payload) {
    return (
      <main className="public-page">
        <section className="public-hero">
          <h1>Link no válido</h1>
          <p>Este itinerario público no se pudo leer.</p>
        </section>
      </main>
    );
  }

  const trip = payload.trip || {};
  const data = payload.data || {};
  const days = data.days || [];
  const places = data.places || [];
  const currency = data.currency || { code: "USD", ratePerJPY: 0.0065 };

  return (
    <main className="public-page">
      <section
        className="public-hero"
        style={{
          backgroundImage: trip.coverImage
            ? `linear-gradient(90deg, rgba(8,13,22,0.82), rgba(8,13,22,0.3)), url(${trip.coverImage})`
            : undefined,
        }}
      >
        <div>
          <div className="empty-state-kicker">Itinerario público</div>
          <h1>{trip.title || "Viaje"}</h1>
          <p>{trip.destination || data.country || "Japan"}</p>
        </div>
      </section>

      <section className="public-days">
        {days.map((day, index) => {
          const dayPlaces = places.filter((place) => place.date === day);
          const total = dayPlaces.reduce(
            (sum, place) => sum + (Number(place.spendJPY) || 0),
            0
          );

          return (
            <article key={day} className="public-day">
              <div className="public-day-header">
                <div>
                  <h2>Día {index + 1}</h2>
                  <p className="text-xs">{day}</p>
                </div>
                <span className="chip">
                  {formatConvertedJPY(total, currency)}
                </span>
              </div>
              <ol className="public-place-list">
                {dayPlaces.map((place) => (
                  <li key={place.id}>
                    <strong>{place.name}</strong>
                    <span>{place.category || "otro"}</span>
                  </li>
                ))}
              </ol>
            </article>
          );
        })}
      </section>
    </main>
  );
}
