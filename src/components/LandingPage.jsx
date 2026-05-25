import { useState } from "react";
import TripCard from "./TripCard";

const ONBOARDING_STEPS = [
  {
    title: "Crea tu primer viaje",
    text: "Define destino, portada y empieza con un día base.",
  },
  {
    title: "Importa desde Google Maps",
    text: "Pega links como fuente en cada lugar para conservar contexto.",
  },
  {
    title: "Invita amigos",
    text: "Comparte el viaje y coordina lugares, gastos y pendientes.",
  },
  {
    title: "Exporta PDF",
    text: "Genera un travel book para llevarlo offline durante el viaje.",
  },
];

function NewTripDialog({ open, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("Japan");
  const [imageUrl, setImageUrl] = useState("");

  if (!open) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    onCreate({
      title: title.trim() || "Sin título",
      destination: destination.trim() || "Japan",
      imageUrl: imageUrl.trim() || null,
    });
    setTitle("");
    setDestination("Japan");
    setImageUrl("");
  };

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog-card landing-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Crear nuevo viaje"
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <h2>Crear nuevo viaje</h2>
          <p className="text-xs">
            Define un título, el destino y opcionalmente una imagen para la
            tarjeta del viaje.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="landing-new-trip-form">
          <label>
            <span className="text-xs">Nombre del viaje</span>
            <input
              className="input"
              placeholder="Ej. Japón 2026 con amigos"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
            />
          </label>

          <label>
            <span className="text-xs">Destino / país</span>
            <input
              className="input"
              placeholder="Japan"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
            />
          </label>

          <label className="landing-field-wide">
            <span className="text-xs">URL de imagen</span>
            <input
              className="input"
              placeholder="https://..."
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
            />
          </label>

          <div className="landing-new-trip-actions">
            <button type="button" className="btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn">
              Crear viaje
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OnboardingPanel({ onCreate }) {
  return (
    <div className="onboarding-panel">
      <div className="onboarding-copy">
        <div className="empty-state-kicker">Empieza aquí</div>
        <h2>Tu workspace de viaje está listo</h2>
        <p className="text-xs">
          Crea un viaje y construye el plan con mapa, presupuesto, checklist y
          colaboradores desde el primer día.
        </p>
        <button className="btn" onClick={onCreate}>
          Crear primer viaje
        </button>
      </div>

      <div className="onboarding-steps">
        {ONBOARDING_STEPS.map((step, index) => (
          <div key={step.title} className="onboarding-step">
            <span className="onboarding-step-number">{index + 1}</span>
            <div>
              <div className="font-medium">{step.title}</div>
              <div className="text-xs">{step.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage({
  trips,
  publicTrips = [],
  onEnterTrip,
  onEnterPublicTrip,
  onAddTrip,
  onDuplicateTrip,
  duplicatingTripId,
  loading,
  loadingPublic,
  error,
  publicError,
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState("mine");

  const handleCreate = (data) => {
    onAddTrip(data);
    setDialogOpen(false);
  };

  const renderMine = () => {
    if (error) {
      return (
        <div className="empty-state empty-state--rich">
          <div className="empty-state-kicker">No pudimos cargar</div>
          <div className="font-semibold">Error al traer tus viajes</div>
          <div className="text-xs">{error}</div>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="trips-grid" style={{ marginTop: 12 }}>
          {[0, 1, 2].map((item) => (
            <div key={item} className="trip-card trip-card--skeleton" />
          ))}
        </div>
      );
    }

    if (trips.length === 0) {
      return <OnboardingPanel onCreate={() => setDialogOpen(true)} />;
    }

    return (
      <div className="trips-grid" style={{ marginTop: 12 }}>
        {trips.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            onClick={() => onEnterTrip(trip.id)}
            onDuplicate={onDuplicateTrip}
            duplicateDisabled={duplicatingTripId === trip.id}
          />
        ))}
      </div>
    );
  };

  const renderPublic = () => {
    if (publicError) {
      return (
        <div className="empty-state empty-state--rich">
          <div className="empty-state-kicker">No pudimos cargar</div>
          <div className="font-semibold">Error al traer viajes públicos</div>
          <div className="text-xs">{publicError}</div>
        </div>
      );
    }

    if (loadingPublic) {
      return (
        <div className="trips-grid" style={{ marginTop: 12 }}>
          {[0, 1, 2].map((item) => (
            <div key={item} className="trip-card trip-card--skeleton" />
          ))}
        </div>
      );
    }

    if (publicTrips.length === 0) {
      return (
        <div className="empty-state empty-state--rich">
          <div className="empty-state-kicker">Viajes públicos</div>
          <div className="font-semibold">Aún no hay viajes publicados</div>
          <div className="text-xs">
            Cuando alguien publique un viaje desde Configuración, aparecerá
            aquí en modo solo lectura.
          </div>
        </div>
      );
    }

    return (
      <div className="trips-grid" style={{ marginTop: 12 }}>
        {publicTrips.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            badgeLabel="Público"
            duplicateTitle="Copiar viaje"
            onClick={() => onEnterPublicTrip?.(trip)}
            onDuplicate={onDuplicateTrip}
            duplicateDisabled={duplicatingTripId === trip.id}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="landing-root">
      <div className="landing-header">
        <div>
          <div className="landing-title">dibu trip planner</div>
          <div className="landing-subtitle">
            Organiza viajes con días, lugares, gastos, checklist y colaboración.
          </div>
        </div>

        <div className="landing-header-actions">
          <div className="landing-view-tabs" role="tablist" aria-label="Viajes">
            <button
              className={
                "btn-outline text-xs " +
                (activeView === "mine" ? "btn-active" : "")
              }
              onClick={() => setActiveView("mine")}
              role="tab"
              aria-selected={activeView === "mine"}
            >
              Mis viajes
            </button>
            <button
              className={
                "btn-outline text-xs " +
                (activeView === "public" ? "btn-active" : "")
              }
              onClick={() => setActiveView("public")}
              role="tab"
              aria-selected={activeView === "public"}
            >
              Viajes públicos
            </button>
          </div>

          {activeView === "mine" && (
            <button
              className="btn landing-new-trip-button"
              onClick={() => setDialogOpen(true)}
            >
              + Nuevo viaje
            </button>
          )}
        </div>
      </div>

      <div className="landing-trips-section">
        {activeView === "mine" ? renderMine() : renderPublic()}
      </div>

      <NewTripDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
