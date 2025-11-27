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
import { useMemo, useRef, useState } from "react";
import SelectedPlaceView from "./SelectedPlaceView";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Basemaps
const BASEMAPS = (key) => ({
  osm: {
    name: "OSM estándar",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attr: "© OpenStreetMap contributors",
  },
  "carto-en": {
    name: "Carto Positron",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attr: "© CARTO, OSM",
  },
  "carto-dark-en": {
    name: "Carto DarkMatter",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attr: "© CARTO, OSM",
  },
  "esri-worldgray": {
    name: "Esri WorldGray",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attr: "Tiles © Esri",
  },
  "maptiler-es": {
    name: "MapTiler (ES)*",
    url: key
      ? `https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${key}&lang=es`
      : "",
    attr: "© MapTiler, OSM",
  },
});

// === Click para añadir punto (ignora clicks sobre UI) ===
function ClickToAdd() {
  const addPlace = useItineraryStore((s) => s.addPlace);

  useMapEvents({
    click(e) {
      const target = e.originalEvent?.target;
      // si el click viene de la capa de controles, no creamos punto
      if (target && target.closest?.(".map-ui-overlay")) return;

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const mapRef = useRef(null);

  const bounds = useMemo(
    () => L.latLngBounds(JAPAN_BOUNDS.map(([a, b]) => [a, b])),
    []
  );
  const basemaps = BASEMAPS(ui.mapTilerKey);
  const bm = basemaps[ui.basemap] || basemaps.osm;

  // Si ocultaste el mapa y hay seleccionado, mostramos ficha
  if (!ui.showMap && selectedId) return <SelectedPlaceView />;

  // === Buscar lugar tipo "Google Maps" con Nominatim ===
  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim() || !mapRef.current) return;

    try {
      setSearchLoading(true);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery.trim()
      )}`;
      const resp = await fetch(url, {
        headers: { "Accept-Language": "es" },
      });
      const data = await resp.json();

      if (!Array.isArray(data) || !data.length) {
        alert("No se encontraron resultados para esa búsqueda.");
        return;
      }

      const best = data[0];
      const lat = parseFloat(best.lat);
      const lng = parseFloat(best.lon);

      // centrar mapa
      mapRef.current.setView([lat, lng], 15);

      // crear punto en el resultado
      const name = best.display_name?.split(",")[0] || searchQuery.trim();
      const { addPlace } = useItineraryStore.getState();
      addPlace({
        name,
        category: "otro",
        lat,
        lng,
        notes: `Resultado de búsqueda: ${best.display_name}`,
      });
    } catch (err) {
      console.error("Error buscando lugar:", err);
      alert("Error al buscar el lugar. Intenta de nuevo.");
    } finally {
      setSearchLoading(false);
    }
  }

  return (
    <div className="h-full w-full" style={{ position: "relative" }}>
      {/* CONTROLES SUPERIORES */}
      <div
        className="card map-ui-overlay"
        style={{
          position: "absolute",
          left: 12,
          top: 12,
          zIndex: 1000,
          maxWidth: 360,
        }}
      >
        {/* Buscador de lugares */}
        <form
          onSubmit={handleSearch}
          style={{ display: "flex", gap: 8, marginBottom: 8 }}
        >
          <input
            className="input"
            placeholder="Buscar lugar (Tokyo Station, Akihabara, ...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="btn" type="submit" disabled={searchLoading}>
            {searchLoading ? "Buscando..." : "Buscar"}
          </button>
        </form>

        {/* Basemap + botones */}
        <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 8 }}>
          <label className="text-xs">
            Mapa base
            <select
              className="input"
              value={ui.basemap}
              onChange={(e) => setBasemap(e.target.value)}
            >
              {Object.entries(basemaps).map(([k, v]) => (
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
              Para español, guarda en Settings tu clave de MapTiler
              (ui.mapTilerKey).
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

      {/* MAPA */}
      <MapContainer
        bounds={bounds}
        className="h-full w-full rounded-lg"
        scrollWheelZoom
        whenCreated={(map) => {
          mapRef.current = map;
        }}
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

        {/* Conectores virtuales */}
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
