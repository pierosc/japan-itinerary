// src/components/PackingListPanel.jsx
import { useState } from "react";

/**
 * Panel "Packing list"
 * - Lista simple de cosas a llevar
 * - Permite añadir, marcar como hecho y borrar
 * - Por ahora vive solo en el estado del componente (no persistente)
 */
export default function PackingListPanel() {
  const [items, setItems] = useState([
    { id: 1, label: "Pasaporte", done: false },
    { id: 2, label: "Tarjeta de crédito / efectivo", done: false },
    { id: 3, label: "Cargadores y adaptador", done: false },
  ]);
  const [text, setText] = useState("");

  const addItem = () => {
    const value = text.trim();
    if (!value) return;
    setItems((prev) => [
      ...prev,
      { id: Date.now(), label: value, done: false },
    ]);
    setText("");
  };

  const toggleItem = (id) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it))
    );
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
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
          placeholder="Añadir ítem (p. ej. paraguas)…"
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
              onChange={() => toggleItem(item.id)}
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
            <button className="btn-outline" onClick={() => removeItem(item.id)}>
              🗑
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
