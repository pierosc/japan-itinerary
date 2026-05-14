import { PLACE_CATALOG, findCatalogPlace } from "../data/travelCatalog";

const paceLimits = {
  chill: 2,
  balanced: 3,
  intense: 4,
};

function addDaysISO(startDate, offset) {
  const date = new Date(`${startDate}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function scorePlace(place, preferences) {
  const interests = preferences.interests || [];
  const interestScore = interests.filter((interest) =>
    place.interests.includes(interest)
  ).length;
  const budgetPenalty =
    preferences.budgetJPY && place.spendJPY > preferences.budgetJPY / 3 ? 1 : 0;
  return interestScore * 3 - budgetPenalty;
}

function normalizeGeneratedPlace(place, date, index) {
  return {
    name: place.name,
    category: place.category,
    lat: place.lat,
    lng: place.lng,
    date,
    spendJPY: place.spendJPY,
    durationMin: place.durationMin,
    startTime: `${String(9 + index * 2).padStart(2, "0")}:00`,
    notes: `${place.city} · ${place.zone}. Generado por Travel Studio.`,
  };
}

export function generateSmartPlan(preferences) {
  const dayCount = Math.max(1, Number(preferences.days) || 1);
  const perDay = paceLimits[preferences.pace] || paceLimits.balanced;
  const startDate = preferences.startDate;

  const ranked = [...PLACE_CATALOG]
    .sort((a, b) => scorePlace(b, preferences) - scorePlace(a, preferences))
    .slice(0, dayCount * perDay);

  return Array.from({ length: dayCount }, (_, dayIndex) => {
    const date = addDaysISO(startDate, dayIndex);
    const places = ranked
      .slice(dayIndex * perDay, dayIndex * perDay + perDay)
      .map((place, placeIndex) => normalizeGeneratedPlace(place, date, placeIndex));

    return {
      date,
      title: `Día ${dayIndex + 1}`,
      places,
    };
  });
}

export function buildTemplatePlan(template, startDate) {
  return template.days.map((placeNames, dayIndex) => {
    const date = addDaysISO(startDate, dayIndex);
    return {
      date,
      title: template.name,
      places: placeNames
        .map(findCatalogPlace)
        .filter(Boolean)
        .map((place, placeIndex) => normalizeGeneratedPlace(place, date, placeIndex)),
    };
  });
}

export function parseImportText(input, selectedDate) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const csvParts = line.split(",").map((part) => part.trim());
    const urls = line.match(/https?:\/\/\S+/g) || [];

    if (csvParts.length >= 3 && Number.isFinite(Number(csvParts[2]))) {
      return {
        name: csvParts[0] || "Lugar importado",
        category: csvParts[1] || "otro",
        lat: Number(csvParts[2]),
        lng: Number(csvParts[3]) || 139.769,
        sourceUrl: csvParts[4] || urls[0] || "",
        notes: csvParts.slice(5).join(", "),
        date: selectedDate,
      };
    }

    const name = line.replace(/https?:\/\/\S+/g, "").replace(/^[-*]\s*/, "").trim();
    return {
      name: name || urls[0] || "Lugar importado",
      category: urls.length ? "otro" : "atraccion",
      sourceUrl: urls[0] || "",
      notes: line,
      date: selectedDate,
      lat: 35.6804,
      lng: 139.769,
    };
  });
}

function distanceKm(a, b) {
  const toRad = (value) => (value * Math.PI) / 180;
  const radius = 6371;
  const dLat = toRad(Number(b.lat) - Number(a.lat));
  const dLng = toRad(Number(b.lng) - Number(a.lng));
  const lat1 = toRad(Number(a.lat));
  const lat2 = toRad(Number(b.lat));
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * radius * Math.asin(Math.sqrt(h));
}

export function optimizePlacesByDistance(places) {
  const geoPlaces = places.filter(
    (place) =>
      Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng))
  );
  if (geoPlaces.length <= 2) return places.map((place) => place.id);

  const remaining = [...geoPlaces];
  const ordered = [remaining.shift()];

  while (remaining.length) {
    const last = ordered[ordered.length - 1];
    let bestIndex = 0;
    let bestDistance = Infinity;

    remaining.forEach((place, index) => {
      const candidateDistance = distanceKm(last, place);
      if (candidateDistance < bestDistance) {
        bestDistance = candidateDistance;
        bestIndex = index;
      }
    });

    ordered.push(remaining.splice(bestIndex, 1)[0]);
  }

  const orderedIds = ordered.map((place) => place.id);
  const nonGeoIds = places
    .filter((place) => !orderedIds.includes(place.id))
    .map((place) => place.id);
  return [...orderedIds, ...nonGeoIds];
}
