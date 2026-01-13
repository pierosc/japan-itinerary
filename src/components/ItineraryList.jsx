// src/components/ItineraryList.jsx
import { useMemo, useState } from "react";
import { useItineraryStore } from "../hooks/useItineraryStore";
import { haversineKm } from "../utils/geo";
import CategoryBadge from "./CategoryBadge";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import SortableItemWithHandle from "./dnd/SortableItemWithHandle";

const MODE_ICON = { walk: "🚶", train: "🚆", car: "🚗" };

export default function ItineraryList() {
  const {
    placesBySelectedDate,
    setSelected,
    selectedId,
    addPlace,
    speedsKmh,
    selectedDate,
    reorderPlacesForDate,
    addRouteBetween,
    routesBySelectedDate,
    removeRoute,
    updateRoute,
    setShowMap,

    // ✅ My places
    unassignedPlaces,
    assignPlaceToDay,
    unassignPlace, // ✅ NUEVO
  } = useItineraryStore();

  const [editingRoute, setEditingRoute] = useState(null);

  // ✅ NUEVO: selector simple (1 lugar suelto)
  const [selectedLooseId, setSelectedLooseId] = useState("");

  const places = placesBySelectedDate();
  const routes = routesBySelectedDate();
  const pool = unassignedPlaces(); // date=null

  const canAddLoose = Boolean(selectedDate) && Boolean(selectedLooseId);

  const handleAddLooseToDay = () => {
    if (!selectedDate) {
      alert("Primero selecciona un día en el selector de días.");
      return;
    }
    if (!selectedLooseId) return;

    assignPlaceToDay(selectedLooseId, selectedDate);

    // opcional UX: abrir panel de edición
    setSelected(selectedLooseId);
    setShowMap(false);

    setSelectedLooseId("");
  };

  // bloques: ITEM → RUTA → ITEM …
  const blocks = useMemo(() => {
    const out = [];
    for (let i = 0; i < places.length; i++) {
      const cur = places[i];
      const next = places[i + 1];
      out.push({ kind: "place", place: cur });
      if (next) {
        const r =
          routes.find((rr) => rr.fromId === cur.id && rr.toId === next.id) ||
          null;
        out.push({ kind: "route", from: cur, to: next, route: r });
      }
    }
    return out;
  }, [places, routes]);

  // DnD solo items
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );
  const idsForDnd = places.map((p) => p.id);

  function onDragEnd(e) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = idsForDnd.indexOf(active.id);
    const newIndex = idsForDnd.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newIds = arrayMove(idsForDnd, oldIndex, newIndex);
    reorderPlacesForDate(selectedDate, newIds);
  }

  const numFor = (pId) => idsForDnd.indexOf(pId) + 1;

  function distMins(a, b, mode) {
    const d = haversineKm(a, b);
    const spd = speedsKmh[mode] || speedsKmh.walk;
    const mins = Math.round((d / spd) * 60);
    return `${d.toFixed(1)} km · ~${mins} min`;
  }

  async function createRouteBetween(a, b, mode = "walk") {
    const from = places.find((p) => p.id === a);
    const to = places.find((p) => p.id === b);
    if (!from || !to) return;

    let geojson = null;
    if (mode === "walk" || mode === "car") {
      try {
        const prof = mode === "walk" ? "foot" : "driving";
        const resp = await fetch(
          `https://router.project-osrm.org/route/v1/${prof}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
        );
        const data = await resp.json();
        const coords = data.routes?.[0]?.geometry?.coordinates || [];
        geojson = coords.map(([lng, lat]) => [lat, lng]);
      } catch {}
    }

    const { addRouteBetween } = useItineraryStore.getState();
    addRouteBetween(selectedDate, a, b, mode, geojson);

    const newRoute = useItineraryStore
      .getState()
      .routesBySelectedDate()
      .find((r) => r.fromId === a && r.toId === b);
    if (newRoute) setEditingRoute(newRoute.id);
  }

  function RouteLine({ from, to, route }) {
    return (
      <li
        aria-label="route-line"
        style={{ listStyle: "none", margin: "6px 0", pointerEvents: "none" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 8px",
          }}
        >
          <span
            title={route ? route.mode : "ruta"}
            style={{ pointerEvents: "none" }}
          >
            {route ? MODE_ICON[route.mode] || "➡️" : " "}
          </span>

          <div
            style={{
              flex: 1,
              borderTop: "2px solid #263247",
              opacity: route ? 1 : 0.6,
              pointerEvents: "none",
            }}
          />

          <span
            className="text-xs"
            style={{
              whiteSpace: "nowrap",
              marginLeft: 6,
              pointerEvents: "none",
            }}
          >
            {route
              ? `${route.name || `Ruta ${route.mode}`} · ${distMins(
                  from,
                  to,
                  route.mode
                )}`
              : distMins(from, to, "walk")}
          </span>

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 6,
              pointerEvents: "auto",
            }}
          >
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
                  <span className="text-xs">¥{route.priceJPY}</span>
                )}
                {route.durationMin != null && (
                  <span className="text-xs">· {route.durationMin} min</span>
                )}
                <button
                  className="btn-outline"
                  title="Editar ruta"
                  onClick={() => setEditingRoute(route.id)}
                >
                  ⚙️
                </button>
                <button
                  className="btn-outline"
                  title="Eliminar ruta"
                  onClick={() => removeRoute(route.id)}
                >
                  🗑️
                </button>
              </>
            )}
          </div>
        </div>

        {route && editingRoute === route.id && (
          <div
            className="card"
            style={{
              marginTop: 8,
              padding: 8,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
              gap: 8,
              pointerEvents: "auto",
            }}
          >
            <label>
              <span className="text-xs">Nombre (opcional)</span>
              <input
                className="input"
                value={route.name || ""}
                onChange={(e) =>
                  updateRoute(route.id, { name: e.target.value })
                }
                placeholder="p. ej. Yamanote"
              />
            </label>

            <label>
              <span className="text-xs">Transporte</span>
              <select
                className="input"
                value={route.mode || "walk"}
                onChange={(e) =>
                  updateRoute(route.id, { mode: e.target.value })
                }
              >
                <option value="walk">a pie</option>
                <option value="car">coche</option>
                <option value="train">tren</option>
              </select>
            </label>

            <label>
              <span className="text-xs">Duración (min)</span>
              <input
                type="number"
                className="input"
                value={route.durationMin ?? ""}
                onChange={(e) =>
                  updateRoute(route.id, {
                    durationMin: Number(e.target.value) || 0,
                  })
                }
              />
            </label>

            <label>
              <span className="text-xs">Precio (¥)</span>
              <input
                type="number"
                className="input"
                value={route.priceJPY ?? ""}
                onChange={(e) =>
                  updateRoute(route.id, {
                    priceJPY: Number(e.target.value) || 0,
                  })
                }
              />
            </label>

            <div style={{ alignSelf: "end" }}>
              <button className="btn" onClick={() => setEditingRoute(null)}>
                Listo
              </button>
            </div>
          </div>
        )}
      </li>
    );
  }

  return (
    <>
      {/* Header */}
      <div
        className="flex"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <h2 className="font-semibold">Itinerario</h2>
        <button
          className="btn"
          onClick={() =>
            addPlace({
              name: "Nuevo punto",
              category: "otro",
              lat: 35.6804,
              lng: 139.769,
              notes: "",
            })
          }
        >
          + Añadir punto
        </button>
      </div>

      {/* ✅ NUEVO: Selector simple (en vez del panel gigante) */}
      <div className="card" style={{ padding: 10, marginBottom: 10 }}>
        <div className="text-xs text-gray-600" style={{ marginBottom: 6 }}>
          Agregar lugar suelto (My places) al día{" "}
          <strong>{selectedDate}</strong>
          {" · "}
          Sueltos: <strong>{pool.length}</strong>
        </div>

        <div className="flex" style={{ gap: 8, alignItems: "center" }}>
          <select
            className="input"
            value={selectedLooseId}
            onChange={(e) => setSelectedLooseId(e.target.value)}
            style={{ flex: "1 1 auto" }}
          >
            <option value="">Selecciona un lugar…</option>
            {pool.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            className="btn-outline text-xs"
            disabled={!canAddLoose}
            onClick={handleAddLooseToDay}
            style={{ whiteSpace: "nowrap" }}
          >
            Agregar al día
          </button>
        </div>
      </div>

      {/* Lista DnD (tal cual la tenías) */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={idsForDnd}
          strategy={verticalListSortingStrategy}
        >
          <ol className="list">
            {blocks.map((b) => {
              if (b.kind === "place") {
                const p = b.place;
                return (
                  <SortableItemWithHandle id={p.id} key={p.id}>
                    {({ setNodeRef, style, handleProps }) => (
                      <li
                        ref={setNodeRef}
                        style={{ ...style, listStyle: "none" }}
                      >
                        <div
                          className={`item ${
                            selectedId === p.id ? "active" : ""
                          }`}
                          onClick={() => {
                            setSelected(p.id);
                            setShowMap(false);
                          }}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto auto",
                            gap: 8,
                            cursor: "pointer",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <div
                              className="flex"
                              style={{
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <div className="font-medium">
                                {numFor(p.id)}. {p.name}
                              </div>
                              <CategoryBadge category={p.category} />
                            </div>
                            <div className="text-xs">
                              {p.startTime ? `Inicio: ${p.startTime} · ` : ""}
                              Estancia: {p.durationMin ?? 60} min
                              {typeof p.spendJPY === "number"
                                ? ` · Gasto: ¥${p.spendJPY}`
                                : ""}
                            </div>
                            {p.sourceUrl && (
                              <a
                                className="text-xs text-blue-600"
                                href={p.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Ver fuente
                              </a>
                            )}
                          </div>

                          {/* ✅ NUEVO: Botón para mandar a My places */}
                          <button
                            className="btn-outline text-xs"
                            title="Mover a My places"
                            onClick={(e) => {
                              e.stopPropagation();
                              unassignPlace(p.id);
                            }}
                            style={{ whiteSpace: "nowrap" }}
                          >
                            ↩︎ A My places
                          </button>

                          {/* Handle de arrastre (tu mismo handle) */}
                          <div
                            {...handleProps}
                            role="button"
                            aria-label="arrastrar"
                            className="itinerary-handle"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 30,
                              borderRadius: 8,
                              cursor: "grab",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span style={{ letterSpacing: 2, opacity: 0.7 }}>
                              ⋮⋮
                            </span>
                          </div>
                        </div>
                      </li>
                    )}
                  </SortableItemWithHandle>
                );
              } else {
                const { from, to, route } = b;
                return (
                  <RouteLine
                    key={route ? route.id : `missing-${from.id}-${to.id}`}
                    from={from}
                    to={to}
                    route={route}
                  />
                );
              }
            })}

            {!blocks.length && (
              <li className="item text-xs">
                Sin puntos en este día. Haz click en el mapa o usa “Añadir
                punto”.
              </li>
            )}
          </ol>
        </SortableContext>
      </DndContext>
    </>
  );
}
