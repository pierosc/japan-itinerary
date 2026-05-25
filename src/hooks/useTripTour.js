import { useCallback, useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useItineraryStore } from "./useItineraryStore";

const q = (selector) => () => document.querySelector(selector);

function waitForLayout(callback) {
  window.requestAnimationFrame(() => {
    window.setTimeout(callback, 90);
  });
}

export function useTripTour() {
  const tourRef = useRef(null);
  const setSidebarTab = useItineraryStore((s) => s.setSidebarTab);
  const setShowMap = useItineraryStore((s) => s.setShowMap);

  useEffect(() => () => tourRef.current?.destroy(), []);

  return useCallback(() => {
    if (typeof window === "undefined") return;

    tourRef.current?.destroy();

    const go = (api, tab, direction = "next", showMap = true) => {
      setSidebarTab(tab);
      setShowMap(showMap);
      waitForLayout(() => {
        if (direction === "previous") {
          api.movePrevious();
        } else {
          api.moveNext();
        }
        window.setTimeout(() => api.refresh(), 40);
      });
    };

    const nextTab = (tab, showMap = true) => (_element, _step, { driver: api }) =>
      go(api, tab, "next", showMap);
    const prevTab = (tab, showMap = true) => (_element, _step, { driver: api }) =>
      go(api, tab, "previous", showMap);

    const tour = driver({
      animate: true,
      allowClose: true,
      allowKeyboardControl: true,
      disableActiveInteraction: false,
      overlayOpacity: 0.58,
      popoverClass: "trip-tour-popover",
      popoverOffset: 12,
      progressText: "{{current}} de {{total}}",
      showProgress: true,
      smoothScroll: true,
      stagePadding: 8,
      stageRadius: 12,
      nextBtnText: "Siguiente",
      prevBtnText: "Atras",
      doneBtnText: "Listo",
      steps: [
        {
          element: q('[data-tour="trip-help-button"]'),
          popover: {
            title: "Tutorial del trip",
            description:
              "Este boton abre una guia rapida por todas las herramientas del viaje. Puedes cerrarla con Esc o la X.",
            side: "bottom",
            align: "end",
          },
        },
        {
          element: q('[data-tour="trip-appbar"]'),
          popover: {
            title: "Barra del viaje",
            description:
              "Desde aqui vuelves a Mis viajes, ves el nombre y destino, cambias moneda, guardas, exportas PDF y entras a tu cuenta.",
            side: "bottom",
            align: "center",
          },
        },
        {
          element: q('[data-tour="trip-title"]'),
          popover: {
            title: "Nombre y destino",
            description:
              "Este bloque identifica el trip activo. El boton Mis viajes te devuelve al listado sin perder el contenido guardado.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: q('[data-tour="trip-actions"]'),
          popover: {
            title: "Acciones globales",
            description:
              "El selector de moneda alimenta gastos y conversiones. Guardar ahora fuerza el sync, y PDF genera un resumen descargable del trip.",
            side: "bottom",
            align: "end",
          },
        },
        {
          element: q('[data-tour="trip-workspace"]'),
          popover: {
            title: "Area de trabajo",
            description:
              "El trip se divide en mapa a la izquierda y paneles de gestion a la derecha. Ambos se actualizan con el dia seleccionado.",
            side: "top",
            align: "center",
          },
        },
        {
          element: q('[data-tour="trip-map"]'),
          popover: {
            title: "Mapa",
            description:
              "Muestra los puntos del dia, rutas y pins. Haz click en un marcador para editarlo o activa el modo de click para crear puntos.",
            side: "right",
            align: "center",
          },
        },
        {
          element: q('[data-tour="map-tools"]'),
          popover: {
            title: "Herramientas del mapa",
            description:
              "Busca lugares, abre la ruta en Google Maps, carga planos del parque, cambia el mapa base, muestra rutas y alterna entre mapa y ficha.",
            side: "right",
            align: "start",
          },
        },
        {
          element: q('[data-tour="sidebar-tabs"]'),
          popover: {
            title: "Secciones del trip",
            description:
              "Estas pestanas agrupan cada funcionalidad: itinerario, ideas, hoteles, gastos, packing, usuarios y configuracion.",
            side: "left",
            align: "start",
          },
        },
        {
          element: q('[data-tour="day-selector"]'),
          popover: {
            title: "Dias del viaje",
            description:
              "Selecciona el dia activo, crea fechas nuevas, cambia una fecha, elimina dias y pon un titulo amigable a cada jornada.",
            side: "left",
            align: "start",
          },
        },
        {
          element: q('[data-tour="itinerary-actions"]'),
          popover: {
            title: "Construir itinerario",
            description:
              "Anade puntos directos al dia o trae ideas guardadas desde My Places. El lugar queda listo para editarse en la ficha.",
            side: "left",
            align: "start",
          },
        },
        {
          element: q('[data-tour="itinerary-list"]'),
          popover: {
            title: "Orden, rutas y diagnostico",
            description:
              "Arrastra lugares para ordenar el dia, duplica puntos, mandalos a My Places y crea rutas entre paradas con duracion y costo.",
            side: "left",
            align: "start",
            onNextClick: nextTab("myplaces", false),
          },
        },
        {
          element: q('[data-tour="myplaces-panel"]'),
          popover: {
            title: "My Places",
            description:
              "Aqui guardas restaurantes, tiendas o ideas que aun no tienen dia. Editalas primero y envialas al dia actual cuando encajen.",
            side: "left",
            align: "start",
            onPrevClick: prevTab("itinerary", true),
          },
        },
        {
          element: q('[data-tour="myplaces-actions"]'),
          popover: {
            title: "Ideas pendientes",
            description:
              "Crea nuevos lugares sueltos y usa Enviar al dia para convertirlos en una parada del itinerario seleccionado.",
            side: "left",
            align: "start",
            onNextClick: nextTab("hotels", false),
          },
        },
        {
          element: q('[data-tour="hotels-panel"]'),
          popover: {
            title: "Hoteles",
            description:
              "Los hoteles son bases del viaje. Check-in, check-out y coordenadas ayudan a calcular cercania y puntos de partida.",
            side: "left",
            align: "start",
            onPrevClick: prevTab("myplaces", false),
          },
        },
        {
          element: q('[data-tour="hotels-actions"]'),
          popover: {
            title: "Gestion de alojamientos",
            description:
              "Agrega alojamientos, corrige fechas y horas, ajusta lat/lng y quita hoteles cuando cambie el plan.",
            side: "left",
            align: "start",
            onNextClick: nextTab("finance", false),
          },
        },
        {
          element: q('[data-tour="finance-panel"]'),
          popover: {
            title: "Gastos y finanzas",
            description:
              "Centraliza presupuesto, gastos personales, gastos compartidos, balances entre personas y conversion de moneda.",
            side: "left",
            align: "start",
            onPrevClick: prevTab("hotels", false),
          },
        },
        {
          element: q('[data-tour="budget-summary"]'),
          popover: {
            title: "Resumen de presupuesto",
            description:
              "Compara el total del dia seleccionado contra el total del viaje, usando la moneda global del AppBar.",
            side: "left",
            align: "start",
          },
        },
        {
          element: q('[data-tour="expense-ledger"]'),
          popover: {
            title: "Gastos compartidos",
            description:
              "Registra conceptos, monto en yenes, fecha, pagador y participantes para ver balances del viaje.",
            side: "left",
            align: "start",
          },
        },
        {
          element: q('[data-tour="currency-converter"]'),
          popover: {
            title: "Conversor",
            description:
              "Ajusta tasa, usa presets y convierte rapidamente JPY a tu moneda para revisar compras y reservas.",
            side: "left",
            align: "start",
            onNextClick: nextTab("packing", false),
          },
        },
        {
          element: q('[data-tour="packing-panel"]'),
          popover: {
            title: "Packing list",
            description:
              "Crea una lista de cosas para llevar, marca lo que ya esta listo y borra lo que ya no necesitas.",
            side: "left",
            align: "start",
            onPrevClick: prevTab("finance", false),
          },
        },
        {
          element: q('[data-tour="packing-list"]'),
          popover: {
            title: "Checklist del viaje",
            description:
              "El input agrega items con Enter o con el boton. Los checks quedan guardados junto con el trip.",
            side: "left",
            align: "start",
            onNextClick: nextTab("users", false),
          },
        },
        {
          element: q('[data-tour="users-panel"]'),
          popover: {
            title: "Users",
            description:
              "Mira quien es dueno del viaje y, en modo online, comparte el trip con usuarios registrados para editar juntos.",
            side: "left",
            align: "start",
            onPrevClick: prevTab("packing", false),
          },
        },
        {
          element: q('[data-tour="users-sharing"]'),
          popover: {
            title: "Colaboradores",
            description:
              "Busca por email o nombre, agrega usuarios y revisa con quien esta compartido el viaje.",
            side: "left",
            align: "start",
            onNextClick: nextTab("settings", false),
          },
        },
        {
          element: q('[data-tour="settings-panel"]'),
          popover: {
            title: "Configuracion",
            description:
              "Aqui ajustas metadatos, publicacion, perfil, tema, mapas, modo de guardado y auto-guardado.",
            side: "left",
            align: "start",
            onPrevClick: prevTab("users", false),
          },
        },
        {
          element: q('[data-tour="settings-basic"]'),
          popover: {
            title: "Datos basicos",
            description:
              "Cambia nombre, destino e imagen del trip. Estos datos aparecen en la tarjeta del viaje y en el PDF.",
            side: "left",
            align: "start",
          },
        },
        {
          element: q('[data-tour="settings-sharing"]'),
          popover: {
            title: "Publicacion y perfil",
            description:
              "Publica el viaje como solo lectura y activa tu perfil publico para que otros usuarios puedan encontrarte.",
            side: "left",
            align: "start",
          },
        },
        {
          element: q('[data-tour="settings-preferences"]'),
          popover: {
            title: "Preferencias y guardado",
            description:
              "Elige tema, MapTiler, guardado local u online y el intervalo de auto-guardado. Listo: ya conoces todo el trip.",
            side: "left",
            align: "start",
          },
        },
      ],
    });

    tourRef.current = tour;
    setSidebarTab("itinerary");
    setShowMap(true);
    window.dispatchEvent(new CustomEvent("trip-tour:expand-map-controls"));
    waitForLayout(() => tour.drive());
  }, [setShowMap, setSidebarTab]);
}
