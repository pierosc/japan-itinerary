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

// basemaps gratuitos (raster) con etiquetas diferentes
const BASEMAPS = {
  osm: {
    name: "OSM (local names)",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attr: "&copy; OpenStreetMap",
  },
  osmjp: {
    name: "OSM Japan (日本語)",
    url: "https://tile.openstreetmap.jp/{z}/{x}/{y}.png",
    attr: "&copy; OpenStreetMap Japan",
  },
  osmfr: {
    name: "OSM France (fr)",
    url: "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
    attr: "&copy; OpenStreetMap France",
  },
  osmde: {
    name: "OSM Germany (de)",
    url: "https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png",
    attr: "&copy; OpenStreetMap Germany",
  },
};

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
    selectedId,
    setSelected,
    updatePlace,
    ui,
    setBasemap,
    toggleRoute,
  } = useItineraryStore();
  const places = placesBySelectedDate();
  const bounds = useMemo(
    () => L.latLngBounds(JAPAN_BOUNDS.map(([a, b]) => [a, b])),
    []
  );

  // Si el usuario eligió ver ficha (showMap=false) y hay seleccionado, renderizar ficha
  if (!ui.showMap && selectedId) return <SelectedPlaceView />;

  const bm = BASEMAPS[ui.basemap] || BASEMAPS.osm;
  const poly = places.map((p) => [p.lat, p.lng]);

  return (
    <div className="h-full w-full" style={{ position: "relative" }}>
      {/* Overlay de controles arriba a la derecha */}
      <div
        style={{ position: "absolute", right: 12, top: 12, zIndex: 1000 }}
        className="card"
      >
        <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 8 }}>
          <label className="text-xs">
            Basemap / Idioma
            <select
              className="input"
              value={ui.basemap}
              onChange={(e) => setBasemap(e.target.value)}
            >
              {Object.entries(BASEMAPS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-outline" onClick={toggleRoute}>
            {ui.routeVisible ? "Ocultar ruta" : "Mostrar ruta"}
          </button>
        </div>
      </div>

      <MapContainer
        bounds={bounds}
        className="h-full w-full rounded-lg"
        scrollWheelZoom
      >
        <TileLayer attribution={bm.attr} url={bm.url} />
        <ClickToAdd />
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
        {ui.routeVisible && poly.length >= 2 && <Polyline positions={poly} />}
      </MapContainer>
    </div>
  );
}
