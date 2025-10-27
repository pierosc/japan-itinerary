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
import { useItineraryStore } from "../hooks/useItineraryStore";
import { JAPAN_BOUNDS } from "../utils/geo";
import { useMemo } from "react";
import SelectedPlaceView from "./SelectedPlaceView";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Basemaps: EN (Esri/Carto) y opción ES (MapTiler requiere key)
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
  // Esri (inglés)
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
  // Español real (requiere key)
  "maptiler-es": {
    name: "MapTiler (ES)*",
    url: key
      ? `https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${key}&lang=es`
      : "",
    attr: "© MapTiler, OSM",
  },
});

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

export default function MapPanel() {
  const {
    placesBySelectedDate,
    routesBySelectedDate,
    selectedId,
    setSelected,
    updatePlace,
    ui,
    setBasemap,
    toggleRoute,
    setShowMap,
  } = useItineraryStore();

  const places = placesBySelectedDate();
  const routes = routesBySelectedDate();

  const bounds = useMemo(
    () => L.latLngBounds(JAPAN_BOUNDS.map(([a, b]) => [a, b])),
    []
  );
  const bm =
    BASEMAPS(ui.mapTilerKey)[ui.basemap] || BASEMAPS(ui.mapTilerKey).osm;

  // Si ocultaste el mapa (p.ej. desde la lista) y hay seleccionado, muestra ficha
  if (!ui.showMap && selectedId) return <SelectedPlaceView />;

  return (
    <div className="h-full w-full" style={{ position: "relative" }}>
      {/* Controles superpuestos */}
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
              Para español, agrega tu MapTiler key en el JSON (ui.mapTilerKey) y
              reimporta.
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

      <MapContainer
        bounds={bounds}
        className="h-full w-full rounded-lg"
        scrollWheelZoom
      >
        {bm.url && <TileLayer attribution={bm.attr} url={bm.url} />}

        <ClickToAdd />

        {/* Marcadores */}
        {places.map((p) => (
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

        {/* Conectores virtuales (entre consecutivos) si no existe ruta real */}
        {ui.routeVisible &&
          places.map((p, i) => {
            const next = places[i + 1];
            if (!next) return null;
            const hasRoute = routes.some(
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
          routes.map((r) => {
            const from = places.find((p) => p.id === r.fromId);
            const to = places.find((p) => p.id === r.toId);
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
