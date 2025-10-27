// src/components/PlaceForm.jsx
import { useMemo } from "react";
import { useItineraryStore } from "../hooks/useItineraryStore";
import PlaceEditor from "./PlaceEditor";

export default function PlaceForm() {
  const { places, selectedId } = useItineraryStore();
  const place = useMemo(
    () => places.find((p) => p.id === selectedId),
    [places, selectedId]
  );
  if (!place) return null;

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Editar: {place.name || "Punto"}</h3>
      </div>
      <PlaceEditor place={place} />
    </>
  );
}
