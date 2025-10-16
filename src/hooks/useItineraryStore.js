import { create } from "zustand";
import { v4 as uuid } from "uuid";

const speedsKmh = { walk: 4.5, train: 60, car: 35 };
const defaultMode = "walk";

// fecha YYYY-MM-DD
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
    name: "Senso-ji",
    category: "atraccion",
    lat: 35.714765,
    lng: 139.796655,
    startTime: "09:00",
    durationMin: 90,
    priceRange: "gratis",
    items: [],
    menuImageUrl: "",
    sourceUrl: "https://ja.wikipedia.org/wiki/%E6%B5%85%E8%8D%89%E5%AF%BA",
    notes: "Templo icónico en Asakusa.",
    modeToNext: "walk",
    spendJPY: 0,
    date: D0,
  },
  {
    id: uuid(),
    name: "Akihabara (BookOff)",
    category: "bookoff",
    lat: 35.698683,
    lng: 139.773167,
    startTime: "11:00",
    durationMin: 120,
    priceRange: "¥ - ¥¥",
    items: [
      {
        name: "Manga usado",
        priceJPY: 300,
        link: "https://www.bookoff.co.jp/",
      },
    ],
    menuImageUrl: "",
    sourceUrl: "https://www.bookoff.co.jp/",
    notes: "Buen lugar para cazar ofertas.",
    modeToNext: "train",
    spendJPY: 2000,
    date: D0,
  },
  {
    id: uuid(),
    name: "Ichiran Ramen Shinjuku",
    category: "restaurante",
    lat: 35.6938,
    lng: 139.7034,
    startTime: "14:00",
    durationMin: 60,
    priceRange: "¥¥",
    items: [],
    menuImageUrl: "https://ichiran.com/en/images/menu/ramen.png",
    sourceUrl: "https://ichiran.com/",
    notes: "Botón para ver menú.",
    modeToNext: "walk",
    spendJPY: 1500,
    date: D0,
  },
];

export const useItineraryStore = create((set, get) => ({
  places: examplePlaces,
  selectedId: null,
  days: [D0],
  selectedDate: D0,

  // Preferencias moneda
  currency: { code: "USD", ratePerJPY: 0.0065 },

  // UI global
  ui: {
    showMap: true,
    financeOpen: true,
    routeVisible: true,
    basemap: "osm", // 'osm' | 'osmjp' | 'osmfr' | 'osmde'
  },

  // setters UI
  setShowMap: (v) => set((s) => ({ ui: { ...s.ui, showMap: v } })),
  toggleFinance: () =>
    set((s) => ({ ui: { ...s.ui, financeOpen: !s.ui.financeOpen } })),
  toggleRoute: () =>
    set((s) => ({ ui: { ...s.ui, routeVisible: !s.ui.routeVisible } })),
  setBasemap: (basemap) => set((s) => ({ ui: { ...s.ui, basemap } })),

  setSelected: (id) => set({ selectedId: id }),
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
    const { days, places } = get();
    const remaining = days.filter((d) => d !== date);
    set({
      days: remaining.length ? remaining : [todayISO()],
      places: places.filter((p) => p.date !== date),
      selectedDate: remaining.length ? remaining[0] : todayISO(),
      selectedId: null,
    });
  },

  addPlace: (place) =>
    set((s) => ({
      places: [
        ...s.places,
        { id: uuid(), modeToNext: defaultMode, date: s.selectedDate, ...place },
      ],
    })),
  updatePlace: (id, patch) =>
    set((s) => ({
      places: s.places.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),
  removePlace: (id) =>
    set((s) => ({
      places: s.places.filter((p) => p.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  placesBySelectedDate: () => {
    const { places, selectedDate } = get();
    return places
      .filter((p) => p.date === selectedDate)
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  },

  totalJPYForDate: (date) =>
    get()
      .places.filter((p) => p.date === date)
      .reduce((acc, p) => acc + (Number(p.spendJPY) || 0), 0),
  totalJPYAll: () =>
    get().places.reduce((acc, p) => acc + (Number(p.spendJPY) || 0), 0),

  clearAll: () =>
    set({
      places: [],
      selectedId: null,
      days: [todayISO()],
      selectedDate: todayISO(),
    }),
  exportJSON: () => {
    const { places, days, selectedDate, currency, ui } = get();
    return JSON.stringify(
      {
        version: 3,
        country: "Japan",
        days,
        selectedDate,
        currency,
        ui,
        places,
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
      places: (data.places || []).map((p) => ({ id: p.id ?? uuid(), ...p })),
      selectedId: null,
      days: days.length ? days : [todayISO()],
      selectedDate: data.selectedDate ?? (days[0] || todayISO()),
      currency: data.currency ?? { code: "USD", ratePerJPY: 0.0065 },
      ui: {
        showMap: true,
        financeOpen: true,
        routeVisible: true,
        basemap: "osm",
        ...(data.ui || {}),
      },
    });
  },

  setCurrencyCode: (code) =>
    set((s) => ({ currency: { ...s.currency, code } })),
  setCurrencyRatePerJPY: (ratePerJPY) =>
    set((s) => ({
      currency: { ...s.currency, ratePerJPY: Number(ratePerJPY) || 0 },
    })),

  speedsKmh,
}));
