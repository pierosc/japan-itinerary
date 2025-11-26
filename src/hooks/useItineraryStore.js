// src/hooks/useItineraryStore.js
import { create } from "zustand";
import { v4 as uuid } from "uuid";

const speedsKmh = { walk: 4.5, train: 60, car: 35 };

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
const D0 = todayISO();

export const useItineraryStore = create((set, get) => ({
  // ===== Datos base (SIN ejemplos) =====
  places: [], // el orden del array define el orden visual
  routes: [], // {id,type:'route',date,fromId,toId,mode,geojson?,name?,durationMin?,priceJPY?}

  days: [D0],
  selectedDate: D0,
  selectedId: null,

  // Conversión de moneda
  currency: { code: "USD", ratePerJPY: 0.0065 },

  // ===== UI global =====
  ui: {
    showMap: true,
    financeOpen: false,
    routeVisible: true,
    basemap: "esri-worldgray",
    mapTilerKey: "",
    sidebarTab: "itinerary", // itinerary | myplaces | finance | settings
    theme: "dark", // dark | light
    storageMode: "local", // "local" | "online"
  },

  // ====== Acciones UI ======
  setShowMap: (v) => set((s) => ({ ui: { ...s.ui, showMap: v } })),
  toggleFinance: () =>
    set((s) => ({ ui: { ...s.ui, financeOpen: !s.ui.financeOpen } })),
  toggleRoute: () =>
    set((s) => ({ ui: { ...s.ui, routeVisible: !s.ui.routeVisible } })),
  setBasemap: (basemap) => set((s) => ({ ui: { ...s.ui, basemap } })),
  setMapTilerKey: (k) => set((s) => ({ ui: { ...s.ui, mapTilerKey: k } })),
  setSidebarTab: (tab) => set((s) => ({ ui: { ...s.ui, sidebarTab: tab } })),
  setTheme: (theme) => set((s) => ({ ui: { ...s.ui, theme } })),
  toggleTheme: () =>
    set((s) => ({
      ui: { ...s.ui, theme: s.ui.theme === "light" ? "dark" : "light" },
    })),
  setStorageMode: (mode) =>
    set((s) => ({ ui: { ...s.ui, storageMode: mode } })),

  // ====== Días ======
  setSelectedDate: (date) => {
    const state = get();
    if (!state.days.includes(date)) set({ days: [...state.days, date] });
    set({ selectedDate: date, selectedId: null });
  },

  addDay: (date) => {
    const { days } = get();
    if (!days.includes(date)) set({ days: [...days, date] });
    set({ selectedDate: date });
  },

  removeDay: (date) => {
    const { days, places, routes } = get();
    const remaining = days.filter((d) => d !== date);
    set({
      days: remaining.length ? remaining : [todayISO()],
      places: places.filter((p) => p.date !== date),
      routes: routes.filter((r) => r.date !== date),
      selectedDate: remaining.length ? remaining[0] : todayISO(),
      selectedId: null,
    });
  },

  // ====== Lugares ======
  setSelected: (id) => set({ selectedId: id }),

  // addPlace respeta place.date si viene (para poder crear sin día)
  addPlace: (place) =>
    set((s) => ({
      places: [
        ...s.places,
        {
          id: uuid(),
          type: "place",
          date:
            place.date !== undefined && place.date !== null
              ? place.date
              : s.selectedDate,
          images: [],
          ...place,
        },
      ],
    })),

  updatePlace: (id, patch) =>
    set((s) => ({
      places: s.places.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),

  removePlace: (id) =>
    set((s) => ({
      places: s.places.filter((p) => p.id !== id),
      routes: s.routes.filter((r) => r.fromId !== id && r.toId !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  // ====== My Places (lugares sin día asignado) ======
  unassignedPlaces: () => {
    const { places } = get();
    return places.filter((p) => !p.date);
  },

  addUnassignedPlace: (place) =>
    set((s) => ({
      places: [
        ...s.places,
        {
          id: uuid(),
          type: "place",
          date: null,
          images: [],
          ...place,
        },
      ],
    })),

  assignPlaceToDay: (id, date) =>
    set((s) => {
      const days = s.days.includes(date) ? s.days : [...s.days, date];
      const place = s.places.find((p) => p.id === id);
      if (!place) return {};

      const updated = { ...place, date };
      const others = s.places.filter((p) => p.id !== id);

      return {
        days,
        places: [...others, updated],
      };
    }),

  // ====== Reordenar lugares en un día ======
  reorderPlacesForDate: (date, orderedIds) =>
    set((s) => {
      const others = s.places.filter((p) => p.date !== date);
      const same = s.places.filter((p) => p.date === date);
      const ordered = orderedIds
        .map((id) => same.find((p) => p.id === id))
        .filter(Boolean);

      const newPairs = new Set(
        ordered
          .map((p, i) =>
            i < ordered.length - 1 ? `${p.id}|${ordered[i + 1].id}` : null
          )
          .filter(Boolean)
      );
      const keepRoutes = s.routes.filter(
        (r) => r.date !== date || newPairs.has(`${r.fromId}|${r.toId}`)
      );

      return { places: [...others, ...ordered], routes: keepRoutes };
    }),

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

  // ====== Selectores ======
  placesBySelectedDate: () => {
    const { places, selectedDate } = get();
    return places.filter((p) => p.date === selectedDate);
  },

  routesBySelectedDate: () => {
    const { routes, selectedDate } = get();
    return routes.filter((r) => r.date === selectedDate);
  },

  // ====== Totales ======
  totalJPYForDate: (date) =>
    get()
      .places.filter((p) => p.date === date)
      .reduce((acc, p) => acc + (Number(p.spendJPY) || 0), 0),

  totalJPYAll: () =>
    get().places.reduce((acc, p) => acc + (Number(p.spendJPY) || 0), 0),

  // ====== Export / Import ======
  clearAll: () =>
    set({
      places: [],
      routes: [],
      selectedId: null,
      days: [todayISO()],
      selectedDate: todayISO(),
    }),

  exportJSON: () => {
    const { places, routes, days, selectedDate, currency, ui } = get();
    return JSON.stringify(
      {
        version: 5,
        country: "Japan",
        days,
        selectedDate,
        currency,
        ui,
        places,
        routes,
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

    const prevUi = get().ui;

    set({
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
      selectedId: null,
      days: days.length ? days : [todayISO()],
      selectedDate: data.selectedDate ?? days[0] ?? todayISO(),
      currency: data.currency ?? { code: "USD", ratePerJPY: 0.0065 },
      ui: prevUi,
    });
  },

  // ====== Moneda ======
  setCurrencyCode: (code) =>
    set((s) => ({ currency: { ...s.currency, code } })),

  setCurrencyRatePerJPY: (ratePerJPY) =>
    set((s) => ({
      currency: { ...s.currency, ratePerJPY: Number(ratePerJPY) || 0 },
    })),

  speedsKmh,
}));
