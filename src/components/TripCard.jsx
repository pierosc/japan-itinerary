// src/components/TripCard.jsx
export default function TripCard({ trip, onClick }) {
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
        {trip.subtitle && <p className="trip-card-subtitle">{trip.subtitle}</p>}
        {trip.destination && (
          <span className="chip mt-1">{trip.destination}</span>
        )}
      </div>
    </button>
  );
}
