// src/components/MapPanel.jsx
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { useItineraryStore } from "../hooks/useItineraryStore";
import { JAPAN_BOUNDS } from "../utils/geo";
import SelectedPlaceView from "./SelectedPlaceView";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_ICON = new L.Icon({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const SELECTED_ICON = new L.Icon({
  iconRetinaUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const BASEMAPS = (key) => ({
  "carto-en": {
    name: "Carto Positron (recomendado)",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attr: "© CARTO, OSM",
  },
  osm: {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attr: "© OpenStreetMap contributors",
  },
  "esri-worldstreet": {
    name: "Esri WorldStreet",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attr: "Tiles © Esri",
  },
  "esri-worldgray": {
    name: "Esri WorldGray",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attr: "Tiles © Esri",
  },
  opentopo: {
    name: "OpenTopoMap",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attr: "© OpenTopoMap, OSM",
  },
  "carto-dark-en": {
    name: "Carto DarkMatter",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attr: "© CARTO, OSM",
  },
  "maptiler-es": {
    name: "MapTiler calles ES*",
    url: key
      ? `https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${key}&lang=es`
      : "",
    attr: "© MapTiler, OSM",
  },
});

function ClickToAdd({ enabled }) {
  const addPlace = useItineraryStore((s) => s.addPlace);
  const setSelected = useItineraryStore((s) => s.setSelected);

  useMapEvents({
    click(e) {
      if (!enabled) return;
      const target = e.originalEvent?.target;
      if (target && target.closest?.(".map-ui-overlay")) return;

      const id = addPlace({
        name: "Nuevo punto",
        category: "otro",
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        notes: "",
      });
      if (id) setSelected(id);
    },
  });

  return null;
}

function FitToDayPlaces({ places, fallbackBounds }) {
  const map = useMap();
  const key = places.map((p) => `${p.id}:${p.lat}:${p.lng}`).join("|");

  useEffect(() => {
    window.requestAnimationFrame(() => {
      if (!places.length) {
        map.fitBounds(fallbackBounds, { padding: [24, 24], maxZoom: 6 });
        return;
      }

      const pointBounds = L.latLngBounds(places.map((p) => [p.lat, p.lng]));
      if (places.length === 1) {
        map.setView(pointBounds.getCenter(), 14);
      } else {
        map.fitBounds(pointBounds, { padding: [52, 52], maxZoom: 15 });
      }
    });
  }, [key, map, fallbackBounds, places]);

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
    toggleClickToAdd,
    setSidebarTab,
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
  const bm = basemaps[ui.basemap] || basemaps["carto-en"];

  if (!ui.showMap && selectedId) return <SelectedPlaceView />;

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
        alert("No se encontraron resultados para esa busqueda.");
        return;
      }

      const best = data[0];
      const lat = parseFloat(best.lat);
      const lng = parseFloat(best.lon);

      mapRef.current.setView([lat, lng], 15);

      const name = best.display_name?.split(",")[0] || searchQuery.trim();
      const { addPlace, setSelected: selectNewPlace } =
        useItineraryStore.getState();
      const id = addPlace({
        name,
        category: "otro",
        lat,
        lng,
        notes: `Resultado de busqueda: ${best.display_name}`,
      });
      if (id) selectNewPlace(id);
    } catch (err) {
      console.error("Error buscando lugar:", err);
      alert("Error al buscar el lugar. Intenta de nuevo.");
    } finally {
      setSearchLoading(false);
    }
  }

  const handleMarkerClick = (id) => {
    setSelected(id);
    setShowMap(true);
    setSidebarTab("itinerary");
  };

  return (
    <div className="h-full w-full" style={{ position: "relative" }}>
      <div
        className="map-ui-overlay"
      >
        <form
          className="map-search"
          onSubmit={handleSearch}
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

        <div className="map-controls">
          <label className="map-basemap">
            <span>Mapa base</span>
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
              Para etiquetas en espanol, guarda tu clave de MapTiler en
              Configuracion.
            </div>
          )}

          <div className="map-actions">
            <button className="btn-outline" onClick={toggleRoute}>
              {ui.routeVisible ? "Ocultar rutas" : "Mostrar rutas"}
            </button>
            <button
              className={
                "btn-outline " + (ui.clickToAddEnabled ? "btn-active" : "")
              }
              onClick={toggleClickToAdd}
              title="Cuando esta activo, un click en el mapa crea un punto."
            >
              {ui.clickToAddEnabled ? "Click agrega punto" : "Click no agrega"}
            </button>
            <button className="btn-outline" onClick={() => setShowMap(false)}>
              Ver ficha seleccionada
            </button>
          </div>
        </div>
      </div>

      <MapContainer
        bounds={bounds}
        className="h-full w-full rounded-lg"
        scrollWheelZoom
        ref={mapRef}
      >
        {bm.url && <TileLayer attribution={bm.attr} url={bm.url} />}

        <FitToDayPlaces places={places} fallbackBounds={bounds} />
        <ClickToAdd enabled={Boolean(ui.clickToAddEnabled)} />

        {places.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={selectedId === p.id ? SELECTED_ICON : DEFAULT_ICON}
            zIndexOffset={selectedId === p.id ? 1000 : 0}
            eventHandlers={{
              click: () => handleMarkerClick(p.id),
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
