import { useState } from "react";
import { useItineraryStore } from "../hooks/useItineraryStore";

export default function PackingListPanel() {
  const items = useItineraryStore((s) => s.packingItems);
  const addPackingItem = useItineraryStore((s) => s.addPackingItem);
  const togglePackingItem = useItineraryStore((s) => s.togglePackingItem);
  const removePackingItem = useItineraryStore((s) => s.removePackingItem);
  const [text, setText] = useState("");

  const addItem = () => {
    const value = text.trim();
    if (!value) return;
    addPackingItem(value);
    setText("");
  };

  return (
    <div className="list-panel">
      <div>
        <h2 className="font-semibold mb-1">Packing list</h2>
        <p className="text-xs text-gray-600">
          Lista de cosas para llevar en el viaje. Marca lo que ya está listo.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Añadir ítem (p. ej. paraguas)..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addItem();
          }}
        />
        <button className="btn" onClick={addItem}>
          Añadir
        </button>
      </div>

      <ul className="list scroll-list">
        {items.map((item) => (
          <li
            key={item.id}
            className="item"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              opacity: item.done ? 0.6 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => togglePackingItem(item.id)}
              style={{ marginRight: 8 }}
            />
            <span
              className="text-xs"
              style={{
                flex: 1,
                textDecoration: item.done ? "line-through" : "none",
              }}
            >
              {item.label}
            </span>
            <button
              className="btn-outline"
              onClick={() => removePackingItem(item.id)}
            >
              Borrar
            </button>
          </li>
        ))}
        {!items.length && (
          <li className="item text-xs">
            Aún no tienes ítems. Añade algo arriba para empezar.
          </li>
        )}
      </ul>
    </div>
  );
}
