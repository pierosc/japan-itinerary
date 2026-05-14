import { useMemo, useState } from "react";
import { TRIP_TEMPLATES } from "../data/travelCatalog";
import { useItineraryStore } from "../hooks/useItineraryStore";
import {
  buildTemplatePlan,
  generateSmartPlan,
  optimizePlacesByDistance,
  parseImportText,
} from "../utils/travelPlanning";
import { useFeedback } from "./ui/FeedbackProvider";

const INTERESTS = [
  ["classic", "Clásico"],
  ["culture", "Cultura"],
  ["food", "Comida"],
  ["anime", "Anime"],
  ["shopping", "Compras"],
  ["themepark", "Parques"],
  ["views", "Vistas"],
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function TravelStudioPanel({ trip }) {
  const { toast } = useFeedback();
  const {
    days,
    selectedDate,
    places,
    addDay,
    addPlace,
    setDayTitle,
    reorderPlacesForDate,
    exportJSON,
  } = useItineraryStore();

  const [form, setForm] = useState({
    days: 5,
    budgetJPY: 120000,
    pace: "balanced",
    startDate: selectedDate || todayISO(),
    interests: ["classic", "food", "culture"],
  });
  const [importText, setImportText] = useState("");

  const selectedPlaces = useMemo(
    () => places.filter((place) => place.date === selectedDate),
    [places, selectedDate]
  );

  const applyPlan = (plan, successTitle) => {
    plan.forEach((day) => {
      addDay(day.date);
      setDayTitle(day.date, day.title);
      day.places.forEach((place) => addPlace(place));
    });
    toast({ title: successTitle, tone: "success" });
  };

  const toggleInterest = (interest) => {
    setForm((current) => {
      const exists = current.interests.includes(interest);
      return {
        ...current,
        interests: exists
          ? current.interests.filter((item) => item !== interest)
          : [...current.interests, interest],
      };
    });
  };

  const handleGenerate = () => {
    const plan = generateSmartPlan(form);
    applyPlan(plan, "Itinerario generado");
  };

  const handleTemplate = (template) => {
    const plan = buildTemplatePlan(template, form.startDate || selectedDate);
    applyPlan(plan, `${template.name} aplicado`);
  };

  const handleImport = () => {
    const imported = parseImportText(importText, selectedDate);
    imported.forEach((place) => addPlace(place));
    setImportText("");
    toast({
      title: "Lugares importados",
      message: `${imported.length} elemento/s agregados al día actual.`,
      tone: "success",
    });
  };

  const handleOptimize = () => {
    if (selectedPlaces.length < 3) {
      toast({
        title: "Agrega más lugares",
        message: "La optimización necesita al menos 3 puntos en el día.",
        tone: "warning",
      });
      return;
    }
    reorderPlacesForDate(selectedDate, optimizePlacesByDistance(selectedPlaces));
    toast({ title: "Ruta optimizada por cercanía", tone: "success" });
  };

  const handlePublicLink = async () => {
    const payload = btoa(
      encodeURIComponent(
        JSON.stringify({
          trip: {
            title: trip?.title || "Viaje",
            destination: trip?.destination || "Japan",
            coverImage: trip?.coverImage || "",
          },
          data: JSON.parse(exportJSON()),
        })
      )
    );
    const url = `${window.location.origin}${window.location.pathname}#public=${payload}`;
    await navigator.clipboard?.writeText(url);
    toast({
      title: "Link público copiado",
      message: "Es una landing interactiva basada en el itinerario actual.",
      tone: "success",
    });
  };

  return (
    <div className="travel-studio">
      <section className="studio-hero">
        <div>
          <div className="empty-state-kicker">Travel Studio</div>
          <h2>Genera, importa y optimiza tu viaje</h2>
          <p className="text-xs">
            Motor local inteligente hoy; mañana conectamos IA real usando esta
            misma experiencia.
          </p>
        </div>
        <button className="btn" onClick={handleGenerate}>
          Generar itinerario
        </button>
      </section>

      <section className="card studio-card">
        <h3>Generador inteligente</h3>
        <div className="studio-grid">
          <label>
            <span className="text-xs">Días</span>
            <input
              className="input"
              type="number"
              min="1"
              max="14"
              value={form.days}
              onChange={(event) => setForm({ ...form, days: event.target.value })}
            />
          </label>
          <label>
            <span className="text-xs">Presupuesto total JPY</span>
            <input
              className="input"
              type="number"
              min="0"
              value={form.budgetJPY}
              onChange={(event) =>
                setForm({ ...form, budgetJPY: event.target.value })
              }
            />
          </label>
          <label>
            <span className="text-xs">Ritmo</span>
            <select
              className="input"
              value={form.pace}
              onChange={(event) => setForm({ ...form, pace: event.target.value })}
            >
              <option value="chill">Chill</option>
              <option value="balanced">Balanceado</option>
              <option value="intense">Intenso</option>
            </select>
          </label>
          <label>
            <span className="text-xs">Fecha inicial</span>
            <input
              className="input"
              type="date"
              value={form.startDate}
              onChange={(event) =>
                setForm({ ...form, startDate: event.target.value })
              }
            />
          </label>
        </div>
        <div className="interest-grid">
          {INTERESTS.map(([id, label]) => (
            <button
              key={id}
              className={
                "btn-outline text-xs " +
                (form.interests.includes(id) ? "btn-active" : "")
              }
              onClick={() => toggleInterest(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="card studio-card">
        <h3>Plantillas pro</h3>
        <div className="template-grid">
          {TRIP_TEMPLATES.map((template) => (
            <button
              key={template.id}
              className="template-card"
              onClick={() => handleTemplate(template)}
            >
              <span className="font-medium">{template.name}</span>
              <span className="text-xs">{template.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card studio-card">
        <h3>Importar lugares</h3>
        <p className="text-xs">
          Pega CSV, links de Google Maps, notas de blog o una lista rápida.
        </p>
        <textarea
          className="input studio-import"
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          placeholder="Nombre, categoria, lat, lng, url, notas&#10;Shibuya Sky, atraccion, 35.658, 139.702, https://..."
        />
        <button className="btn-outline" disabled={!importText.trim()} onClick={handleImport}>
          Importar al día actual
        </button>
      </section>

      <section className="studio-actions">
        <button className="btn-outline" onClick={handleOptimize}>
          Optimizar día por zonas
        </button>
        <button className="btn-outline" onClick={handlePublicLink}>
          Copiar link público interactivo
        </button>
      </section>

      <div className="text-xs">
        Estado actual: {days.length} día/s · {places.length} lugares.
      </div>
    </div>
  );
}
