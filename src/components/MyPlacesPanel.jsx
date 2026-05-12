// src/components/MyPlacesPanel.jsx
import { useItineraryStore } from "../hooks/useItineraryStore";
import CategoryBadge from "./CategoryBadge";

export default function MyPlacesPanel() {
  const {
    unassignedPlaces,
    addUnassignedPlace,
    assignPlaceToDay,
    days,
    selectedDate,
    setSelected,
    setSelectedDate,
    setShowMap,
  } = useItineraryStore();

  const pool = unassignedPlaces();

  const handleAdd = () => {
    addUnassignedPlace({
      name: "Nuevo lugar",
      category: "otro",
      lat: 35.6804,
      lng: 139.769,
      notes: "",
      startTime: "",
      durationMin: 60,
      spendJPY: 0,
      priceRange: "",
      sourceUrl: "",
    });
  };

  const handleAssignToCurrentDay = (placeId) => {
    if (!selectedDate) {
      alert("Primero selecciona un día en la pestaña Itinerario.");
      return;
    }
    assignPlaceToDay(placeId, selectedDate);
    setSelectedDate(selectedDate);
    setSelected(placeId);
    setShowMap(false);
  };

  return (
    <div className="list-panel my-places-panel">
      <div className="section-heading">
        <div>
          <h2 className="font-semibold">My places</h2>
          <div className="text-xs">
            {pool.length} lugar/es sin día asignado
          </div>
        </div>
        <button className="btn" onClick={handleAdd}>
          + Añadir lugar
        </button>
      </div>

      {!pool.length ? (
        <div className="empty-state">
          <div className="font-medium">No tienes lugares sueltos</div>
          <div className="text-xs">
            Guarda aquí ideas, hoteles, tiendas o restaurantes antes de
            asignarlos a un día.
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-600">
            Click para editar. Usa el botón de cada tarjeta para moverlo al día
            actual del itinerario.
          </p>

          <ul className="list scroll-list my-places-list">
            {pool.map((p) => (
              <li key={p.id} className="my-place-card">
                <button
                  className="my-place-main"
                  onClick={() => {
                    setSelected(p.id);
                    setShowMap(false);
                  }}
                >
                  <div className="my-place-title-row">
                    <span className="my-place-title">{p.name}</span>
                    <CategoryBadge category={p.category || "otro"} />
                  </div>
                  <div className="my-place-meta">
                    {p.notes ? p.notes.slice(0, 90) : "Sin notas"}
                  </div>
                </button>

                <div className="my-place-actions">
                  {days.length > 0 && (
                    <span className="my-place-date">Día actual: {selectedDate}</span>
                  )}
                  <button
                    className="btn-outline text-xs"
                    onClick={() => handleAssignToCurrentDay(p.id)}
                  >
                    Enviar al día
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
