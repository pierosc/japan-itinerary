function computeTripSummaryFromData(data) {
  const days = Array.isArray(data?.days) ? data.days.length : 0;
  const places = Array.isArray(data?.places) ? data.places.length : 0;

  const placesJPY = Array.isArray(data?.places)
    ? data.places.reduce((acc, place) => acc + (Number(place?.spendJPY) || 0), 0)
    : 0;
  const routesJPY = Array.isArray(data?.routes)
    ? data.routes.reduce((acc, route) => acc + (Number(route?.priceJPY) || 0), 0)
    : 0;
  const expensesJPY = Array.isArray(data?.expenses)
    ? data.expenses.reduce(
        (acc, expense) => acc + (Number(expense?.amountJPY) || 0),
        0
      )
    : 0;

  const spendJPY = placesJPY + routesJPY + expensesJPY;
  const rate = Number(data?.currency?.ratePerJPY) || 0;
  const currencyCode = data?.currency?.code || "USD";
  const spendConverted = rate ? spendJPY * rate : null;
  const packing = Array.isArray(data?.packingItems) ? data.packingItems.length : 0;

  return { days, places, packing, spendConverted, currencyCode };
}

export default function TripCard({
  trip,
  onClick,
  onDuplicate,
  duplicateDisabled,
  badgeLabel,
  duplicateTitle = "Duplicar viaje",
}) {
  const summary = computeTripSummaryFromData(trip.data);
  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      className="trip-card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
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
        <div className="trip-card-bottom-actions">
          <button
            type="button"
            className="trip-card-icon-action"
            disabled={duplicateDisabled}
            title={duplicateTitle}
            aria-label={duplicateTitle}
            onClick={(event) => {
              event.stopPropagation();
              onDuplicate?.(trip);
            }}
          >
            <span className="trip-card-copy-icon" aria-hidden="true" />
          </button>
        </div>

        {(badgeLabel || trip.isPublic) && (
          <div className="trip-card-badges">
            <span className="chip">{badgeLabel || "Público"}</span>
          </div>
        )}

        <h3 className="trip-card-title">{trip.title}</h3>

        <div className="trip-card-meta">
          <span>{summary.days} dias</span>
          <span>{summary.places} lugares</span>
          <span>{summary.packing} items</span>
          {summary.spendConverted !== null && (
            <span>
              {summary.currencyCode} {summary.spendConverted.toFixed(0)}
            </span>
          )}
        </div>

        {trip.destination && <span className="chip mt-1">{trip.destination}</span>}
      </div>
    </div>
  );
}
