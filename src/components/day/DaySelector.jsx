import { useItineraryStore } from "../../hooks/useItineraryStore";
import { useState } from "react";

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
      <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
        {days.map((d) => {
          const total = totalJPYForDate(d);
          const active = d === selectedDate;
          return (
            <button
              key={d}
              className={`btn-outline`}
              style={{
                borderColor: active ? "var(--brand)" : "var(--border)",
                color: active ? "var(--brand)" : "var(--text)",
              }}
              onClick={() => setSelectedDate(d)}
              title={`Gasto día: ¥${total}`}
            >
              {d} {total ? `· ¥${total}` : ""}
            </button>
          );
        })}
      </div>

      <div className="mt-2" style={{ display: "flex", gap: 8 }}>
        <input
          type="date"
          className="input"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
        />
        <button
          className="btn"
          onClick={() => {
            if (!newDate) return;
            addDay(newDate);
            setNewDate("");
          }}
        >
          Añadir día
        </button>
        {days.length > 1 && (
          <button
            className="btn-outline"
            onClick={() => {
              if (confirm("¿Eliminar el día actual y sus puntos?")) {
                removeDay(selectedDate);
              }
            }}
          >
            Eliminar día actual
          </button>
        )}
      </div>
    </>
  );
}
