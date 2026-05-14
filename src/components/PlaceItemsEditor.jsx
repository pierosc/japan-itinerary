// src/components/PlaceItemsEditor.jsx
import { useMemo, useState } from "react";
import { useItineraryStore } from "../hooks/useItineraryStore";
import { v4 as uuid } from "uuid";
import { formatConvertedJPY, formatMoneyPair } from "../utils/money";

function currency(n) {
  const num = Number(n) || 0;
  return `¥${num.toFixed(0)}`;
}

export default function PlaceItemsEditor({ place }) {
  const { updatePlace, currency: selectedCurrency } = useItineraryStore();
  const [draft, setDraft] = useState({
    name: "",
    qty: 1,
    priceJPY: 0,
    peopleCount: 1,
    notes: "",
    imageDataUrl: "",
    imageUrl: "",
  });

  const items = place.items || [];
  const subtotal = useMemo(
    () =>
      items.reduce(
        (acc, it) => acc + (Number(it.qty) || 0) * (Number(it.priceJPY) || 0),
        0
      ),
    [items]
  );

  const addItem = () => {
    if (!draft.name.trim()) return;
    const next = [
      ...items,
      {
        id: uuid(),
        name: draft.name.trim(),
        qty: Number(draft.qty) || 1,
        priceJPY: Number(draft.priceJPY) || 0,
        peopleCount: Number(draft.peopleCount) || 1,
        notes: draft.notes?.trim() || "",
        imageDataUrl: draft.imageDataUrl || "",
        imageUrl: draft.imageUrl?.trim() || "",
        checked: false,
      },
    ];
    updatePlace(place.id, { items: next });
    setDraft({
      name: "",
      qty: 1,
      priceJPY: 0,
      peopleCount: 1,
      notes: "",
      imageDataUrl: "",
      imageUrl: "",
    });
  };

  const updateItem = (id, patch) => {
    const next = items.map((it) => (it.id === id ? { ...it, ...patch } : it));
    updatePlace(place.id, { items: next });
  };

  const removeItem = (id) => {
    const next = items.filter((it) => it.id !== id);
    updatePlace(place.id, { items: next });
  };

  const loadDraftImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      setDraft((d) => ({ ...d, imageDataUrl: reader.result, imageUrl: "" }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="card place-items-editor" style={{ marginTop: 8 }}>
      <div
        className="flex"
        style={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <h3 className="font-semibold">
          Lista de {place.category === "restaurante" ? "platos" : "compras"}
        </h3>
        <div className="text-xs">
          Subtotal: <b>{formatMoneyPair(subtotal, selectedCurrency)}</b>
        </div>
      </div>

      <div className="place-items-form mt-2">
        <label>
          <span className="text-xs">Item</span>
          <input
            className="input"
            placeholder={
              place.category === "restaurante"
                ? "Ej. Ramen Tonkotsu"
                : "Ej. Camara Fujifilm"
            }
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>

        <label>
          <span className="text-xs">Cantidad</span>
          <input
            className="input"
            type="number"
            min={1}
            value={draft.qty}
            onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
          />
        </label>

        <label>
          <span className="text-xs">Precio (yen)</span>
          <input
            className="input"
            type="number"
            min={0}
            value={draft.priceJPY}
            onChange={(e) => setDraft({ ...draft, priceJPY: e.target.value })}
          />
        </label>

        <label>
          <span className="text-xs">Personas</span>
          <input
            className="input"
            type="number"
            min={1}
            value={draft.peopleCount}
            onChange={(e) =>
              setDraft({ ...draft, peopleCount: e.target.value })
            }
          />
        </label>

        <label>
          <span className="text-xs">Notas</span>
          <input
            className="input"
            placeholder="Opcional"
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
        </label>

        <div>
          <span className="text-xs">Imagen (archivo o URL)</span>
          <div className="flex" style={{ gap: 8, alignItems: "center" }}>
            <label className="btn-outline" style={{ cursor: "pointer" }}>
              Subir
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => loadDraftImage(e.target.files?.[0])}
              />
            </label>
            <input
              className="input"
              placeholder="https://imagen.com/foto.jpg"
              value={draft.imageUrl}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  imageUrl: e.target.value,
                  imageDataUrl: "",
                })
              }
            />
          </div>
        </div>

        <div className="flex" style={{ gap: 8, alignItems: "end" }}>
          <button className="btn" onClick={addItem}>
            Anadir
          </button>
        </div>
      </div>

      <div className="mt-2 card" style={{ padding: 8 }}>
        {items.length === 0 ? (
          <div className="text-xs">Sin items aun.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-xs" style={{ textAlign: "left" }}>
                  <th style={{ padding: "6px 8px" }}>Ok</th>
                  <th style={{ padding: "6px 8px" }}>Imagen</th>
                  <th style={{ padding: "6px 8px" }}>Item</th>
                  <th style={{ padding: "6px 8px" }}>Cant.</th>
                  <th style={{ padding: "6px 8px" }}>Precio yen</th>
                  <th style={{ padding: "6px 8px" }}>Personas</th>
                  <th style={{ padding: "6px 8px" }}>Total</th>
                  <th style={{ padding: "6px 8px" }}>Por persona</th>
                  <th style={{ padding: "6px 8px" }}>Notas</th>
                  <th style={{ padding: "6px 8px" }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const total =
                    (Number(it.qty) || 0) * (Number(it.priceJPY) || 0);
                  const peopleCount = Number(it.peopleCount) || 1;
                  const perPerson = total / peopleCount;
                  const src = it.imageDataUrl || it.imageUrl || "";
                  return (
                    <tr
                      key={it.id}
                      className="text-xs"
                      style={{ borderTop: "1px solid var(--border)" }}
                    >
                      <td style={{ padding: "6px 8px" }}>
                        <input
                          type="checkbox"
                          checked={!!it.checked}
                          onChange={(e) =>
                            updateItem(it.id, { checked: e.target.checked })
                          }
                        />
                      </td>

                      <td style={{ padding: "6px 8px", width: 110 }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          {src ? (
                            <img
                              src={src}
                              alt={it.name}
                              style={{
                                width: 72,
                                height: 48,
                                objectFit: "cover",
                                borderRadius: 8,
                              }}
                            />
                          ) : (
                            <div className="text-xs" style={{ opacity: 0.7 }}>
                              Sin imagen
                            </div>
                          )}
                          <label
                            className="btn-outline"
                            style={{ cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            Subir
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = () =>
                                  updateItem(it.id, {
                                    imageDataUrl: reader.result,
                                    imageUrl: "",
                                  });
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>
                        </div>
                        <input
                          className="input mt-1"
                          placeholder="https://imagen.com/foto.jpg"
                          value={it.imageUrl || ""}
                          onChange={(e) =>
                            updateItem(it.id, {
                              imageUrl: e.target.value,
                              imageDataUrl: "",
                            })
                          }
                        />
                      </td>

                      <td style={{ padding: "6px 8px" }}>
                        <input
                          className="input"
                          value={it.name}
                          onChange={(e) =>
                            updateItem(it.id, { name: e.target.value })
                          }
                        />
                      </td>

                      <td style={{ padding: "6px 8px", width: 80 }}>
                        <input
                          className="input"
                          type="number"
                          min={1}
                          value={it.qty}
                          onChange={(e) =>
                            updateItem(it.id, {
                              qty: Number(e.target.value) || 1,
                            })
                          }
                        />
                      </td>

                      <td style={{ padding: "6px 8px", width: 120 }}>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          value={it.priceJPY}
                          onChange={(e) =>
                            updateItem(it.id, {
                              priceJPY: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </td>

                      <td style={{ padding: "6px 8px", width: 90 }}>
                        <input
                          className="input"
                          type="number"
                          min={1}
                          value={peopleCount}
                          onChange={(e) =>
                            updateItem(it.id, {
                              peopleCount: Number(e.target.value) || 1,
                            })
                          }
                        />
                      </td>

                      <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                        <div>{currency(total)}</div>
                        <div className="text-xs">
                          {formatConvertedJPY(total, selectedCurrency)}
                        </div>
                      </td>

                      <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                        <div>{currency(perPerson)}</div>
                        <div className="text-xs">
                          {formatConvertedJPY(perPerson, selectedCurrency)}
                        </div>
                      </td>

                      <td style={{ padding: "6px 8px" }}>
                        <input
                          className="input"
                          value={it.notes || ""}
                          onChange={(e) =>
                            updateItem(it.id, { notes: e.target.value })
                          }
                        />
                      </td>

                      <td style={{ padding: "6px 8px", textAlign: "right" }}>
                        <button
                          className="btn-outline"
                          onClick={() => removeItem(it.id)}
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div
        className="mt-2"
        style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
      >
        <button
          className="btn-outline"
          onClick={() =>
            updatePlace(place.id, { spendJPY: Math.round(subtotal) })
          }
          title="Copiar subtotal al campo Gasto (yen) del lugar"
        >
          Aplicar subtotal a Gasto
        </button>
      </div>
    </div>
  );
}
