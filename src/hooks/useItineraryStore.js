import { create } from "zustand";
import { v4 as uuid } from "uuid";

const speedsKmh = { walk: 4.5, train: 60, car: 35 };
const defaultMode = "walk";

// util fecha hoy en formato YYYY-MM-DD (hora local)
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
  /* datos base */
  places: examplePlaces,
  selectedId: null,
  days: [D0], // lista de días disponibles (YYYY-MM-DD)
  selectedDate: D0, // día activo

  /* preferencias de moneda para conversión */
  currency: { code: "USD", ratePerJPY: 0.0065 }, // 1 JPY -> 0.0065 USD aprox editable

  /* setters básicos */
  setSelected: (id) => set({ selectedId: id }),
  setSelectedDate: (date) => {
    const state = get();
    if (!state.days.includes(date)) {
      set({ days: [...state.days, date] });
    }
    set({ selectedDate: date, selectedId: null });
  },

  addDay: (date) => {
    const { days } = get();
    if (!days.includes(date)) set({ days: [...days, date] });
    set({ selectedDate: date });
  },
  removeDay: (date) => {
    const { days, places, selectedDate } = get();
    const remaining = days.filter((d) => d !== date);
    const remainingPlaces = places.filter((p) => p.date !== date);
    set({
      days: remaining.length ? remaining : [todayISO()],
      places: remainingPlaces,
      selectedDate: remaining.length ? remaining[0] : todayISO(),
      selectedId: null,
    });
  },

  addPlace: (place) =>
    set((s) => ({
      places: [
        ...s.places,
        {
          id: uuid(),
          modeToNext: defaultMode,
          date: s.selectedDate, // por defecto al día activo
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
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  reorderPlaces: (newOrder) => set({ places: newOrder }),

  /* filtros/consultas */
  placesBySelectedDate: () => {
    const { places, selectedDate } = get();
    return places
      .filter((p) => p.date === selectedDate)
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  },

  totalJPYForDate: (date) => {
    const { places } = get();
    return places
      .filter((p) => p.date === date)
      .reduce((acc, p) => acc + (Number(p.spendJPY) || 0), 0);
  },
  totalJPYAll: () => {
    const { places } = get();
    return places.reduce((acc, p) => acc + (Number(p.spendJPY) || 0), 0);
  },

  /* export/import */
  clearAll: () =>
    set({
      places: [],
      selectedId: null,
      days: [todayISO()],
      selectedDate: todayISO(),
    }),
  exportJSON: () => {
    const { places, days, selectedDate, currency } = get();
    return JSON.stringify(
      { version: 2, country: "Japan", days, selectedDate, currency, places },
      null,
      2
    );
  },
  importJSON: (jsonStr) => {
    const data = JSON.parse(jsonStr);
    if (!data.places || !Array.isArray(data.places)) {
      throw new Error("JSON inválido: falta 'places[]'.");
    }
    const days =
      Array.isArray(data.days) && data.days.length
        ? data.days
        : [...new Set(data.places.map((p) => p.date || todayISO()))];
    const normalized = data.places.map((p) => ({
      id: p.id ?? uuid(),
      name: p.name ?? "Sin nombre",
      category: p.category ?? "otro",
      lat: p.lat,
      lng: p.lng,
      startTime: p.startTime ?? "",
      durationMin: p.durationMin ?? 60,
      priceRange: p.priceRange ?? "",
      items: p.items ?? [],
      menuImageUrl: p.menuImageUrl ?? "",
      sourceUrl: p.sourceUrl ?? "",
      notes: p.notes ?? "",
      modeToNext: p.modeToNext ?? defaultMode,
      spendJPY: p.spendJPY ?? 0,
      date: p.date ?? days[0],
    }));
    set({
      places: normalized,
      selectedId: null,
      days,
      selectedDate: data.selectedDate ?? days[0],
      currency: data.currency ?? { code: "USD", ratePerJPY: 0.0065 },
    });
  },

  /* currency */
  setCurrencyCode: (code) =>
    set((s) => ({ currency: { ...s.currency, code } })),
  setCurrencyRatePerJPY: (ratePerJPY) =>
    set((s) => ({
      currency: { ...s.currency, ratePerJPY: Number(ratePerJPY) || 0 },
    })),

  speedsKmh,
}));
