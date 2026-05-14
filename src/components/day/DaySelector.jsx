import { useEffect, useState } from "react";
import { useItineraryStore } from "../../hooks/useItineraryStore";
import { formatConvertedJPY } from "../../utils/money";

function CalendarDialog({
  open,
  title,
  value,
  confirmLabel,
  onClose,
  onConfirm,
}) {
  const [date, setDate] = useState(value || "");

  useEffect(() => {
    setDate(value || "");
  }, [value, open]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog-card calendar-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="section-heading">
          <h2 className="font-semibold">{title}</h2>
          <button className="icon-button" onClick={onClose} title="Cerrar">
            ×
          </button>
        </div>

        <input
          className="input calendar-input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          autoFocus
        />

        <div className="dialog-actions">
          <button className="btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn"
            disabled={!date}
            onClick={() => onConfirm(date)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DaySelector() {
  const {
    days,
    selectedDate,
    setSelectedDate,
    addDay,
    removeDay,
    renameDay,
    totalJPYForDate,
    totalExpenseJPYForDate,
    currency,
  } = useItineraryStore();
  const [dialog, setDialog] = useState(null);

  const selectedTotal =
    totalJPYForDate(selectedDate) + totalExpenseJPYForDate(selectedDate);

  const closeDialog = () => setDialog(null);

  const handleCreateDay = (date) => {
    addDay(date);
    closeDialog();
  };

  const handleRenameDay = (date) => {
    renameDay(selectedDate, date);
    closeDialog();
  };

  const handleRemoveDay = () => {
    if (days.length <= 1) return;
    if (
      confirm(
        "¿Eliminar este día? Sus lugares se moverán a My Places y sus rutas del día se quitarán."
      )
    ) {
      removeDay(selectedDate);
    }
  };

  return (
    <div className="day-selector">
      <div className="section-heading">
        <div>
          <h2 className="font-semibold">Días del viaje</h2>
          <div className="text-xs">
            {days.length} día/s
            {selectedTotal
              ? ` · ¥${selectedTotal} (${formatConvertedJPY(
                  selectedTotal,
                  currency
                )})`
              : ""}
          </div>
        </div>

        <select
          className="input day-select"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          title="Selecciona el día del itinerario"
        >
          {days.map((d) => {
            const total = totalJPYForDate(d) + totalExpenseJPYForDate(d);
            return (
              <option key={d} value={d}>
                {`${d}${
                  total
                    ? ` · ¥${total} (${formatConvertedJPY(total, currency)})`
                    : ""
                }`}
              </option>
            );
          })}
        </select>

        <div className="day-icon-actions">
          <button
            className="icon-button"
            onClick={() => setDialog("create")}
            title="Añadir día"
            aria-label="Añadir día"
          >
            +
          </button>
          <button
            className="icon-button"
            onClick={() => setDialog("rename")}
            title="Cambiar fecha"
            aria-label="Cambiar fecha"
          >
            ◷
          </button>
          <button
            className="icon-button icon-button-danger"
            disabled={days.length <= 1}
            onClick={handleRemoveDay}
            title="Eliminar día"
            aria-label="Eliminar día"
          >
            ×
          </button>
        </div>
      </div>

      <CalendarDialog
        open={dialog === "create"}
        title="Añadir día"
        value=""
        confirmLabel="Crear día"
        onClose={closeDialog}
        onConfirm={handleCreateDay}
      />

      <CalendarDialog
        open={dialog === "rename"}
        title="Cambiar fecha"
        value={selectedDate}
        confirmLabel="Actualizar día"
        onClose={closeDialog}
        onConfirm={handleRenameDay}
      />
    </div>
  );
}
