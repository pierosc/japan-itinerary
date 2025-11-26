// src/components/MapPanel.jsx
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo } from "react";

import { useItineraryStore } from "../hooks/useItineraryStore";
import { JAPAN_BOUNDS } from "../utils/geo";
import SelectedPlaceView from "./SelectedPlaceView";

// ====== Iconos por defecto de Leaflet (para Vite) ======
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ====== Definición de basemaps ======
const BASEMAPS = (key) => ({
  osm: {
    name: "OSM (local)",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attr: "© OpenStreetMap",
  },
  osmjp: {
    name: "OSM Japan (日本語)",
    url: "https://tile.openstreetmap.jp/{z}/{x}/{y}.png",
    attr: "© OSM Japan",
  },
  "carto-en": {
    name: "Carto Positron (EN)",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attr: "© CARTO, OSM",
  },
  "carto-dark-en": {
    name: "Carto DarkMatter (EN)",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attr: "© CARTO, OSM",
  },
  "esri-worldstreet": {
    name: "Esri WorldStreet (EN)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attr: "Tiles © Esri — Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Garmin, FAO, NPS, and the GIS User Community",
  },
  "esri-worldgray": {
    name: "Esri WorldGray (EN)",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attr: "Tiles © Esri — Esri, DeLorme, NAVTEQ",
  },
  "maptiler-es": {
    name: "MapTiler (ES)*",
    url: key
      ? `https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${key}&lang=es`
      : "",
    attr: "© MapTiler, OSM",
  },
});

// ====== Componente para añadir un punto al hacer click ======
function ClickToAdd() {
  const addPlace = useItineraryStore((s) => s.addPlace);

  useMapEvents({
    click(e) {
      addPlace({
        name: "Nuevo punto",
        category: "otro",
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        notes: "",
      });
    },
  });

  return null;
}

// ====== Panel principal del mapa ======
export default function MapPanel() {
  // --- Estado base de la store (usando selectores simples) ---
  const places = useItineraryStore((s) => s.places);
  const routes = useItineraryStore((s) => s.routes);
  const selectedDate = useItineraryStore((s) => s.selectedDate);
  const selectedId = useItineraryStore((s) => s.selectedId);

  const setSelected = useItineraryStore((s) => s.setSelected);
  const updatePlace = useItineraryStore((s) => s.updatePlace);

  const ui = useItineraryStore((s) => s.ui);
  const setBasemap = useItineraryStore((s) => s.setBasemap);
  const toggleRoute = useItineraryStore((s) => s.toggleRoute);
  const setShowMap = useItineraryStore((s) => s.setShowMap);

  // --- Derivados memoizados: lugares y rutas del día actual ---
  const placesForDate = useMemo(
    () => places.filter((p) => p.date === selectedDate),
    [places, selectedDate]
  );

  const routesForDate = useMemo(
    () => routes.filter((r) => r.date === selectedDate),
    [routes, selectedDate]
  );

  // --- Bounds iniciales (Japón) ---
  const bounds = useMemo(
    () => L.latLngBounds(JAPAN_BOUNDS.map(([a, b]) => [a, b])),
    []
  );

  const bm =
    BASEMAPS(ui.mapTilerKey)[ui.basemap] || BASEMAPS(ui.mapTilerKey).osm;

  // Si el usuario ocultó el mapa y hay un lugar seleccionado,
  // mostramos solo la ficha detallada.
  if (!ui.showMap && selectedId) return <SelectedPlaceView />;

  return (
    <div className="h-full w-full" style={{ position: "relative" }}>
      {/* Controles flotantes del mapa */}
      <div
        style={{ position: "absolute", right: 12, top: 12, zIndex: 1000 }}
        className="card"
      >
        <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 8 }}>
          <label className="text-xs">
            Basemap
            <select
              className="input"
              value={ui.basemap}
              onChange={(e) => setBasemap(e.target.value)}
            >
              {Object.entries(BASEMAPS(ui.mapTilerKey)).map(([k, v]) => (
                <option
                  key={k}
                  value={k}
                  disabled={k === "maptiler-es" && !ui.mapTilerKey}
                >
                  {v.name}
                </option>
              ))}
            </select>
          </label>

          {ui.basemap === "maptiler-es" && !ui.mapTilerKey && (
            <div className="text-xs">
              Para tener el mapa en español, añade tu MapTiler key en la
              configuración y recarga/importa el JSON.
            </div>
          )}

          <button className="btn-outline" onClick={toggleRoute}>
            {ui.routeVisible ? "Ocultar rutas" : "Mostrar rutas"}
          </button>
          <button className="btn-outline" onClick={() => setShowMap(false)}>
            Ver ficha seleccionada
          </button>
        </div>
      </div>

      {/* Mapa */}
      <MapContainer
        bounds={bounds}
        className="h-full w-full rounded-lg"
        scrollWheelZoom
      >
        {bm.url && <TileLayer attribution={bm.attr} url={bm.url} />}

        <ClickToAdd />

        {/* Marcadores de lugares */}
        {placesForDate.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            eventHandlers={{
              click: () => setSelected(p.id),
              dragend: (ev) => {
                const { lat, lng } = ev.target.getLatLng();
                updatePlace(p.id, { lat, lng });
              },
            }}
            draggable
          >
            <Popup>
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs">({p.category})</div>
                <a
                  className="text-blue-600 underline text-xs"
                  href={`https://www.google.com/maps?q=${p.lat},${p.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver en Google Maps
                </a>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Conectores virtuales entre puntos consecutivos si no hay ruta real */}
        {ui.routeVisible &&
          placesForDate.map((p, i) => {
            const next = placesForDate[i + 1];
            if (!next) return null;

            const hasRoute = routesForDate.some(
              (r) => r.fromId === p.id && r.toId === next.id
            );
            if (hasRoute) return null;

            return (
              <Polyline
                key={`virtual-${p.id}-${next.id}`}
                positions={[
                  [p.lat, p.lng],
                  [next.lat, next.lng],
                ]}
                pathOptions={{
                  color: "#6b7280",
                  opacity: 0.7,
                  weight: 3,
                  dashArray: "4 6",
                }}
              />
            );
          })}

        {/* Rutas reales */}
        {ui.routeVisible &&
          routesForDate.map((r) => {
            const from = placesForDate.find((p) => p.id === r.fromId);
            const to = placesForDate.find((p) => p.id === r.toId);
            if (!from || !to) return null;

            const line =
              r.geojson && r.geojson.length
                ? r.geojson
                : [
                    [from.lat, from.lng],
                    [to.lat, to.lng],
                  ];

            const dashArray = r.mode === "train" ? "6 8" : undefined;

            return (
              <Polyline
                key={r.id}
                positions={line}
                pathOptions={{ dashArray, weight: 4, opacity: 0.95 }}
              />
            );
          })}
      </MapContainer>
    </div>
  );
}
