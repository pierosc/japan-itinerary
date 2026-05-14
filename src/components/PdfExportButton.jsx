import { useState } from "react";
import { useItineraryStore } from "../hooks/useItineraryStore";
import { generateTripPdf } from "../utils/tripPdf";

export default function PdfExportButton({ trip }) {
  const [busy, setBusy] = useState(false);
  const days = useItineraryStore((s) => s.days);
  const dayTitles = useItineraryStore((s) => s.dayTitles);
  const places = useItineraryStore((s) => s.places);
  const routes = useItineraryStore((s) => s.routes);
  const expenses = useItineraryStore((s) => s.expenses);
  const packingItems = useItineraryStore((s) => s.packingItems);
  const collaborators = useItineraryStore((s) => s.collaborators);
  const currency = useItineraryStore((s) => s.currency);

  const handleClick = async () => {
    setBusy(true);
    try {
      await generateTripPdf({
        trip,
        days,
        dayTitles,
        places,
        routes,
        expenses,
        packingItems,
        collaborators,
        currency,
      });
    } finally {
      setTimeout(() => setBusy(false), 350);
    }
  };

  return (
    <button
      className="planner-pdf-button"
      type="button"
      onClick={handleClick}
      disabled={busy}
      title="Descargar PDF bonito"
    >
      <span>{busy ? "..." : "PDF"}</span>
    </button>
  );
}
