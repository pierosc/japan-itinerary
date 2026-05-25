import { useMemo } from "react";
import CategoryBadge from "./CategoryBadge";
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

function dateLabel(day, index, dayTitles = {}) {
  const title = (dayTitles?.[day] || "").trim();
  return title || `Día ${index + 1}`;
}

function formatJPY(value, currency) {
  const amount = Number(value) || 0;
  if (!amount) return "";
  return `JPY ${amount} (${formatConvertedJPY(amount, currency)})`;
}

function placeMeta(place, currency) {
  const pieces = [];
  if (place.startTime) pieces.push(place.startTime);
  if (place.durationMin != null) pieces.push(`${place.durationMin} min`);
  const cost = formatJPY(place.spendJPY, currency);
  if (cost) pieces.push(cost);
  return pieces.join(" · ");
}

function routeMeta(route, currency) {
  if (!route) return "Ruta sugerida";
  const pieces = [route.name || route.mode || "Ruta"];
  if (route.durationMin != null) pieces.push(`${route.durationMin} min`);
  const cost = formatJPY(route.priceJPY, currency);
  if (cost) pieces.push(cost);
  return pieces.join(" · ");
}

function uniqueSortedDates(data) {
  if (Array.isArray(data.days) && data.days.length) return data.days;
  return [
    ...new Set((data.places || []).map((place) => place.date).filter(Boolean)),
  ].sort();
}

function expenseTotal(expenses) {
  return (expenses || []).reduce(
    (sum, expense) => sum + (Number(expense.amountJPY) || 0),
    0
  );
}

function placeTotal(places, routes) {
  const placesTotal = (places || []).reduce(
    (sum, place) => sum + (Number(place.spendJPY) || 0),
    0
  );
  const routesTotal = (routes || []).reduce(
    (sum, route) => sum + (Number(route.priceJPY) || 0),
    0
  );
  return placesTotal + routesTotal;
}

function DetailList({ items, empty, renderItem }) {
  if (!items.length) return <div className="text-xs text-gray-600">{empty}</div>;
  return <ul className="public-detail-list">{items.map(renderItem)}</ul>;
}

export default function PublicTripPage({
  payload: providedPayload,
  onBack,
  onCopy,
  copyDisabled,
}) {
  const hashPayload = useMemo(readPublicPayload, []);
  const payload = providedPayload || hashPayload;

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
  const days = uniqueSortedDates(data);
  const places = data.places || [];
  const routes = data.routes || [];
  const expenses = data.expenses || [];
  const packingItems = data.packingItems || [];
  const dayTitles = data.dayTitles || {};
  const currency = data.currency || { code: "USD", ratePerJPY: 0.0065 };
  const hotels = places.filter(
    (place) => place.category === "hotel" && !place.hotelEndpointRole
  );
  const loosePlaces = places.filter(
    (place) => !place.date && place.category !== "hotel"
  );
  const totalJPY = placeTotal(places, routes) + expenseTotal(expenses);
  const coverImage = trip.coverImage || trip.imageUrl || "";

  return (
    <main className="public-page">
      {(onBack || onCopy) && (
        <div className="public-topbar">
          {onBack && (
            <button className="btn-outline" onClick={onBack}>
              Volver a Viajes públicos
            </button>
          )}
          {onCopy && (
            <button className="btn" onClick={onCopy} disabled={copyDisabled}>
              {copyDisabled ? "Copiando..." : "Copiar viaje"}
            </button>
          )}
        </div>
      )}

      <section
        className="public-hero"
        style={{
          backgroundImage: coverImage
            ? `linear-gradient(90deg, rgba(8,13,22,0.82), rgba(8,13,22,0.3)), url(${coverImage})`
            : undefined,
        }}
      >
        <div>
          <div className="empty-state-kicker">Itinerario público</div>
          <h1>{trip.title || "Viaje"}</h1>
          <p>{trip.destination || data.country || "Japan"}</p>
        </div>
      </section>

      <section className="public-summary">
        <div>
          <strong>{days.length}</strong>
          <span>días</span>
        </div>
        <div>
          <strong>{places.length}</strong>
          <span>lugares</span>
        </div>
        <div>
          <strong>{routes.length}</strong>
          <span>rutas</span>
        </div>
        <div>
          <strong>{formatConvertedJPY(totalJPY, currency)}</strong>
          <span>estimado</span>
        </div>
      </section>

      <section className="public-days">
        {days.map((day, index) => {
          const dayPlaces = places.filter((place) => place.date === day);
          const dayRoutes = routes.filter((route) => route.date === day);
          const dayExpenses = expenses.filter((expense) => expense.date === day);
          const total =
            placeTotal(dayPlaces, dayRoutes) + expenseTotal(dayExpenses);

          return (
            <article key={day} className="public-day">
              <div className="public-day-header">
                <div>
                  <h2>{dateLabel(day, index, dayTitles)}</h2>
                  <p className="text-xs">{day}</p>
                </div>
                <span className="chip">{formatConvertedJPY(total, currency)}</span>
              </div>

              <ol className="public-place-list">
                {dayPlaces.map((place, placeIndex) => {
                  const next = dayPlaces[placeIndex + 1];
                  const route = next
                    ? dayRoutes.find(
                        (candidate) =>
                          candidate.fromId === place.id &&
                          candidate.toId === next.id
                      )
                    : null;

                  return (
                    <li key={place.id}>
                      <div className="public-place-card">
                        <div className="public-place-title">
                          <strong>{place.name || "Lugar sin nombre"}</strong>
                          <CategoryBadge category={place.category || "otro"} />
                        </div>
                        {placeMeta(place, currency) && (
                          <div className="text-xs">
                            {placeMeta(place, currency)}
                          </div>
                        )}
                        {place.notes && (
                          <p className="public-place-note">{place.notes}</p>
                        )}
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
                        {(place.images || []).length > 0 && (
                          <div className="public-image-strip">
                            {(place.images || []).slice(0, 4).map((image, i) => (
                              <img
                                key={`${image.url}-${i}`}
                                src={image.url}
                                alt={image.name || place.name || "Imagen"}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {next && (
                        <div className="public-route-line">
                          <span>{routeMeta(route, currency)}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>

              {!dayPlaces.length && (
                <div className="empty-state text-xs">
                  Este día no tiene puntos publicados.
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="public-extra-grid">
        <article className="public-extra-card">
          <h2>Hoteles</h2>
          <DetailList
            items={hotels}
            empty="No hay hoteles publicados."
            renderItem={(hotel) => (
              <li key={hotel.id}>
                <strong>{hotel.name || "Hotel"}</strong>
                <span>
                  {hotel.checkInDate || "sin check-in"} a{" "}
                  {hotel.checkOutDate || "sin check-out"}
                </span>
              </li>
            )}
          />
        </article>

        <article className="public-extra-card">
          <h2>My Places</h2>
          <DetailList
            items={loosePlaces}
            empty="No hay lugares sin día asignado."
            renderItem={(place) => (
              <li key={place.id}>
                <strong>{place.name || "Lugar"}</strong>
                <span>{place.category || "otro"}</span>
              </li>
            )}
          />
        </article>

        <article className="public-extra-card">
          <h2>Gastos</h2>
          <DetailList
            items={expenses}
            empty="No hay gastos publicados."
            renderItem={(expense) => (
              <li key={expense.id}>
                <strong>{expense.title || "Gasto"}</strong>
                <span>{formatJPY(expense.amountJPY, currency) || "Sin monto"}</span>
              </li>
            )}
          />
        </article>

        <article className="public-extra-card">
          <h2>Packing list</h2>
          <DetailList
            items={packingItems}
            empty="No hay packing list publicado."
            renderItem={(item) => (
              <li key={item.id}>
                <strong>{item.label || "Item"}</strong>
                <span>{item.done ? "Listo" : "Pendiente"}</span>
              </li>
            )}
          />
        </article>
      </section>
    </main>
  );
}
