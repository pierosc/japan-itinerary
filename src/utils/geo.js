export function haversineKm(a, b) {
  const R = 6371;
  const dLat = deg2rad(b.lat - a.lat);
  const dLon = deg2rad(b.lng - a.lng);
  const lat1 = deg2rad(a.lat);
  const lat2 = deg2rad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

function deg2rad(d) {
  return d * (Math.PI / 180);
}

export const JAPAN_BOUNDS = [
  [24.0, 122.0], // SW
  [46.0, 146.0], // NE
];
