import { useState } from "react";
import { useItineraryStore } from "../../hooks/useItineraryStore";

export default function DaySelector() {
  const {
    days,
    selectedDate,
    setSelectedDate,
    addDay,
    removeDay,
    totalJPYForDate,
  } = useItineraryStore();
  const [newDate, setNewDate] = useState("");

  return (
    <>
      <h2 className="font-semibold mb-2">Días del viaje</h2>

      {/* 1 sola línea, sin wrap; scroll horizontal si no alcanza */}
      <div
        className="flex"
        style={{
          gap: 8,
          alignItems: "center",
          flexWrap: "nowrap",
          overflowX: "auto",
          paddingBottom: 2,
        }}
      >
        {/* SELECT de días */}
        <select
          className="input"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          title="Selecciona el día del itinerario"
          style={{ flex: "1 1 auto", minWidth: 260 }}
        >
          {days.map((d) => {
            const total = totalJPYForDate(d);
            return (
              <option key={d} value={d}>
                {`${d}${total ? ` · ¥${total}` : ""}`}
              </option>
            );
          })}
        </select>

        {/* Añadir día (input + botón) */}
        <input
          type="date"
          className="input"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          style={{ width: 200 }}
        />

        <button
          className="btn"
          onClick={() => {
            if (!newDate) return;
            addDay(newDate);
            setNewDate("");
          }}
          title="Añadir día"
          style={{ whiteSpace: "nowrap" }}
        >
          Añadir día
        </button>

        {days.length > 1 && (
          <button
            className="btn-outline"
            onClick={() => {
              if (confirm("¿Eliminar el día seleccionado y sus puntos?")) {
                removeDay(selectedDate);
              }
            }}
            title="Eliminar día seleccionado"
            style={{ whiteSpace: "nowrap" }}
          >
            Eliminar día
          </button>
        )}
      </div>
    </>
  );
}
