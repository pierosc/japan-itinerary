import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useItineraryStore } from "../hooks/useItineraryStore";
import { haversineKm } from "../utils/geo";
import { formatConvertedJPY } from "../utils/money";
import { buildIntelligentTripPlan } from "../utils/travelPlanning";
import CategoryBadge from "./CategoryBadge";
import SortableItemWithHandle from "./dnd/SortableItemWithHandle";
import { useFeedback } from "./ui/FeedbackProvider";

const MODE_LABEL = { walk: "A pie", train: "Tren", car: "Auto" };

export default function ItineraryList() {
  const { toast } = useFeedback();
  const {
    placesBySelectedDate,
    setSelected,
    selectedId,
    addPlace,
    speedsKmh,
    selectedDate,
    reorderPlacesForDate,
    routesBySelectedDate,
    removeRoute,
    updateRoute,
    setShowMap,
    ui,
    dayMaps,
    unassignedPlaces,
    assignPlaceToDay,
    updatePlace,
    places,
    unassignPlace,
    duplicatePlace,
    currency,
    days,
    smartTripPreviewPlan,
  } = useItineraryStore();

  const [editingRoute, setEditingRoute] = useState(null);
  const [selectedLooseId, setSelectedLooseId] = useState("");

  const placesForDay = placesBySelectedDate().filter(
    (place) => place.category !== "hotel"
  );
  const routes = routesBySelectedDate();
  const pool = unassignedPlaces();
  const hasImageMap = Boolean(dayMaps?.[selectedDate]?.imageUrl);
  const canAddLoose = Boolean(selectedDate) && Boolean(selectedLooseId);
  const smartPlan = useMemo(
    () => buildIntelligentTripPlan(places, days),
    [places, days]
  );
  const activeSmartPlan = smartTripPreviewPlan || smartPlan;
  const previewPlacesForDay = useMemo(() => {
    if (!smartTripPreviewPlan) return placesForDay;
    const byId = new Map(places.map((place) => [place.id, place]));
    const dayPlan = smartTripPreviewPlan.dayPlans.find(
      (candidate) => candidate.date === selectedDate
    );
    return (dayPlan?.orderedIds || []).map((id) => byId.get(id)).filter(Boolean);
  }, [places, placesForDay, selectedDate, smartTripPreviewPlan]);
  const visibleSmartWarnings = useMemo(
    () =>
      activeSmartPlan.warnings.filter(
        (warning) => !warning.date || warning.date === selectedDate
      ),
    [activeSmartPlan.warnings, selectedDate]
  );
  const hasSmartPreview = Boolean(smartTripPreviewPlan);
  const selectedPreviewSummary = smartTripPreviewPlan?.dayPlans.find(
    (day) => day.date === selectedDate
  );

  useEffect(() => {
    if (selectedLooseId) return;
    places
      .filter((place) => place.previewDate)
      .forEach((place) => updatePlace(place.id, { previewDate: null }));
  }, [places, selectedLooseId, updatePlace]);

  const blocks = useMemo(() => {
    const output = [];
    for (let index = 0; index < previewPlacesForDay.length; index += 1) {
      const current = previewPlacesForDay[index];
      const next = previewPlacesForDay[index + 1];
      output.push({ kind: "place", place: current });
      if (next) {
        const route =
          routes.find(
            (candidate) =>
              candidate.fromId === current.id && candidate.toId === next.id
          ) || null;
        output.push({ kind: "route", from: current, to: next, route });
      }
    }
    return output;
  }, [previewPlacesForDay, routes]);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));
  const idsForDnd = previewPlacesForDay.map((place) => place.id);
  const numFor = (placeId) => idsForDnd.indexOf(placeId) + 1;

  function handleAddLooseToDay() {
    if (!selectedDate) {
      toast({
        title: "Selecciona un día",
        message: "Elige un día antes de agregar lugares al itinerario.",
        tone: "warning",
      });
      return;
    }
    if (!selectedLooseId) return;

    assignPlaceToDay(selectedLooseId, selectedDate);
    updatePlace(selectedLooseId, { previewDate: null });
    setSelected(selectedLooseId);
    setShowMap(false);
    setSelectedLooseId("");
    toast({ title: "Lugar agregado al itinerario", tone: "success" });
  }

  function handleLoosePreview(id) {
    setSelectedLooseId(id);
    places
      .filter((place) => place.previewDate)
      .forEach((place) => updatePlace(place.id, { previewDate: null }));

    if (!id) {
      setSelected(null);
      return;
    }

    const place = pool.find((candidate) => candidate.id === id);
    if (place && !place.date) updatePlace(id, { previewDate: selectedDate });
    setSelected(id);
    setShowMap(true);
  }

  function onDragEnd(event) {
    if (hasSmartPreview) {
      toast({
        title: "Estas viendo una propuesta",
        message: "Acepta o descarta la propuesta antes de arrastrar puntos.",
        tone: "warning",
      });
      return;
    }

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = idsForDnd.indexOf(active.id);
    const newIndex = idsForDnd.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    reorderPlacesForDate(selectedDate, arrayMove(idsForDnd, oldIndex, newIndex));
  }

  function distMins(from, to, mode) {
    if (from.mapMode === "image" || to.mapMode === "image") {
      const dx = Number(from.mapX) - Number(to.mapX);
      const dy = Number(from.mapY) - Number(to.mapY);
      return `${Math.round(Math.sqrt(dx * dx + dy * dy))} px en el plano`;
    }

    const distance = haversineKm(from, to);
    const speed = speedsKmh[mode] || speedsKmh.walk;
    const minutes = Math.round((distance / speed) * 60);
    return `${distance.toFixed(1)} km - ${minutes} min`;
  }

  async function createRouteBetween(fromId, toId, mode = "walk") {
    const from = placesForDay.find((place) => place.id === fromId);
    const to = placesForDay.find((place) => place.id === toId);
    if (!from || !to) return;

    let geojson = null;
    if (from.mapMode !== "image" && to.mapMode !== "image" && mode !== "train") {
      try {
        const profile = mode === "walk" ? "foot" : "driving";
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
        );
        const data = await response.json();
        const coords = data.routes?.[0]?.geometry?.coordinates || [];
        geojson = coords.map(([lng, lat]) => [lat, lng]);
      } catch (error) {
        console.error("Error creando ruta OSRM", error);
      }
    }

    const { addRouteBetween } = useItineraryStore.getState();
    addRouteBetween(selectedDate, fromId, toId, mode, geojson);

    const newRoute = useItineraryStore
      .getState()
      .routesBySelectedDate()
      .find((route) => route.fromId === fromId && route.toId === toId);
    if (newRoute) setEditingRoute(newRoute.id);
  }

  function RouteLine({ from, to, route }) {
    return (
      <li aria-label="route-line" style={{ listStyle: "none", margin: "6px 0" }}>
        <div className="route-line">
          <span className="text-xs">{route ? MODE_LABEL[route.mode] : ""}</span>
          <div className="route-line-rule" />
          <span className="text-xs">
            {route
              ? `${route.name || `Ruta ${MODE_LABEL[route.mode]}`} - ${distMins(
                  from,
                  to,
                  route.mode
                )}`
              : distMins(from, to, "walk")}
          </span>
          <div className="route-line-actions">
            {!route ? (
              <button
                className="btn-outline"
                onClick={() => createRouteBetween(from.id, to.id, "walk")}
              >
                Añadir ruta
              </button>
            ) : (
              <>
                {route.priceJPY != null && (
                  <span className="text-xs">
                    JPY {route.priceJPY} (
                    {formatConvertedJPY(route.priceJPY, currency)})
                  </span>
                )}
                {route.durationMin != null && (
                  <span className="text-xs">- {route.durationMin} min</span>
                )}
                <button
                  className="btn-outline"
                  title="Editar ruta"
                  onClick={() => setEditingRoute(route.id)}
                >
                  Editar
                </button>
                <button
                  className="btn-outline"
                  title="Eliminar ruta"
                  onClick={() => removeRoute(route.id)}
                >
                  Quitar
                </button>
              </>
            )}
          </div>
        </div>

        {route && editingRoute === route.id && (
          <div className="card route-editor">
            <label>
              <span className="text-xs">Nombre</span>
              <input
                className="input"
                value={route.name || ""}
                onChange={(event) =>
                  updateRoute(route.id, { name: event.target.value })
                }
                placeholder="p. ej. Yamanote"
              />
            </label>
            <label>
              <span className="text-xs">Transporte</span>
              <select
                className="input"
                value={route.mode || "walk"}
                onChange={(event) =>
                  updateRoute(route.id, { mode: event.target.value })
                }
              >
                <option value="walk">a pie</option>
                <option value="car">auto</option>
                <option value="train">tren</option>
              </select>
            </label>
            <label>
              <span className="text-xs">Duración (min)</span>
              <input
                type="number"
                className="input"
                value={route.durationMin ?? ""}
                onChange={(event) =>
                  updateRoute(route.id, {
                    durationMin: Number(event.target.value) || 0,
                  })
                }
              />
            </label>
            <label>
              <span className="text-xs">Precio (JPY)</span>
              <input
                type="number"
                className="input"
                value={route.priceJPY ?? ""}
                onChange={(event) =>
                  updateRoute(route.id, {
                    priceJPY: Number(event.target.value) || 0,
                  })
                }
              />
            </label>
            <button className="btn" onClick={() => setEditingRoute(null)}>
              Listo
            </button>
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="list-panel">
      <div className="section-heading">
        <h2 className="font-semibold">Itinerario</h2>
        <button
          className="btn"
          onClick={() =>
            addPlace({
              name: hasImageMap ? "Nuevo pin" : "Nuevo punto",
              category: hasImageMap ? "atraccion" : "otro",
              ...(hasImageMap
                ? {
                    mapMode: "image",
                    mapX: (dayMaps[selectedDate]?.width || 1600) / 2,
                    mapY: (dayMaps[selectedDate]?.height || 1000) / 2,
                  }
                : { lat: 35.6804, lng: 139.769 }),
              notes: "",
            })
          }
        >
          + Añadir punto
        </button>
      </div>

      <div className="inline-add-panel">
        <div className="inline-add-row">
          <select
            className="input"
            value={selectedLooseId}
            onChange={(event) => handleLoosePreview(event.target.value)}
          >
            <option value="">Selecciona un lugar de My Places</option>
            {pool.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name}
              </option>
            ))}
          </select>
          <button
            className="btn-outline text-xs"
            disabled={!canAddLoose}
            onClick={handleAddLooseToDay}
          >
            Agregar al día
          </button>
        </div>
      </div>

      <div className="smart-order-panel">
        <div className="smart-order-header">
          <div>
            <div className="font-medium">Diagnostico del dia</div>
            <div className="text-xs">
              Avisos del dia seleccionado. La reorganizacion global esta en la
              barra superior.
            </div>
          </div>
        </div>

        {hasSmartPreview && (
          <div className="smart-preview-note text-xs">
            Vista previa activa: estas viendo la propuesta para este dia; aun no
            se guardo.
          </div>
        )}

        {selectedPreviewSummary && (
          <div className="smart-day-summary">
            <span className="chip">
              {selectedPreviewSummary.orderedIds.length} puntos
            </span>
            <span className="chip">
              {Math.round(selectedPreviewSummary.totalMinutes / 60)} h aprox.
            </span>
            <span className="chip">
              {selectedPreviewSummary.transitMinutes} min traslado
            </span>
          </div>
        )}

        {visibleSmartWarnings.length > 0 && (
          <ul className="smart-warning-list">
            {visibleSmartWarnings.map((warning, index) => (
              <li
                key={`${warning.text}-${index}`}
                className={`smart-warning smart-warning--${warning.tone}`}
              >
                {warning.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={idsForDnd}
          strategy={verticalListSortingStrategy}
        >
          <ol className="list scroll-list">
            {blocks.map((block) => {
              if (block.kind === "route") {
                return (
                  <RouteLine
                    key={
                      block.route
                        ? block.route.id
                        : `missing-${block.from.id}-${block.to.id}`
                    }
                    from={block.from}
                    to={block.to}
                    route={block.route}
                  />
                );
              }

              const place = block.place;
              return (
                <SortableItemWithHandle id={place.id} key={place.id}>
                  {({ setNodeRef, style, handleProps }) => (
                    <li ref={setNodeRef} style={{ ...style, listStyle: "none" }}>
                      <div
                        className={`item ${
                          selectedId === place.id ? "active" : ""
                        }`}
                        onClick={() => {
                          setSelected(place.id);
                          setShowMap(Boolean(ui.showMap));
                        }}
                        onDoubleClick={() => {
                          setSelected(place.id);
                          setShowMap(false);
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="itinerary-item-main">
                          <div className="itinerary-item-title">
                            <div className="font-medium">
                              {numFor(place.id)}. {place.name}
                            </div>
                            <CategoryBadge category={place.category} />
                          </div>
                          <div className="text-xs">
                            {place.startTime ? `Inicio: ${place.startTime} - ` : ""}
                            Estancia: {place.durationMin ?? 60} min
                            {typeof place.spendJPY === "number"
                              ? ` - Gasto: JPY ${place.spendJPY} (${formatConvertedJPY(
                                  place.spendJPY,
                                  currency
                                )})`
                              : ""}
                          </div>
                          {place.sourceUrl && (
                            <a
                              className="text-xs text-blue-600"
                              href={place.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                            >
                              Ver fuente
                            </a>
                          )}
                        </div>

                        <div className="itinerary-item-actions">
                          <button
                            className="icon-button itinerary-item-icon-button"
                            title="Duplicar lugar"
                            aria-label={`Duplicar ${place.name || "lugar"}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              const duplicateId = duplicatePlace(place.id);
                              if (duplicateId) {
                                setShowMap(Boolean(ui.showMap));
                                toast({
                                  title: "Lugar duplicado",
                                  message: "Se agrego una copia al dia seleccionado.",
                                  tone: "success",
                                });
                              }
                            }}
                          >
                            <svg
                              aria-hidden="true"
                              focusable="false"
                              viewBox="0 0 24 24"
                              className="itinerary-copy-icon"
                            >
                              <rect
                                x="9"
                                y="9"
                                width="10"
                                height="10"
                                rx="2"
                              />
                              <path d="M5 15V7a2 2 0 0 1 2-2h8" />
                            </svg>
                          </button>
                          <button
                            className="btn-outline text-xs"
                            title="Mover a My Places"
                            onClick={(event) => {
                              event.stopPropagation();
                              unassignPlace(place.id);
                            }}
                          >
                            A My Places
                          </button>
                          <div
                            {...handleProps}
                            role="button"
                            aria-label="Arrastrar"
                            className="itinerary-handle"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <span>::</span>
                          </div>
                        </div>
                      </div>
                    </li>
                  )}
                </SortableItemWithHandle>
              );
            })}

            {!blocks.length && (
              <li className="empty-state empty-state--rich">
                <div className="empty-state-kicker">Primer paso</div>
                <div className="font-medium">Este día aún no tiene puntos</div>
                <div className="text-xs">
                  Añade un punto, haz click en el mapa o mueve una idea desde My
                  Places.
                </div>
              </li>
            )}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}
