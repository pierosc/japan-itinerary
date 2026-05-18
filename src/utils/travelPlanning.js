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

function hasGeo(place) {
  return Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng));
}

function minutesFor(place) {
  return Number(place.durationMin) || 60;
}

function textFor(place) {
  return `${place.name || ""} ${place.notes || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isFullDay(place) {
  const text = textFor(place);
  return (
    minutesFor(place) >= 360 ||
    text.includes("full day") ||
    text.includes("dia completo") ||
    text.includes("todo el dia")
  );
}

function isMealPlace(place) {
  return ["restaurante", "cafe", "supermercado"].includes(place.category);
}

function timeHour(place) {
  const match = String(place.startTime || "").match(/^(\d{1,2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  return Number.isFinite(hour) ? hour : null;
}

function hasMeal(places, meal) {
  return places.some((place) => {
    if (!isMealPlace(place)) return false;
    const text = textFor(place);
    const hour = timeHour(place);

    if (meal === "desayuno") {
      return (
        text.includes("desayuno") ||
        text.includes("breakfast") ||
        place.category === "cafe" ||
        (hour != null && hour <= 10)
      );
    }

    if (meal === "almuerzo") {
      return (
        text.includes("almuerzo") ||
        text.includes("lunch") ||
        (hour != null && hour >= 11 && hour <= 15)
      );
    }

    return (
      text.includes("cena") ||
      text.includes("dinner") ||
      text.includes("izakaya") ||
      (hour != null && hour >= 17)
    );
  });
}

function orderNearestNeighbor(places, startPlace = null) {
  if (!places.length) return [];

  const remaining = [...places];
  const ordered = [];

  if (startPlace) {
    const index = remaining.findIndex((place) => place.id === startPlace.id);
    if (index >= 0) ordered.push(remaining.splice(index, 1)[0]);
    if (index < 0 && hasGeo(startPlace)) {
      let bestIndex = 0;
      let bestDistance = Infinity;
      remaining.forEach((place, placeIndex) => {
        const candidateDistance = distanceKm(startPlace, place);
        if (candidateDistance < bestDistance) {
          bestDistance = candidateDistance;
          bestIndex = placeIndex;
        }
      });
      ordered.push(remaining.splice(bestIndex, 1)[0]);
    }
  }

  if (!ordered.length) ordered.push(remaining.shift());

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

  return ordered;
}

export function buildIntelligentDayPlan(places) {
  const warnings = [];
  const geoPlaces = places.filter(hasGeo);
  const nonGeoPlaces = places.filter((place) => !hasGeo(place));
  const hotel = geoPlaces.find((place) => place.category === "hotel") || null;
  const fullDayPlaces = geoPlaces.filter(isFullDay);
  const regularPlaces = geoPlaces.filter((place) => {
    const isHotel = place.id === hotel?.id;
    const fullDay = fullDayPlaces.some((full) => full.id === place.id);
    return !isHotel && !fullDay;
  });

  if (!hotel) {
    warnings.push({
      tone: "warning",
      text: "Falta registrar el punto de partida del dia. Agrega el hotel con categoria Hotel para ordenar desde ahi.",
    });
  }

  if (!hasMeal(places, "desayuno")) {
    warnings.push({
      tone: "info",
      text: "Falta un lugar claro para desayunar.",
    });
  }
  if (!hasMeal(places, "almuerzo")) {
    warnings.push({
      tone: "info",
      text: "Falta un lugar claro para almorzar.",
    });
  }
  if (!hasMeal(places, "cena")) {
    warnings.push({
      tone: "info",
      text: "Falta un lugar claro para cenar.",
    });
  }

  const totalMinutes = places.reduce((sum, place) => sum + minutesFor(place), 0);
  if (totalMinutes > 720) {
    warnings.push({
      tone: "warning",
      text: `Este dia suma ${Math.round(totalMinutes / 60)} h de estancias. Puede quedar demasiado cargado.`,
    });
  }

  if (fullDayPlaces.length) {
    warnings.push({
      tone: "warning",
      text:
        fullDayPlaces.length === 1
          ? `${fullDayPlaces[0].name} parece ser full day; lo deje como ancla temprano.`
          : `Hay ${fullDayPlaces.length} puntos tipo full day. Revisa si realmente caben juntos.`,
    });
  }

  if (nonGeoPlaces.length) {
    warnings.push({
      tone: "warning",
      text: `${nonGeoPlaces.length} punto(s) no tienen lat/lng validas; quedan al final del orden.`,
    });
  }

  const orderedFullDay = orderNearestNeighbor(fullDayPlaces, hotel || geoPlaces[0]);
  const startAfterAnchors =
    orderedFullDay[orderedFullDay.length - 1] || hotel || geoPlaces[0] || null;
  const orderedRegular = orderNearestNeighbor(regularPlaces, startAfterAnchors);
  const ordered = [
    ...(hotel ? [hotel] : []),
    ...orderedFullDay.filter((place) => place.id !== hotel?.id),
    ...orderedRegular,
    ...nonGeoPlaces,
  ];

  return {
    orderedIds: ordered.map((place) => place.id),
    warnings,
  };
}

function travelMinutesBetween(from, to) {
  if (!from || !to || !hasGeo(from) || !hasGeo(to)) return 0;
  const mixedCitySpeedKmh = 18;
  return Math.round((distanceKm(from, to) / mixedCitySpeedKmh) * 60);
}

function nearestPlace(places, origin) {
  if (!places.length) return null;
  if (!origin || !hasGeo(origin)) return places[0];

  return places.reduce((best, place) => {
    const bestDistance = distanceKm(origin, best);
    const placeDistance = distanceKm(origin, place);
    return placeDistance < bestDistance ? place : best;
  }, places[0]);
}

function orderTripPlacesByDistance(places, anchors) {
  const remaining = [...places];
  const ordered = [];
  let cursor = anchors.find(hasGeo) || remaining[0] || null;

  while (remaining.length) {
    const next = nearestPlace(remaining, cursor);
    ordered.push(next);
    remaining.splice(
      remaining.findIndex((place) => place.id === next.id),
      1
    );
    cursor = next;
  }

  return ordered;
}

function createDayPlan(date, index, hotel = null) {
  return {
    date,
    index,
    hotel,
    orderedIds: [],
    totalMinutes: 0,
    transitMinutes: 0,
  };
}

function isHotelActiveForDate(hotel, date) {
  const checkIn = hotel.checkInDate || hotel.date || "";
  const checkOut = hotel.checkOutDate || checkIn;

  if (!checkIn) return false;
  return date >= checkIn && date <= checkOut;
}

function addPlaceToDay(day, place) {
  const previousId = day.orderedIds[day.orderedIds.length - 1];
  const previous = day._placesById?.get(previousId) || day.hotel || null;
  const transit = travelMinutesBetween(previous, place);

  day.orderedIds.push(place.id);
  day.totalMinutes += minutesFor(place) + transit;
  day.transitMinutes += transit;
}

export function buildIntelligentTripPlan(places, days) {
  const activeDays = Array.isArray(days) && days.length ? [...days].sort() : [];
  const warnings = [];

  if (!activeDays.length) {
    return { dayPlans: [], warnings };
  }

  const realPlaces = places.filter((place) => !place.previewDate);
  const placesById = new Map(realPlaces.map((place) => [place.id, place]));
  const geoPlaces = realPlaces.filter(hasGeo);
  const nonGeoPlaces = realPlaces.filter((place) => !hasGeo(place));
  const hotels = geoPlaces.filter((place) => place.category === "hotel");
  const visitPlaces = geoPlaces.filter((place) => place.category !== "hotel");
  const nonGeoVisitPlaces = nonGeoPlaces.filter((place) => place.category !== "hotel");
  const orderedVisits = orderTripPlacesByDistance(visitPlaces, hotels);
  const totalVisitMinutes = realPlaces.reduce(
    (sum, place) => (place.category === "hotel" ? sum : sum + minutesFor(place)),
    0
  );
  const targetDayMinutes = Math.max(
    360,
    Math.min(660, Math.ceil(totalVisitMinutes / activeDays.length))
  );

  if (!hotels.length) {
    warnings.push({
      tone: "warning",
      text: "Falta registrar un hotel como punto de partida del viaje.",
    });
  }

  if (nonGeoPlaces.length) {
    warnings.push({
      tone: "warning",
      text: `${nonGeoPlaces.length} punto(s) no tienen lat/lng validas; los reparti en los dias con menos carga.`,
    });
  }

  const dayPlans = activeDays.map((date, index) => {
    const hotelForDate =
      hotels.find((place) => isHotelActiveForDate(place, date)) ||
      hotels.find((place) => place.date === date) ||
      hotels[0] ||
      null;
    const plan = createDayPlan(date, index, hotelForDate);
    plan._placesById = placesById;
    return plan;
  });

  let dayIndex = 0;
  orderedVisits.forEach((place) => {
    const current = dayPlans[dayIndex];
    const previousId = current.orderedIds[current.orderedIds.length - 1];
    const previous = placesById.get(previousId) || current.hotel || null;
    const projected =
      current.totalMinutes + minutesFor(place) + travelMinutesBetween(previous, place);
    const shouldMoveDay =
      current.orderedIds.length > 0 &&
      dayIndex < dayPlans.length - 1 &&
      (projected > targetDayMinutes + 90 || isFullDay(place));

    if (shouldMoveDay) dayIndex += 1;

    addPlaceToDay(dayPlans[dayIndex], place);

    if (isFullDay(place) && dayIndex < dayPlans.length - 1) {
      dayIndex += 1;
    }
  });

  nonGeoVisitPlaces.forEach((place) => {
    const lightest = dayPlans.reduce((best, day) =>
      day.totalMinutes < best.totalMinutes ? day : best
    );
    lightest.orderedIds.push(place.id);
    lightest.totalMinutes += minutesFor(place);
  });

  dayPlans.forEach((day, index) => {
    const dayPlaces = day.orderedIds.map((id) => placesById.get(id)).filter(Boolean);
    const dayLabel = `Dia ${index + 1}`;

    if (day.totalMinutes > 720) {
      warnings.push({
        date: day.date,
        tone: "warning",
        text: `${dayLabel} queda cargado: aprox. ${Math.round(
          day.totalMinutes / 60
        )} h entre estancias y traslados.`,
      });
    }

    const fullDayPlaces = dayPlaces.filter(isFullDay);
    if (fullDayPlaces.length > 1) {
      warnings.push({
        date: day.date,
        tone: "warning",
        text: `${dayLabel} tiene mas de un punto full day. Revisa si conviene mover uno.`,
      });
    }

    if (!hasMeal(dayPlaces, "desayuno")) {
      warnings.push({
        date: day.date,
        tone: "info",
        text: `${dayLabel}: falta un lugar claro para desayunar.`,
      });
    }
    if (!hasMeal(dayPlaces, "almuerzo")) {
      warnings.push({
        date: day.date,
        tone: "info",
        text: `${dayLabel}: falta un lugar claro para almorzar.`,
      });
    }
    if (!hasMeal(dayPlaces, "cena")) {
      warnings.push({
        date: day.date,
        tone: "info",
        text: `${dayLabel}: falta un lugar claro para cenar.`,
      });
    }
  });

  return {
    dayPlans: dayPlans.map((day) => ({
      date: day.date,
      index: day.index,
      hotel: day.hotel,
      orderedIds: day.orderedIds,
      totalMinutes: day.totalMinutes,
      transitMinutes: day.transitMinutes,
    })),
    warnings,
    targetDayMinutes,
  };
}
