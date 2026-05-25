import { useMemo } from "react";
import { useItineraryStore } from "../hooks/useItineraryStore";

function fallbackDate(days, index = 0) {
  return days[index] || days[0] || new Date().toISOString().slice(0, 10);
}

const DEFAULT_HOTEL_TIME = "12:00";

export default function HotelsPanel() {
  const {
    places,
    days,
    addUnassignedPlace,
    updatePlace,
    removePlace,
  } = useItineraryStore();

  const hotels = useMemo(
    () =>
      places.filter(
        (place) => place.category === "hotel" && !place.hotelEndpointRole
      ),
    [places]
  );

  const handleAddHotel = () => {
    const checkInDate = fallbackDate(days, 0);
    const checkOutDate = fallbackDate(days, Math.max(0, days.length - 1));
    const id = addUnassignedPlace({
      name: "Nuevo hotel",
      category: "hotel",
      date: null,
      checkInDate,
      checkOutDate,
      checkInTime: DEFAULT_HOTEL_TIME,
      checkOutTime: DEFAULT_HOTEL_TIME,
      lat: 35.6804,
      lng: 139.769,
      durationMin: 0,
      notes: "",
    });
    return id;
  };

  return (
    <div className="list-panel hotels-panel" data-tour="hotels-panel">
      <div className="section-heading" data-tour="hotels-actions">
        <div>
          <h2 className="font-semibold">Hoteles</h2>
          <div className="text-xs">
            Bases del viaje para calcular cercania y punto de partida.
          </div>
        </div>
        <button className="btn" onClick={handleAddHotel} data-tour="hotels-add">
          + Hotel
        </button>
      </div>

      {!hotels.length ? (
        <div className="empty-state empty-state--rich" data-tour="hotels-list">
          <div className="empty-state-kicker">Base pendiente</div>
          <div className="font-medium">Agrega tu hotel o alojamiento</div>
          <div className="text-xs">
            Usa check-in/check-out y lat/lng para que el ordenador sepa desde
            donde conviene empezar cada dia.
          </div>
          <button className="btn-outline" onClick={handleAddHotel}>
            Agregar hotel
          </button>
        </div>
      ) : (
        <ul className="list scroll-list hotel-list" data-tour="hotels-list">
          {hotels.map((hotel) => (
            <li key={hotel.id} className="hotel-card">
              <div className="hotel-card-main">
                <span className="hotel-card-title">{hotel.name}</span>
                <span className="text-xs">
                  {hotel.checkInDate || "sin check-in"}{" "}
                  {hotel.checkInTime || DEFAULT_HOTEL_TIME} hasta{" "}
                  {hotel.checkOutDate || "sin check-out"}{" "}
                  {hotel.checkOutTime || DEFAULT_HOTEL_TIME}
                </span>
              </div>

              <div className="hotel-fields">
                <label>
                  <span className="text-xs">Nombre</span>
                  <input
                    className="input"
                    value={hotel.name || ""}
                    onChange={(event) =>
                      updatePlace(hotel.id, { name: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span className="text-xs">Check-in</span>
                  <input
                    className="input"
                    type="date"
                    value={hotel.checkInDate || ""}
                    onChange={(event) =>
                      updatePlace(hotel.id, {
                        checkInDate: event.target.value,
                        date: null,
                      })
                    }
                  />
                </label>
                <label>
                  <span className="text-xs">Check-out</span>
                  <input
                    className="input"
                    type="date"
                    value={hotel.checkOutDate || ""}
                    onChange={(event) =>
                      updatePlace(hotel.id, { checkOutDate: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span className="text-xs">Hora check-in</span>
                  <input
                    className="input"
                    type="time"
                    value={hotel.checkInTime || DEFAULT_HOTEL_TIME}
                    onChange={(event) =>
                      updatePlace(hotel.id, { checkInTime: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span className="text-xs">Hora check-out</span>
                  <input
                    className="input"
                    type="time"
                    value={hotel.checkOutTime || DEFAULT_HOTEL_TIME}
                    onChange={(event) =>
                      updatePlace(hotel.id, { checkOutTime: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span className="text-xs">Lat</span>
                  <input
                    className="input"
                    type="number"
                    step="0.000001"
                    value={hotel.lat ?? ""}
                    onChange={(event) =>
                      updatePlace(hotel.id, { lat: Number(event.target.value) })
                    }
                  />
                </label>
                <label>
                  <span className="text-xs">Lng</span>
                  <input
                    className="input"
                    type="number"
                    step="0.000001"
                    value={hotel.lng ?? ""}
                    onChange={(event) =>
                      updatePlace(hotel.id, { lng: Number(event.target.value) })
                    }
                  />
                </label>
              </div>

              <div className="hotel-actions">
                <button
                  className="btn-outline text-xs"
                  onClick={() => removePlace(hotel.id)}
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
