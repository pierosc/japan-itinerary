// src/components/TripCard.jsx

function computeTripSummaryFromData(data) {
  const days = Array.isArray(data?.days) ? data.days.length : 0;
  const places = Array.isArray(data?.places) ? data.places.length : 0;

  const placesJPY = Array.isArray(data?.places)
    ? data.places.reduce((acc, p) => acc + (Number(p?.spendJPY) || 0), 0)
    : 0;
  const routesJPY = Array.isArray(data?.routes)
    ? data.routes.reduce((acc, r) => acc + (Number(r?.priceJPY) || 0), 0)
    : 0;
  const expensesJPY = Array.isArray(data?.expenses)
    ? data.expenses.reduce((acc, e) => acc + (Number(e?.amountJPY) || 0), 0)
    : 0;
  const spendJPY = placesJPY + routesJPY + expensesJPY;

  const rate = Number(data?.currency?.ratePerJPY) || 0;
  const currencyCode = data?.currency?.code || "USD";
  const spendConverted = rate ? spendJPY * rate : null;

  // packing list en tu store es packingItems
  const packing = Array.isArray(data?.packingItems)
    ? data.packingItems.length
    : 0;

  return { days, places, packing, spendJPY, spendConverted, currencyCode };
}

export default function TripCard({ trip, onClick }) {
  const summary = computeTripSummaryFromData(trip.data);

  return (
    <button className="trip-card" onClick={onClick}>
      <div className="trip-card-image-wrapper">
        {trip.coverImage ? (
          <img
            src={trip.coverImage}
            alt={trip.title}
            className="trip-card-image"
          />
        ) : (
          <div className="trip-card-image trip-card-image--placeholder">
            <span>Sin imagen</span>
          </div>
        )}
      </div>

      <div className="trip-card-body">
        <h3 className="trip-card-title">{trip.title}</h3>

        <div className="trip-card-meta">
          <span>🗓 {summary.days} días</span>
          <span>📍 {summary.places} lugares</span>
          <span>🎒 {summary.packing} items</span>
          {summary.spendConverted !== null && (
            <span>
              💸 {summary.currencyCode} {summary.spendConverted.toFixed(0)}
            </span>
          )}
        </div>

        {trip.destination && (
          <span className="chip mt-1">{trip.destination}</span>
        )}
      </div>
    </button>
  );
}
