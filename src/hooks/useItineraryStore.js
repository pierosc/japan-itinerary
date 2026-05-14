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

export const useItineraryStore = create((set, get) => ({
  // ===== Datos base =====
  places: [],
  routes: [],
  expenses: [],
  dayMaps: {},

  days: [D0],
  selectedDate: D0,
  selectedId: null,

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
    if (!state.days.includes(date)) set({ days: [...state.days, date] });
    set({ selectedDate: date, selectedId: null });
  },

  addDay: (date) => {
    const { days } = get();
    if (!days.includes(date)) set({ days: [...days, date] });
    set({ selectedDate: date });
  },

  removeDay: (date) => {
    const { days, places, routes, expenses, dayMaps } = get();
    const remaining = days.filter((d) => d !== date);
    const fallbackDate = remaining.length ? remaining[0] : todayISO();
    const nextDayMaps = { ...dayMaps };
    delete nextDayMaps[date];
    set({
      days: remaining.length ? remaining : [fallbackDate],
      places: places.map((p) => (p.date === date ? { ...p, date: null } : p)),
      routes: routes.filter((r) => r.date !== date),
      expenses: expenses.filter((e) => e.date !== date),
      dayMaps: nextDayMaps,
      selectedDate: fallbackDate,
      selectedId: null,
    });
  },

  renameDay: (fromDate, toDate) =>
    set((s) => {
      if (!fromDate || !toDate || fromDate === toDate) return {};
      const days = s.days.map((d) => (d === fromDate ? toDate : d));
      const uniqueDays = [...new Set(days)].sort();

      return {
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
      };
    }),

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
      return {
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
      };
    }),

  // ====== Lugares ======
  setSelected: (id) => set({ selectedId: id }),

  addPlace: (place) => {
    const id = uuid();
    set((s) => ({
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
    }));
    return id;
  },

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

  // ====== My Places ======
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

  // ====== Reordenar lugares ======
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
    set({
      places: [],
      routes: [],
      expenses: [],
      dayMaps: {},
      selectedId: null,
      days: [todayISO()],
      selectedDate: todayISO(),
      packingItems: [],
      collaborators: [],
    }),

  exportJSON: () => {
    const {
      places,
      routes,
      expenses,
      dayMaps,
      days,
      selectedDate,
      currency,
      ui,
      packingItems,
      collaborators,
    } = get();
    return JSON.stringify(
      {
        version: 8,
        country: "Japan",
        days,
        selectedDate,
        currency,
        ui,
        places,
        routes,
        expenses,
        dayMaps,
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
      expenses: (data.expenses || []).map((e) => ({
        id: e.id ?? uuid(),
        type: "expense",
        kind: e.kind || "personal",
        participants: Array.isArray(e.participants) ? e.participants : [],
        ...e,
      })),
      dayMaps: data.dayMaps || {},
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
    });
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
    set((s) => ({
      places: s.places.map((p) => (p.id === id ? { ...p, date: null } : p)),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),
}));
