import { useItineraryStore } from "../hooks/useItineraryStore";
import CategoryBadge from "./CategoryBadge";
import { useFeedback } from "./ui/FeedbackProvider";

export default function MyPlacesPanel() {
  const { toast } = useFeedback();
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

  const pool = unassignedPlaces().filter((place) => place.category !== "hotel");

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
      toast({
        title: "Selecciona un día",
        message: "Elige un día en Itinerario antes de mover lugares.",
        tone: "warning",
      });
      return;
    }

    assignPlaceToDay(placeId, selectedDate);
    setSelectedDate(selectedDate);
    setSelected(placeId);
    setShowMap(false);
    toast({ title: "Lugar enviado al día", tone: "success" });
  };

  return (
    <div className="list-panel my-places-panel" data-tour="myplaces-panel">
      <div className="section-heading" data-tour="myplaces-actions">
        <div>
          <h2 className="font-semibold">My places</h2>
          <div className="text-xs">{pool.length} lugar/es sin día asignado</div>
        </div>
        <button className="btn" onClick={handleAdd} data-tour="myplaces-add">
          + Añadir lugar
        </button>
      </div>

      {!pool.length ? (
        <div className="empty-state empty-state--rich" data-tour="myplaces-list">
          <div className="empty-state-kicker">Ideas pendientes</div>
          <div className="font-medium">No tienes lugares sueltos</div>
          <div className="text-xs">
            Guarda aquí restaurantes, tiendas, hoteles o links que todavía no
            quieres poner en un día concreto.
          </div>
          <button className="btn-outline" onClick={handleAdd}>
            Añadir primer lugar
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-600">
            Click para editar. Usa el botón de cada tarjeta para moverlo al día
            actual del itinerario.
          </p>

          <ul className="list scroll-list my-places-list" data-tour="myplaces-list">
            {pool.map((place) => (
              <li key={place.id} className="my-place-card">
                <button
                  className="my-place-main"
                  onClick={() => {
                    setSelected(place.id);
                    setShowMap(false);
                  }}
                >
                  <div className="my-place-title-row">
                    <span className="my-place-title">{place.name}</span>
                    <CategoryBadge category={place.category || "otro"} />
                  </div>
                  <div className="my-place-meta">
                    {place.notes ? place.notes.slice(0, 90) : "Sin notas"}
                  </div>
                </button>

                <div className="my-place-actions">
                  {days.length > 0 && (
                    <span className="my-place-date">Día actual: {selectedDate}</span>
                  )}
                  <button
                    className="btn-outline text-xs"
                    onClick={() => handleAssignToCurrentDay(place.id)}
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
