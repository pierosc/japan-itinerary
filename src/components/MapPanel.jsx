import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useItineraryStore } from "../hooks/useItineraryStore";
import { JAPAN_BOUNDS } from "../utils/geo";
import { useMemo } from "react";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
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
  const { placesBySelectedDate, selectedId, setSelected, updatePlace } =
    useItineraryStore();
  const places = placesBySelectedDate();
  const bounds = useMemo(
    () => L.latLngBounds(JAPAN_BOUNDS.map(([a, b]) => [a, b])),
    []
  );

  return (
    <div className="h-full w-full">
      <MapContainer
        bounds={bounds}
        className="h-full w-full rounded-lg"
        scrollWheelZoom
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
      </MapContainer>
    </div>
  );
}
