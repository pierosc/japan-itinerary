// src/hooks/useItineraryStore.js
import { create } from "zustand";
import { v4 as uuid } from "uuid";

const speedsKmh = { walk: 4.5, train: 60, car: 35 };
const UI_PREFS_KEY = "trip-planner:ui-prefs";

function loadUIPrefs() {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(UI_PREFS_KEY) || "{}");
  } catch (err) {
    console.warn("Error leyendo preferencias de UI", err);
    return {};
  }
}

function saveUIPrefs(patch) {
  if (typeof localStorage === "undefined") return;
  try {
    const prev = loadUIPrefs();
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify({ ...prev, ...patch }));
  } catch (err) {
    console.warn("Error guardando preferencias de UI", err);
  }
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
const D0 = todayISO();
const initialUIPrefs = loadUIPrefs();
const defaultCurrency = { code: "USD", ratePerJPY: 0.0065 };
const AIRPORT_CATEGORY = "airport";
const DEFAULT_ANCHOR_TIME = "12:00";
const AIRPORT_ROLES = {
  arrival: "Aeropuerto de llegada",
  departure: "Aeropuerto de salida",
};
const HOTEL_ENDPOINT_LABELS = {
  checkin: "Check-in",
  checkout: "Check-out",
};

function sortedUniqueDays(days) {
  return [...new Set((Array.isArray(days) ? days : []).filter(Boolean))].sort();
}

function createAirportEndpoint(role, date) {
  return {
    id: uuid(),
    type: "place",
    name: AIRPORT_ROLES[role],
    category: AIRPORT_CATEGORY,
    airportRole: role,
    date,
    startTime: DEFAULT_ANCHOR_TIME,
    durationMin: 0,
    images: [],
    notes: "",
  };
}

function isHotelEndpoint(place) {
  return place.category === "hotel" && Boolean(place.hotelEndpointRole);
}

function isBaseHotel(place) {
  return place.category === "hotel" && !isHotelEndpoint(place);
}

function isLockedItineraryAnchor(place) {
  return (
    (place.category === AIRPORT_CATEGORY &&
      ["arrival", "departure"].includes(place.airportRole)) ||
    isHotelEndpoint(place)
  );
}

function stableHotelEndpointId(hotel, role) {
  return `hotel-endpoint:${hotel.id}:${role}`;
}

function hotelEndpointName(hotel, role) {
  const hotelName = (hotel.name || "Hotel").trim();
  return `${HOTEL_ENDPOINT_LABELS[role]}: ${hotelName}`;
}

function createHotelEndpoint(hotel, role) {
  const isCheckIn = role === "checkin";
  return {
    id: stableHotelEndpointId(hotel, role),
    type: "place",
    category: "hotel",
    hotelEndpointRole: role,
    hotelSourceId: hotel.id,
    name: hotelEndpointName(hotel, role),
    date: isCheckIn ? hotel.checkInDate || hotel.date || null : hotel.checkOutDate || null,
    startTime: isCheckIn
      ? hotel.checkInTime || DEFAULT_ANCHOR_TIME
      : hotel.checkOutTime || DEFAULT_ANCHOR_TIME,
    durationMin: 0,
    spendJPY: 0,
    lat: hotel.lat,
    lng: hotel.lng,
    mapMode: hotel.mapMode,
    mapX: hotel.mapX,
    mapY: hotel.mapY,
    sourceUrl: hotel.sourceUrl,
    images: [],
    notes: isCheckIn ? "Punto automatico de check-in." : "Punto automatico de check-out.",
  };
}

function pickAirportEndpoint(places, role, reservedIds) {
  const explicit = places.find(
    (place) => place.airportRole === role && !reservedIds.has(place.id)
  );
  if (explicit) {
    reservedIds.add(explicit.id);
    return explicit;
  }

  const candidates = places.filter(
    (place) =>
      place.category === AIRPORT_CATEGORY &&
      !place.airportRole &&
      !reservedIds.has(place.id)
  );
  const fallback =
    role === "arrival" ? candidates[0] : candidates[candidates.length - 1];

  if (fallback) reservedIds.add(fallback.id);
  return fallback || null;
}

function normalizeAirportEndpoint(place, role, date) {
  return {
    ...place,
    type: "place",
    name: (place.name || "").trim() ? place.name : AIRPORT_ROLES[role],
    category: AIRPORT_CATEGORY,
    airportRole: role,
    date,
    previewDate: null,
    startTime: place.startTime || DEFAULT_ANCHOR_TIME,
    durationMin: place.durationMin ?? 0,
    images: Array.isArray(place.images) ? place.images : [],
  };
}

function normalizeBaseHotel(place) {
  return {
    ...place,
    type: "place",
    category: "hotel",
    checkInDate: place.checkInDate || place.date || "",
    date: null,
    checkInTime: place.checkInTime || DEFAULT_ANCHOR_TIME,
    checkOutTime: place.checkOutTime || DEFAULT_ANCHOR_TIME,
    durationMin: place.durationMin ?? 0,
    images: Array.isArray(place.images) ? place.images : [],
  };
}

function buildHotelEndpoints(places, days) {
  const activeDaySet = new Set(days);
  return places
    .filter(isBaseHotel)
    .flatMap((hotel) => {
      const endpoints = [];
      if ((hotel.checkInDate || hotel.date) && activeDaySet.has(hotel.checkInDate || hotel.date)) {
        endpoints.push(createHotelEndpoint(hotel, "checkin"));
      }
      if (hotel.checkOutDate && activeDaySet.has(hotel.checkOutDate)) {
        endpoints.push(createHotelEndpoint(hotel, "checkout"));
      }
      return endpoints;
    })
    .filter((endpoint) => endpoint.date);
}

function orderPlacesWithAnchors(places, days) {
  const firstDate = days[0];
  const lastDate = days[days.length - 1];
  const arrival = places.find((place) => place.airportRole === "arrival");
  const departure = places.find((place) => place.airportRole === "departure");
  const ordered = [];
  const pushed = new Set();

  days.forEach((date) => {
    if (date === firstDate && arrival?.date === date) {
      ordered.push(arrival);
      pushed.add(arrival.id);
    }

    places.forEach((place) => {
      if (pushed.has(place.id)) return;
      if (place.date !== date) return;
      if (place.hotelEndpointRole !== "checkout") return;
      ordered.push(place);
      pushed.add(place.id);
    });

    places.forEach((place) => {
      if (pushed.has(place.id)) return;
      if (place.date !== date) return;
      if (place.id === arrival?.id || place.id === departure?.id) return;
      if (isLockedItineraryAnchor(place)) return;
      ordered.push(place);
      pushed.add(place.id);
    });

    places.forEach((place) => {
      if (pushed.has(place.id)) return;
      if (place.date !== date) return;
      if (place.hotelEndpointRole !== "checkin") return;
      ordered.push(place);
      pushed.add(place.id);
    });

    if (date === lastDate && departure?.date === date && !pushed.has(departure.id)) {
      ordered.push(departure);
      pushed.add(departure.id);
    }
  });

  places.forEach((place) => {
    if (pushed.has(place.id)) return;
    ordered.push(place);
  });

  return ordered;
}

function pruneRoutesForPlaceDates(routes, places) {
  const dateById = new Map(places.map((place) => [place.id, place.date]));
  return (routes || []).filter((route) => {
    const fromDate = dateById.get(route.fromId);
    const toDate = dateById.get(route.toId);
    return Boolean(route.date && fromDate && toDate && fromDate === route.date && toDate === route.date);
  });
}

function normalizeAirportEndpoints(state) {
  const days = sortedUniqueDays(state.days);
  const safeDays = days.length ? days : [todayISO()];
  const firstDate = safeDays[0];
  const lastDate = safeDays[safeDays.length - 1];
  const sourcePlaces = (Array.isArray(state.places) ? state.places : []).filter(
    (place) => !isHotelEndpoint(place)
  );
  const reservedIds = new Set();
  let arrival = pickAirportEndpoint(sourcePlaces, "arrival", reservedIds);
  let departure = pickAirportEndpoint(sourcePlaces, "departure", reservedIds);
  const additions = [];

  if (!arrival) {
    arrival = createAirportEndpoint("arrival", firstDate);
    additions.push(arrival);
    reservedIds.add(arrival.id);
  }

  if (!departure) {
    departure = createAirportEndpoint("departure", lastDate);
    additions.push(departure);
    reservedIds.add(departure.id);
  }

  const normalizedPlaces = [...sourcePlaces, ...additions].map((place) => {
    if (place.id === arrival.id) {
      return normalizeAirportEndpoint(place, "arrival", firstDate);
    }
    if (place.id === departure.id) {
      return normalizeAirportEndpoint(place, "departure", lastDate);
    }

    if (place.airportRole === "arrival" || place.airportRole === "departure") {
      const rest = { ...place };
      delete rest.airportRole;
      return rest;
    }

    if (isBaseHotel(place)) {
      return normalizeBaseHotel(place);
    }

    return place;
  });

  const places = orderPlacesWithAnchors(
    [...normalizedPlaces, ...buildHotelEndpoints(normalizedPlaces, safeDays)],
    safeDays
  );
  const validPlaceIds = new Set(places.map((place) => place.id));
  const selectedDate = safeDays.includes(state.selectedDate)
    ? state.selectedDate
    : firstDate;

  return {
    days: safeDays,
    places,
    routes: pruneRoutesForPlaceDates(state.routes, places),
    selectedDate,
    selectedId: validPlaceIds.has(state.selectedId) ? state.selectedId : null,
  };
}

function withAirportEndpoints(state, patch) {
  return {
    ...patch,
    ...normalizeAirportEndpoints({ ...state, ...patch }),
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function duplicateNameFor(name, places) {
  const baseName =
    (name || "Lugar sin nombre").trim().replace(/\s+\((\d+)\)$/, "") ||
    "Lugar sin nombre";
  const pattern = new RegExp(`^${escapeRegExp(baseName)}(?: \\((\\d+)\\))?$`);
  const highestSuffix = places.reduce((highest, place) => {
    const match = pattern.exec((place.name || "").trim());
    if (!match) return highest;
    return Math.max(highest, match[1] ? Number(match[1]) || 0 : 0);
  }, 0);

  return `${baseName} (${highestSuffix + 1})`;
}

function clonePlaceForDuplicate(place, name, date) {
  const duplicate = {
    ...place,
    id: uuid(),
    name,
    date,
    previewDate: null,
    images: (place.images || []).map((image) => ({ ...image })),
    items: (place.items || []).map((item) => ({ ...item, id: uuid() })),
  };

  delete duplicate.airportRole;
  delete duplicate.hotelEndpointRole;
  delete duplicate.hotelSourceId;

  return duplicate;
}

export const useItineraryStore = create((set, get) => ({
  // ===== Datos base =====
  places: [
    createAirportEndpoint("arrival", D0),
    createAirportEndpoint("departure", D0),
  ],
  routes: [],
  expenses: [],
  dayMaps: {},
  dayTitles: {},

  days: [D0],
  selectedDate: D0,
  selectedId: null,
  smartTripPreviewPlan: null,
  smartTripUndoSnapshot: null,

  // Conversión de moneda
  currency: initialUIPrefs.currency || defaultCurrency,

  // Packing list
  packingItems: [
    { id: uuid(), label: "Pasaporte", done: false },
    { id: uuid(), label: "Tarjeta de embarque / QR", done: false },
    { id: uuid(), label: "Tarjeta de débito/crédito", done: false },
  ],

  // Colaboradores (UI-only, no hay backend todavía)
  collaborators: [], // { id, nameOrEmail }

  // ===== UI global =====
  ui: {
    showMap: true,
    financeOpen: true,
    routeVisible: true,
    basemap: "carto-en",
    clickToAddEnabled: false,
    mapTilerKey: "",
    sidebarTab: "itinerary", // itinerary | myplaces | finance | settings | users | packing
    theme: initialUIPrefs.theme || "light", // light por defecto
    storageMode: "online", // "local" | "online" (online por defecto)
    autoSaveEnabled: true,
    autoSaveIntervalMin: 3,
  },

  // ====== Acciones UI ======
  setShowMap: (v) => set((s) => ({ ui: { ...s.ui, showMap: v } })),
  setFinanceOpen: (v) => set((s) => ({ ui: { ...s.ui, financeOpen: v } })),
  toggleFinance: () =>
    set((s) => ({ ui: { ...s.ui, financeOpen: !s.ui.financeOpen } })),
  toggleRoute: () =>
    set((s) => ({ ui: { ...s.ui, routeVisible: !s.ui.routeVisible } })),
  setBasemap: (basemap) => set((s) => ({ ui: { ...s.ui, basemap } })),
  setClickToAddEnabled: (enabled) =>
    set((s) => ({ ui: { ...s.ui, clickToAddEnabled: enabled } })),
  toggleClickToAdd: () =>
    set((s) => ({
      ui: { ...s.ui, clickToAddEnabled: !s.ui.clickToAddEnabled },
    })),
  setMapTilerKey: (k) => set((s) => ({ ui: { ...s.ui, mapTilerKey: k } })),
  setSidebarTab: (tab) => set((s) => ({ ui: { ...s.ui, sidebarTab: tab } })),
  setTheme: (theme) => {
    saveUIPrefs({ theme });
    set((s) => ({ ui: { ...s.ui, theme } }));
  },
  toggleTheme: () =>
    set((s) => {
      const theme = s.ui.theme === "light" ? "dark" : "light";
      saveUIPrefs({ theme });
      return {
        ui: {
          ...s.ui,
          theme,
        },
      };
    }),
  setStorageMode: (mode) =>
    set((s) => ({ ui: { ...s.ui, storageMode: mode } })),
  setAutoSaveEnabled: (v) =>
    set((s) => ({ ui: { ...s.ui, autoSaveEnabled: v } })),
  setAutoSaveInterval: (min) =>
    set((s) => ({
      ui: { ...s.ui, autoSaveIntervalMin: Number(min) || 1 },
    })),

  // ====== Días ======
  setSelectedDate: (date) => {
    const state = get();
    set(
      withAirportEndpoints(state, {
        days: state.days.includes(date) ? state.days : [...state.days, date],
        selectedDate: date,
        selectedId: null,
      })
    );
  },

  addDay: (date) => {
    if (!date) return;
    set((s) =>
      withAirportEndpoints(s, {
        days: s.days.includes(date) ? s.days : [...s.days, date],
        selectedDate: date,
        selectedId: null,
      })
    );
  },

  removeDay: (date) => {
    const { days, places, routes, expenses, dayMaps, dayTitles } = get();
    const remaining = days.filter((d) => d !== date);
    const fallbackDate = remaining.length ? remaining[0] : todayISO();
    const nextDayMaps = { ...dayMaps };
    const nextDayTitles = { ...dayTitles };
    delete nextDayMaps[date];
    delete nextDayTitles[date];
    set((s) =>
      withAirportEndpoints(s, {
        days: remaining.length ? remaining : [fallbackDate],
        places: places.map((p) => (p.date === date ? { ...p, date: null } : p)),
        routes: routes.filter((r) => r.date !== date),
        expenses: expenses.filter((e) => e.date !== date),
        dayMaps: nextDayMaps,
        dayTitles: nextDayTitles,
        selectedDate: fallbackDate,
        selectedId: null,
      })
    );
  },

  renameDay: (fromDate, toDate) =>
    set((s) => {
      if (!fromDate || !toDate || fromDate === toDate) return {};
      const days = s.days.map((d) => (d === fromDate ? toDate : d));
      const uniqueDays = [...new Set(days)].sort();

      const dayTitles = { ...(s.dayTitles || {}) };
      if (dayTitles[fromDate]) {
        dayTitles[toDate] = dayTitles[fromDate];
        delete dayTitles[fromDate];
      }

      return withAirportEndpoints(s, {
        days: uniqueDays.length ? uniqueDays : [todayISO()],
        selectedDate: s.selectedDate === fromDate ? toDate : s.selectedDate,
        places: s.places.map((p) =>
          p.date === fromDate ? { ...p, date: toDate } : p
        ),
        routes: s.routes.map((r) =>
          r.date === fromDate ? { ...r, date: toDate } : r
        ),
        expenses: s.expenses.map((e) =>
          e.date === fromDate ? { ...e, date: toDate } : e
        ),
        dayMaps: Object.fromEntries(
          Object.entries(s.dayMaps || {}).map(([date, map]) => [
            date === fromDate ? toDate : date,
            map,
          ])
        ),
        dayTitles,
      });
    }),

  setDayTitle: (date, title) =>
    set((s) => ({
      dayTitles: {
        ...(s.dayTitles || {}),
        [date]: title,
      },
    })),

  setDayMap: (date, map) =>
    set((s) => ({
      dayMaps: {
        ...s.dayMaps,
        [date]: {
          ...(s.dayMaps?.[date] || {}),
          ...map,
          updatedAt: new Date().toISOString(),
        },
      },
    })),

  removeDayMap: (date) =>
    set((s) => {
      const next = { ...(s.dayMaps || {}) };
      delete next[date];
      return withAirportEndpoints(s, {
        dayMaps: next,
        places: s.places.map((p) =>
          p.date === date && p.mapMode === "image"
            ? { ...p, date: null, previewDate: null }
            : p
        ),
        selectedId:
          s.places.find((p) => p.id === s.selectedId)?.date === date
            ? null
            : s.selectedId,
      });
    }),

  // ====== Lugares ======
  setSelected: (id) => set({ selectedId: id }),
  setSmartTripPreviewPlan: (plan) => set({ smartTripPreviewPlan: plan }),
  setSmartTripUndoSnapshot: (snapshot) => set({ smartTripUndoSnapshot: snapshot }),

  addPlace: (place) => {
    const id = uuid();
    set((s) =>
      withAirportEndpoints(s, {
        places: [
          ...s.places,
          {
            id,
            type: "place",
            date:
              place.date !== undefined && place.date !== null
                ? place.date
                : s.selectedDate,
            images: [],
            ...place,
          },
        ],
      })
    );
    return id;
  },

  updatePlace: (id, patch) =>
    set((s) =>
      withAirportEndpoints(s, {
        places: s.places.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      })
    ),

  removePlace: (id) =>
    set((s) =>
      withAirportEndpoints(s, {
        places: s.places.filter((p) => p.id !== id),
        routes: s.routes.filter((r) => r.fromId !== id && r.toId !== id),
        selectedId: s.selectedId === id ? null : s.selectedId,
      })
    ),

  duplicatePlace: (id) => {
    const state = get();
    const index = state.places.findIndex((place) => place.id === id);
    if (index === -1) return null;

    const place = state.places[index];
    const date = place.date ?? state.selectedDate;
    const duplicate = clonePlaceForDuplicate(
      place,
      duplicateNameFor(place.name, state.places),
      date
    );

    set((s) => {
      const currentIndex = s.places.findIndex((candidate) => candidate.id === id);
      if (currentIndex === -1) return {};

      const currentPlace = s.places[currentIndex];
      const currentDate = currentPlace.date ?? s.selectedDate;
      const nextPlaces = [...s.places];
      nextPlaces.splice(currentIndex + 1, 0, duplicate);

      const visiblePlacesForDate = s.places.filter(
        (candidate) =>
          candidate.date === currentDate && candidate.category !== "hotel"
      );
      const placeIndexForDate = visiblePlacesForDate.findIndex(
        (candidate) => candidate.id === id
      );
      const nextPlaceForDate = visiblePlacesForDate[placeIndexForDate + 1];
      const routes = nextPlaceForDate
        ? s.routes.filter(
            (route) =>
              !(
                route.date === currentDate &&
                route.fromId === id &&
                route.toId === nextPlaceForDate.id
              )
          )
        : s.routes;

      return withAirportEndpoints(s, {
        places: nextPlaces,
        routes,
        selectedId: duplicate.id,
      });
    });

    return duplicate.id;
  },

  // ====== My Places ======
  unassignedPlaces: () => {
    const { places } = get();
    return places.filter((p) => !p.date);
  },

  addUnassignedPlace: (place) => {
    const id = uuid();
    set((s) =>
      withAirportEndpoints(s, {
        places: [
          ...s.places,
          {
            id,
            type: "place",
            date: null,
            images: [],
            ...place,
          },
        ],
      })
    );
    return id;
  },

  assignPlaceToDay: (id, date) =>
    set((s) => {
      const days = s.days.includes(date) ? s.days : [...s.days, date];
      const place = s.places.find((p) => p.id === id);
      if (!place) return {};

      const updated = { ...place, date };
      const others = s.places.filter((p) => p.id !== id);

      return withAirportEndpoints(s, {
        days,
        places: [...others, updated],
      });
    }),

  // ====== Reordenar lugares ======
  reorderPlacesForDate: (date, orderedIds) =>
    set((s) => {
      const others = s.places.filter((p) => p.date !== date);
      const same = s.places.filter((p) => p.date === date);
      const locked = same.filter(isLockedItineraryAnchor);
      const ordered = orderedIds
        .map((id) => same.find((p) => p.id === id))
        .filter(Boolean);
      const orderedSet = new Set(ordered.map((place) => place.id));
      const unmentioned = same.filter(
        (place) => !isLockedItineraryAnchor(place) && !orderedSet.has(place.id)
      );
      const finalSame = orderPlacesWithAnchors(
        [...locked, ...ordered, ...unmentioned],
        [date]
      );

      const newPairs = new Set(
        finalSame
          .map((p, i) =>
            i < finalSame.length - 1 ? `${p.id}|${finalSame[i + 1].id}` : null
          )
          .filter(Boolean)
      );
      const keepRoutes = s.routes.filter(
        (r) => r.date !== date || newPairs.has(`${r.fromId}|${r.toId}`)
      );

      return withAirportEndpoints(s, {
        places: [...others, ...finalSame],
        routes: keepRoutes,
      });
    }),

  applyTripOrganization: (dayPlans) =>
    set((s) => {
      const dateById = new Map();
      const orderById = new Map();

      dayPlans.forEach((day) => {
        (day.orderedIds || []).forEach((id, index) => {
          dateById.set(id, day.date);
          orderById.set(id, index);
        });
      });

      const plannedIds = new Set(dateById.keys());
      const plannedPlaces = s.places
        .filter((place) => plannedIds.has(place.id))
        .map((place) => ({ ...place, date: dateById.get(place.id), previewDate: null }))
        .sort((a, b) => {
          const dateCompare = String(a.date).localeCompare(String(b.date));
          if (dateCompare !== 0) return dateCompare;
          return (orderById.get(a.id) || 0) - (orderById.get(b.id) || 0);
        });
      const unplannedPlaces = s.places.filter((place) => !plannedIds.has(place.id));

      const validRoutePairs = new Set();
      dayPlans.forEach((day) => {
        (day.orderedIds || []).forEach((id, index, ids) => {
          if (index < ids.length - 1) validRoutePairs.add(`${day.date}|${id}|${ids[index + 1]}`);
        });
      });

      return withAirportEndpoints(s, {
        places: [...plannedPlaces, ...unplannedPlaces],
        routes: s.routes.filter((route) =>
          validRoutePairs.has(`${route.date}|${route.fromId}|${route.toId}`)
        ),
        selectedDate: dayPlans[0]?.date || s.selectedDate,
        selectedId: null,
        smartTripPreviewPlan: null,
      });
    }),

  restoreTripOrganization: (snapshot) =>
    set((s) =>
      withAirportEndpoints(s, {
        places: snapshot.places || [],
        routes: snapshot.routes || [],
        selectedDate: snapshot.selectedDate,
        selectedId: snapshot.selectedId || null,
        smartTripPreviewPlan: null,
        smartTripUndoSnapshot: null,
      })
    ),

  // ====== Rutas ======
  addRouteBetween: (date, fromId, toId, mode = "walk", geojson = null) =>
    set((s) => ({
      routes: [
        ...s.routes,
        { id: uuid(), type: "route", date, fromId, toId, mode, geojson },
      ],
    })),

  updateRoute: (id, patch) =>
    set((s) => ({
      routes: s.routes.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })),

  removeRoute: (id) =>
    set((s) => ({ routes: s.routes.filter((r) => r.id !== id) })),

  // ====== Gastos del viaje ======
  addExpense: (expense) =>
    set((s) => ({
      expenses: [
        ...s.expenses,
        {
          id: uuid(),
          type: "expense",
          date: expense.date || s.selectedDate,
          kind: expense.kind || "personal",
          title: expense.title?.trim() || "Gasto",
          amountJPY: Number(expense.amountJPY) || 0,
          paidBy: expense.paidBy?.trim() || "Yo",
          participants: Array.isArray(expense.participants)
            ? expense.participants.filter(Boolean)
            : [],
          notes: expense.notes || "",
        },
      ],
    })),

  updateExpense: (id, patch) =>
    set((s) => ({
      expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),

  removeExpense: (id) =>
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

  expensesBySelectedDate: () => {
    const { expenses, selectedDate } = get();
    return expenses.filter((e) => e.date === selectedDate);
  },

  totalExpenseJPYForDate: (date) =>
    get()
      .expenses.filter((e) => e.date === date)
      .reduce((acc, e) => acc + (Number(e.amountJPY) || 0), 0),

  totalExpenseJPYAll: () =>
    get().expenses.reduce((acc, e) => acc + (Number(e.amountJPY) || 0), 0),

  // ====== Packing list ======
  addPackingItem: (label) =>
    set((s) => ({
      packingItems: [
        ...s.packingItems,
        { id: uuid(), label: label.trim(), done: false },
      ],
    })),
  togglePackingItem: (id) =>
    set((s) => ({
      packingItems: s.packingItems.map((i) =>
        i.id === id ? { ...i, done: !i.done } : i
      ),
    })),
  removePackingItem: (id) =>
    set((s) => ({
      packingItems: s.packingItems.filter((i) => i.id !== id),
    })),
  clearPackingList: () => set({ packingItems: [] }),

  // ====== Colaboradores (solo UI) ======
  addCollaborator: (nameOrEmail) =>
    set((s) => ({
      collaborators: [
        ...s.collaborators,
        { id: uuid(), nameOrEmail: nameOrEmail.trim() },
      ],
    })),
  removeCollaborator: (id) =>
    set((s) => ({
      collaborators: s.collaborators.filter((c) => c.id !== id),
    })),

  // ====== Selectores ======
  placesBySelectedDate: () => {
    const { places, selectedDate, selectedId } = get();
    return places.filter(
      (p) =>
        p.date === selectedDate ||
        (p.previewDate === selectedDate && p.id === selectedId)
    );
  },

  routesBySelectedDate: () => {
    const { routes, selectedDate } = get();
    return routes.filter((r) => r.date === selectedDate);
  },

  // ====== Totales ======
  totalJPYForDate: (date) => {
    const { places, routes } = get();
    const placesJPY = places
      .filter((p) => p.date === date)
      .reduce((acc, p) => acc + (Number(p.spendJPY) || 0), 0);
    const routesJPY = routes
      .filter((r) => r.date === date)
      .reduce((acc, r) => acc + (Number(r.priceJPY) || 0), 0);
    return placesJPY + routesJPY;
  },

  totalJPYAll: () => {
    const { places, routes } = get();
    const placesJPY = places.reduce(
      (acc, p) => acc + (Number(p.spendJPY) || 0),
      0
    );
    const routesJPY = routes.reduce(
      (acc, r) => acc + (Number(r.priceJPY) || 0),
      0
    );
    return placesJPY + routesJPY;
  },

  // ====== Export / Import ======
  clearAll: () =>
    set((s) => {
      const date = todayISO();
      return withAirportEndpoints(s, {
        places: [],
        routes: [],
        expenses: [],
        dayMaps: {},
        dayTitles: {},
        selectedId: null,
        days: [date],
        selectedDate: date,
        packingItems: [],
        collaborators: [],
      });
    }),

  exportJSON: () => {
    const {
      places,
      routes,
      expenses,
      dayMaps,
      dayTitles,
      days,
      selectedDate,
      currency,
      ui,
      packingItems,
      collaborators,
    } = get();
    return JSON.stringify(
      {
        version: 10,
        country: "Japan",
        days,
        selectedDate,
        currency,
        ui,
        places,
        routes,
        expenses,
        dayMaps,
        dayTitles,
        packingItems,
        collaborators,
      },
      null,
      2
    );
  },

  importJSON: (jsonStr) => {
    const data = JSON.parse(jsonStr);
    const days =
      Array.isArray(data.days) && data.days.length
        ? data.days
        : [...new Set((data.places || []).map((p) => p.date).filter(Boolean))];

    const prevState = get();
    const prevUi = prevState.ui;

    set((s) =>
      withAirportEndpoints(s, {
      places: (data.places || []).map((p) => ({
        id: p.id ?? uuid(),
        type: "place",
        images: [],
        ...p,
      })),
      routes: (data.routes || []).map((r) => ({
        id: r.id ?? uuid(),
        type: "route",
        ...r,
      })),
      expenses: (data.expenses || []).map((e) => ({
        id: e.id ?? uuid(),
        type: "expense",
        kind: e.kind || "personal",
        participants: Array.isArray(e.participants) ? e.participants : [],
        ...e,
      })),
      dayMaps: data.dayMaps || {},
      dayTitles: data.dayTitles || {},
      selectedId: null,
      days: days.length ? days : [todayISO()],
      selectedDate: data.selectedDate ?? days[0] ?? todayISO(),
      currency: prevState.currency || data.currency || defaultCurrency,
      ui: {
        ...prevUi,
        theme: prevUi.theme || initialUIPrefs.theme || data.ui?.theme || "light",
        financeOpen: data.ui?.financeOpen ?? prevUi.financeOpen ?? true,
        autoSaveEnabled:
          data.ui?.autoSaveEnabled ?? prevUi.autoSaveEnabled ?? true,
        autoSaveIntervalMin:
          data.ui?.autoSaveIntervalMin ?? prevUi.autoSaveIntervalMin ?? 3,
      },
      packingItems: (data.packingItems || []).map((i) => ({
        id: i.id ?? uuid(),
        ...i,
      })),
      collaborators: (data.collaborators || []).map((c) => ({
        id: c.id ?? uuid(),
        ...c,
      })),
      })
    );
  },

  // ====== Moneda ======
  setCurrencyCode: (code) =>
    set((s) => {
      const currency = { ...s.currency, code };
      saveUIPrefs({ currency });
      return { currency };
    }),

  setCurrencyRatePerJPY: (ratePerJPY) =>
    set((s) => {
      const currency = { ...s.currency, ratePerJPY: Number(ratePerJPY) || 0 };
      saveUIPrefs({ currency });
      return { currency };
    }),

  speedsKmh,
  // ====== Volver a My places ======
  unassignPlace: (id) =>
    set((s) =>
      withAirportEndpoints(s, {
        places: s.places.map((p) => (p.id === id ? { ...p, date: null } : p)),
        selectedId: s.selectedId === id ? null : s.selectedId,
      })
    ),
}));
