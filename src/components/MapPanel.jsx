// src/components/MapPanel.jsx
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
  Polyline,
  ImageOverlay,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { useItineraryStore } from "../hooks/useItineraryStore";
import { JAPAN_BOUNDS } from "../utils/geo";
import SelectedPlaceView from "./SelectedPlaceView";
import { useFeedback } from "./ui/FeedbackProvider";

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

function getCoord(place) {
  const lat = Number(place.lat);
  const lng = Number(place.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

function buildGoogleExternalUrl(places) {
  const coords = places.map(getCoord).filter(Boolean);
  if (!coords.length) return "";
  if (coords.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      coords[0]
    )}`;
  }
  const origin = coords[0];
  const destination = coords[coords.length - 1];
  const waypoints = coords.slice(1, -1).slice(0, 8).join("|");
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "walking",
  });
  if (waypoints) params.set("waypoints", waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

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

function ClickToAddImagePin({ enabled }) {
  const addPlace = useItineraryStore((s) => s.addPlace);
  const setSelected = useItineraryStore((s) => s.setSelected);

  useMapEvents({
    click(e) {
      if (!enabled) return;
      const target = e.originalEvent?.target;
      if (target && target.closest?.(".map-ui-overlay")) return;

      const id = addPlace({
        name: "Nuevo pin",
        category: "atraccion",
        mapMode: "image",
        mapX: e.latlng.lng,
        mapY: e.latlng.lat,
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

function FitToImageMap({ imageBounds, places }) {
  const map = useMap();
  const key = places.map((p) => `${p.id}:${p.mapX}:${p.mapY}`).join("|");

  useEffect(() => {
    window.requestAnimationFrame(() => {
      if (places.length) {
        const pointBounds = L.latLngBounds(places.map((p) => [p.mapY, p.mapX]));
        if (places.length === 1) {
          map.setView(pointBounds.getCenter(), 0);
        } else {
          map.fitBounds(pointBounds, { padding: [52, 52], maxZoom: 2 });
        }
        return;
      }

      map.fitBounds(imageBounds, { padding: [24, 24] });
    });
  }, [imageBounds, key, map, places]);

  return null;
}

function ImageMapLoader({ imageUrl, selectedDate }) {
  const setDayMap = useItineraryStore((s) => s.setDayMap);
  const { toast } = useFeedback();

  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => {
      setDayMap(selectedDate, {
        imageUrl,
        width: img.naturalWidth || 1600,
        height: img.naturalHeight || 1000,
      });
    };
    img.onerror = () => {
      toast({
        title: "No se pudo cargar esa imagen",
        message: "Revisa que sea una URL directa.",
        tone: "danger",
      });
    };
    img.src = imageUrl;
  }, [imageUrl, selectedDate, setDayMap, toast]);

  return null;
}

export default function MapPanel({ trip, currentUser }) {
  const { toast, confirm } = useFeedback();
  const {
    placesBySelectedDate,
    routesBySelectedDate,
    selectedId,
    setSelected,
    updatePlace,
    selectedDate,
    dayMaps,
    setDayMap,
    removeDayMap,
    ui,
    setBasemap,
    toggleRoute,
    setShowMap,
    toggleClickToAdd,
    setSidebarTab,
  } = useItineraryStore();

  const places = placesBySelectedDate();
  const routes = routesBySelectedDate();
  const imagePlaces = places.filter(
    (p) =>
      p.mapMode === "image" &&
      Number.isFinite(Number(p.mapX)) &&
      Number.isFinite(Number(p.mapY))
  );
  const geoPlaces = places.filter(
    (p) =>
      p.mapMode !== "image" &&
      Number.isFinite(Number(p.lat)) &&
      Number.isFinite(Number(p.lng))
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [imageUrlDraft, setImageUrlDraft] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    const expandControls = () => setControlsCollapsed(false);
    window.addEventListener("trip-tour:expand-map-controls", expandControls);
    return () => {
      window.removeEventListener("trip-tour:expand-map-controls", expandControls);
    };
  }, []);

  const bounds = useMemo(
    () => L.latLngBounds(JAPAN_BOUNDS.map(([a, b]) => [a, b])),
    []
  );
  const basemaps = BASEMAPS(ui.mapTilerKey);
  const bm = basemaps[ui.basemap] || basemaps["carto-en"];
  const dayMap = dayMaps?.[selectedDate] || null;
  const hasImageMap = Boolean(dayMap?.imageUrl);
  const googleExternalUrl = useMemo(
    () => buildGoogleExternalUrl(geoPlaces),
    [geoPlaces]
  );
  const imageWidth = Number(dayMap?.width) || 1600;
  const imageHeight = Number(dayMap?.height) || 1000;
  const imageBounds = useMemo(
    () =>
      L.latLngBounds([
        [0, 0],
        [imageHeight, imageWidth],
      ]),
    [imageHeight, imageWidth]
  );

  if (!ui.showMap && selectedId) {
    return <SelectedPlaceView trip={trip} currentUser={currentUser} />;
  }

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
        toast({
          title: "Sin resultados",
          message: "Prueba con otro nombre o agrega el punto manualmente.",
          tone: "warning",
        });
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
        notes: `Resultado de búsqueda: ${best.display_name}`,
      });
      if (id) selectNewPlace(id);
    } catch (err) {
      console.error("Error buscando lugar:", err);
      toast({
        title: "Error al buscar el lugar",
        message: "Intenta de nuevo en unos segundos.",
        tone: "danger",
      });
    } finally {
      setSearchLoading(false);
    }
  }

  const handleMarkerClick = (place) => {
    setSelected(place.id);
    setShowMap(true);
    setSidebarTab("itinerary");
  };

  const loadImageUrl = () => {
    const url = imageUrlDraft.trim();
    if (!/^https?:\/\/.+/i.test(url)) {
      toast({
        title: "URL de imagen inválida",
        message: "Debe empezar con http:// o https://.",
        tone: "warning",
      });
      return;
    }
    setDayMap(selectedDate, { imageUrl: url, source: "url", name: url });
    setImageUrlDraft("");
  };

  const mapHint = hasImageMap
    ? "Click agrega pin sobre tu plano. Arrastra los pines para ajustar."
    : "Puedes usar un mapa normal o cargar un plano del parque para este día.";

  return (
    <div className="h-full w-full" style={{ position: "relative" }}>
      <div
        className={`map-ui-overlay ${
          controlsCollapsed ? "map-ui-overlay--collapsed" : ""
        }`}
        data-tour="map-tools"
      >
        <div className="map-overlay-header">
          <div className="map-overlay-title">
            <span>{hasImageMap ? "Mapa del día" : "Mapa"}</span>
            {hasImageMap && !controlsCollapsed && (
              <span className="chip">Plano activo</span>
            )}
          </div>
          <button
            className="icon-button map-collapse-button"
            type="button"
            onClick={() => setControlsCollapsed((v) => !v)}
            title={controlsCollapsed ? "Expandir controles" : "Minimizar controles"}
            aria-label={controlsCollapsed ? "Expandir controles" : "Minimizar controles"}
          >
            {controlsCollapsed ? "+" : "-"}
          </button>
        </div>

        {!controlsCollapsed && !hasImageMap && (
          <form className="map-search" onSubmit={handleSearch}>
            <input
              className="input"
              placeholder="Buscar lugar (Tokyo Station, Akihabara, ...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="btn" type="submit" disabled={searchLoading}>
              {searchLoading ? "Buscando..." : "Buscar"}
            </button>
            {googleExternalUrl && (
              <a
                className="btn-outline map-google-link"
                href={googleExternalUrl}
                target="_blank"
                rel="noreferrer"
              >
                Abrir en Google Maps
              </a>
            )}
          </form>
        )}

        {!controlsCollapsed && (
        <div className="map-controls">
          <div className="custom-map-box">
            <div className="custom-map-title">
              <span>Mapa del día</span>
              {hasImageMap && <span className="chip">Plano activo</span>}
            </div>
            <div className="text-xs">{mapHint}</div>
            <div className="custom-map-row">
              <input
                className="input"
                placeholder="URL de imagen del parque"
                value={imageUrlDraft}
                onChange={(e) => setImageUrlDraft(e.target.value)}
              />
              <button className="btn-outline" type="button" onClick={loadImageUrl}>
                Usar URL
              </button>
            </div>
            <div className="map-actions">
              {hasImageMap && (
                <button
                  className="btn-outline"
                  type="button"
                  onClick={async () => {
                    const accepted = await confirm({
                      title: "Quitar plano del día",
                      message:
                        "Los pines de este plano volverán a My Places.",
                      confirmLabel: "Quitar plano",
                      tone: "danger",
                    });
                    if (accepted) removeDayMap(selectedDate);
                  }}
                >
                  Quitar plano
                </button>
              )}
            </div>
          </div>

          {!hasImageMap && (
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
          )}

          {!hasImageMap &&
            ui.basemap === "maptiler-es" &&
            !ui.mapTilerKey && (
            <div className="text-xs">
              Para etiquetas en español, guarda tu clave de MapTiler en
              Configuración.
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
        )}
      </div>

      {hasImageMap ? (
        <MapContainer
          key={`image-${selectedDate}-${dayMap.imageUrl}`}
          crs={L.CRS.Simple}
          bounds={imageBounds}
          minZoom={-4}
          maxZoom={4}
          className="h-full w-full rounded-lg custom-image-map"
          scrollWheelZoom
          ref={mapRef}
        >
          <ImageMapLoader imageUrl={dayMap.imageUrl} selectedDate={selectedDate} />
          <ImageOverlay url={dayMap.imageUrl} bounds={imageBounds} />
          <FitToImageMap imageBounds={imageBounds} places={imagePlaces} />
          <ClickToAddImagePin enabled={Boolean(ui.clickToAddEnabled)} />

          {imagePlaces.map((p) => (
            <Marker
              key={p.id}
              position={[p.mapY, p.mapX]}
              icon={selectedId === p.id ? SELECTED_ICON : DEFAULT_ICON}
              zIndexOffset={selectedId === p.id ? 1000 : 0}
              eventHandlers={{
                click: () => handleMarkerClick(p),
                dragend: (ev) => {
                  const { lat, lng } = ev.target.getLatLng();
                  updatePlace(p.id, { mapX: lng, mapY: lat });
                },
              }}
              draggable={p.category !== "hotel"}
            >
              <Popup>
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs">({p.category})</div>
                </div>
              </Popup>
            </Marker>
          ))}

          {ui.routeVisible &&
            imagePlaces.map((p, i) => {
              const next = imagePlaces[i + 1];
              if (!next) return null;
              return (
                <Polyline
                  key={`image-${p.id}-${next.id}`}
                  positions={[
                    [p.mapY, p.mapX],
                    [next.mapY, next.mapX],
                  ]}
                  pathOptions={{
                    color: "#2563eb",
                    opacity: 0.8,
                    weight: 3,
                    dashArray: "4 6",
                  }}
                />
              );
            })}
        </MapContainer>
      ) : (
        <MapContainer
          key={`geo-${selectedDate}`}
          bounds={bounds}
          className="h-full w-full rounded-lg"
          scrollWheelZoom
          ref={mapRef}
        >
          {bm.url && <TileLayer attribution={bm.attr} url={bm.url} />}

          <FitToDayPlaces places={geoPlaces} fallbackBounds={bounds} />
          <ClickToAdd enabled={Boolean(ui.clickToAddEnabled)} />

          {geoPlaces.map((p) => (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={selectedId === p.id ? SELECTED_ICON : DEFAULT_ICON}
              zIndexOffset={selectedId === p.id ? 1000 : 0}
              eventHandlers={{
                click: () => handleMarkerClick(p),
                dragend: (ev) => {
                  const { lat, lng } = ev.target.getLatLng();
                  updatePlace(p.id, { lat, lng });
                },
              }}
              draggable={p.category !== "hotel"}
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
          geoPlaces.map((p, i) => {
            const next = geoPlaces[i + 1];
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
            const from = geoPlaces.find((p) => p.id === r.fromId);
            const to = geoPlaces.find((p) => p.id === r.toId);
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
      )}
    </div>
  );
}
