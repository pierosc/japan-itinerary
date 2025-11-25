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
    // Coordenadas por defecto (Tokio) / ajusta a lo que quieras
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
    setShowMap(false); // abre ficha/edición a la izquierda
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">My places</h2>
        <button className="btn" onClick={handleAdd}>
          + Añadir lugar
        </button>
      </div>

      {!pool.length && (
        <p className="text-xs text-gray-600">
          No tienes lugares sueltos. Crea nuevos con el botón “Añadir lugar”.
        </p>
      )}

      {pool.length > 0 && (
        <>
          <p className="text-xs text-gray-600 mb-2">
            Haz click en un lugar para editarlo en el panel izquierdo. Cuando
            tengas claro el día, usa “Enviar al día actual”. El día actual se
            selecciona en la pestaña <strong>Itinerario</strong>.
          </p>

          <ul className="list">
            {pool.map((p) => (
              <li key={p.id} className="item">
                <div className="flex justify-between gap-2">
                  {/* Card clickable -> abre edición a la izquierda */}
                  <div
                    style={{ cursor: "pointer", flex: 1 }}
                    onClick={() => {
                      setSelected(p.id);
                      setShowMap(false);
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{p.name}</span>
                      <CategoryBadge category={p.category || "otro"} />
                    </div>
                    <div className="text-xs">
                      {p.notes ? p.notes.slice(0, 60) : "Sin notas"}
                    </div>
                  </div>

                  {/* Botón para mandarlo al día actual */}
                  <div className="flex flex-col items-end gap-1">
                    <button
                      className="btn-outline text-xs"
                      onClick={() => handleAssignToCurrentDay(p.id)}
                    >
                      Enviar al día actual
                    </button>
                    {days.length > 0 && (
                      <span className="text-[10px] text-gray-600">
                        Día actual: {selectedDate}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
