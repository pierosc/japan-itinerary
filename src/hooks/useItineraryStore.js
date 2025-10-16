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

const examplePlaces = [
  {
    id: uuid(),
    type: "place",
    name: "Senso-ji",
    category: "atraccion",
    lat: 35.714765,
    lng: 139.796655,
    startTime: "09:00",
    durationMin: 90,
    priceRange: "gratis",
    sourceUrl: "https://ja.wikipedia.org/wiki/%E6%B5%85%E8%8D%89%E5%AF%BA",
    notes: "Templo icónico en Asakusa.",
    spendJPY: 0,
    date: D0,
    images: [],
  },
  {
    id: uuid(),
    type: "place",
    name: "Akihabara (BookOff)",
    category: "bookoff",
    lat: 35.698683,
    lng: 139.773167,
    startTime: "11:00",
    durationMin: 120,
    priceRange: "¥ - ¥¥",
    sourceUrl: "https://www.bookoff.co.jp/",
    notes: "Cazar ofertas.",
    spendJPY: 2000,
    date: D0,
    images: [],
  },
  {
    id: uuid(),
    type: "place",
    name: "Ichiran Ramen Shinjuku",
    category: "restaurante",
    lat: 35.6938,
    lng: 139.7034,
    startTime: "14:00",
    durationMin: 60,
    priceRange: "¥¥",
    sourceUrl: "https://ichiran.com/",
    notes: "Botón de menú.",
    spendJPY: 1500,
    date: D0,
    images: [],
  },
];

export const useItineraryStore = create((set, get) => ({
  // datos
  places: examplePlaces, // el ORDEN DEL ARRAY define el orden visual
  routes: [], // {id,type:'route',date,fromId,toId,mode,geojson?,name?,durationMin?,priceJPY?}

  days: [D0],
  selectedDate: D0,
  selectedId: null,

  // conversión
  currency: { code: "USD", ratePerJPY: 0.0065 },

  // UI global
  ui: {
    showMap: true,
    financeOpen: false, // colapsado por defecto
    routeVisible: true,
    basemap: "esri-worldgray", // tiene etiquetas EN
    mapTilerKey: "", // para español real si lo deseas
  },

  // ===== UI =====
  setShowMap: (v) => set((s) => ({ ui: { ...s.ui, showMap: v } })),
  toggleFinance: () =>
    set((s) => ({ ui: { ...s.ui, financeOpen: !s.ui.financeOpen } })),
  toggleRoute: () =>
    set((s) => ({ ui: { ...s.ui, routeVisible: !s.ui.routeVisible } })),
  setBasemap: (basemap) => set((s) => ({ ui: { ...s.ui, basemap } })),
  setMapTilerKey: (k) => set((s) => ({ ui: { ...s.ui, mapTilerKey: k } })),

  // ===== Días =====
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

  // ===== Lugares =====
  setSelected: (id) => set({ selectedId: id }),
  addPlace: (place) =>
    set((s) => ({
      places: [
        ...s.places,
        {
          id: uuid(),
          type: "place",
          date: s.selectedDate,
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

  // Reordenar SOLO el día seleccionado; se preservan rutas que coincidan con pares consecutivos
  reorderPlacesForDate: (date, orderedIds) =>
    set((s) => {
      const others = s.places.filter((p) => p.date !== date);
      const same = s.places.filter((p) => p.date === date);
      const ordered = orderedIds
        .map((id) => same.find((p) => p.id === id))
        .filter(Boolean);

      // pares consecutivos del nuevo orden
      const newPairs = new Set(
        ordered
          .map((p, i) =>
            i < ordered.length - 1 ? `${p.id}|${ordered[i + 1].id}` : null
          )
          .filter(Boolean)
      );
      // preserva rutas que sigan conectando pares consecutivos
      const keepRoutes = s.routes.filter(
        (r) => r.date !== date || newPairs.has(`${r.fromId}|${r.toId}`)
      );

      return { places: [...others, ...ordered], routes: keepRoutes };
    }),

  // ===== Rutas =====
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

  // ===== Selectores =====
  placesBySelectedDate: () => {
    const { places, selectedDate } = get();
    // Mantener ORDEN del array; solo filtramos por fecha
    return places.filter((p) => p.date === selectedDate);
  },
  routesBySelectedDate: () => {
    const { routes, selectedDate } = get();
    return routes.filter((r) => r.date === selectedDate);
  },

  // ===== Totales =====
  totalJPYForDate: (date) =>
    get()
      .places.filter((p) => p.date === date)
      .reduce((acc, p) => acc + (Number(p.spendJPY) || 0), 0),
  totalJPYAll: () =>
    get().places.reduce((acc, p) => acc + (Number(p.spendJPY) || 0), 0),

  // ===== Export/Import =====
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
        : [...new Set((data.places || []).map((p) => p.date))];
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
      ui: {
        showMap: true,
        financeOpen: false,
        routeVisible: true,
        basemap: "esri-worldgray",
        mapTilerKey: "",
        ...(data.ui || {}),
      },
    });
  },

  // currency
  setCurrencyCode: (code) =>
    set((s) => ({ currency: { ...s.currency, code } })),
  setCurrencyRatePerJPY: (ratePerJPY) =>
    set((s) => ({
      currency: { ...s.currency, ratePerJPY: Number(ratePerJPY) || 0 },
    })),

  speedsKmh,
}));
