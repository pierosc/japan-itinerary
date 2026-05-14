// src/components/PlaceItemsEditor.jsx
import { useEffect, useMemo, useState } from "react";
import { useItineraryStore } from "../hooks/useItineraryStore";
import { v4 as uuid } from "uuid";
import { formatConvertedJPY, formatMoneyPair } from "../utils/money";
import { supabase } from "./lib/supabaseClient";

function currency(n) {
  const num = Number(n) || 0;
  return `¥${num.toFixed(0)}`;
}

function userLabel(user) {
  return (
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    user?.id ||
    "Yo"
  );
}

function sanitizeItem(item) {
  const clean = { ...item };
  delete clean.imageDataUrl;
  return clean;
}

function isImageUrl(value) {
  return /^https?:\/\/.+/i.test((value || "").trim());
}

function profileLabel(profile) {
  return profile?.full_name || profile?.email || profile?.user_id || "";
}

export default function PlaceItemsEditor({ place, trip, currentUser }) {
  const {
    updatePlace,
    currency: selectedCurrency,
    collaborators,
    addExpense,
    selectedDate,
  } = useItineraryStore();
  const [accessProfiles, setAccessProfiles] = useState([]);

  const accessUserIds = useMemo(
    () =>
      [
        trip?.ownerUserId,
        ...(Array.isArray(trip?.sharedWithUserIds)
          ? trip.sharedWithUserIds
          : []),
      ].filter(Boolean),
    [trip?.ownerUserId, trip?.sharedWithUserIds]
  );

  useEffect(() => {
    if (!supabase || !accessUserIds.length) {
      setAccessProfiles([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, email, full_name")
          .in("user_id", [...new Set(accessUserIds)]);

        if (error) throw error;
        if (!cancelled) setAccessProfiles(data || []);
      } catch {
        if (!cancelled) setAccessProfiles([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessUserIds]);

  const peopleOptions = useMemo(() => {
    const people = [userLabel(currentUser)];
    const profileById = new Map(
      accessProfiles.map((profile) => [profile.user_id, profile])
    );

    accessUserIds.forEach((id) => {
      if (id === currentUser?.id) {
        people.push(userLabel(currentUser));
        return;
      }

      const profile = profileById.get(id);
      people.push(profileLabel(profile) || id);
    });

    (collaborators || []).forEach((person) => {
      if (person?.nameOrEmail) people.push(person.nameOrEmail);
    });

    (place.items || []).forEach((item) => {
      if (item?.paidBy) people.push(item.paidBy);
    });

    return [...new Set(people.filter(Boolean))];
  }, [
    accessProfiles,
    accessUserIds,
    collaborators,
    currentUser,
    place.items,
  ]);

  const defaultPaidBy = peopleOptions[0] || "Yo";
  const [draft, setDraft] = useState({
    name: "",
    qty: 1,
    priceJPY: 0,
    peopleCount: 1,
    paidBy: defaultPaidBy,
    notes: "",
    imageUrl: "",
  });

  const items = (place.items || []).map(sanitizeItem);
  const subtotal = useMemo(
    () =>
      items.reduce(
        (acc, it) => acc + (Number(it.qty) || 0) * (Number(it.priceJPY) || 0),
        0
      ),
    [items]
  );

  const totalsByPayer = useMemo(() => {
    const totals = new Map();
    items.forEach((item) => {
      const paidBy = item.paidBy || defaultPaidBy;
      const total = (Number(item.qty) || 0) * (Number(item.priceJPY) || 0);
      totals.set(paidBy, (totals.get(paidBy) || 0) + total);
    });
    return [...totals.entries()].filter(([, total]) => total > 0);
  }, [defaultPaidBy, items]);

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
        paidBy: draft.paidBy || defaultPaidBy,
        notes: draft.notes?.trim() || "",
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
      paidBy: draft.paidBy || defaultPaidBy,
      notes: "",
      imageUrl: "",
    });
  };

  const updateItem = (id, patch) => {
    const next = items.map((it) =>
      it.id === id ? sanitizeItem({ ...it, ...patch }) : it
    );
    updatePlace(place.id, { items: next });
  };

  const removeItem = (id) => {
    const next = items.filter((it) => it.id !== id);
    updatePlace(place.id, { items: next });
  };

  const registerExpensesByPayer = () => {
    totalsByPayer.forEach(([paidBy, amountJPY]) => {
      addExpense({
        title: place.name || "Compra",
        amountJPY,
        date: place.date || selectedDate,
        paidBy,
        kind: "personal",
        notes: `Desde lista de ${
          place.category === "restaurante" ? "platos" : "compras"
        }`,
      });
    });
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
        <label className="place-items-name-field">
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

        <label className="place-items-small-field">
          <span className="text-xs">Cantidad</span>
          <input
            className="input"
            type="number"
            min={1}
            value={draft.qty}
            onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
          />
        </label>

        <label className="place-items-price-field">
          <span className="text-xs">Precio (yen)</span>
          <input
            className="input"
            type="number"
            min={0}
            value={draft.priceJPY}
            onChange={(e) => setDraft({ ...draft, priceJPY: e.target.value })}
          />
        </label>

        <label className="place-items-paid-field">
          <span className="text-xs">Pagado por</span>
          <input
            className="input"
            list={`place-item-people-${place.id}`}
            value={draft.paidBy}
            onChange={(e) => setDraft({ ...draft, paidBy: e.target.value })}
          />
        </label>

        <label className="place-items-small-field">
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

        <label className="place-items-notes-field">
          <span className="text-xs">Notas</span>
          <input
            className="input"
            placeholder="Opcional"
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
        </label>

        <label className="place-items-url-field">
          <span className="text-xs">Imagen URL</span>
          <input
            className="input"
            placeholder="https://imagen.com/foto.jpg"
            value={draft.imageUrl}
            onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
          />
        </label>

        <button className="btn place-items-add-button" onClick={addItem}>
          Anadir
        </button>

        <datalist id={`place-item-people-${place.id}`}>
          {peopleOptions.map((person) => (
            <option key={person} value={person} />
          ))}
        </datalist>
      </div>

      <div className="mt-2 card" style={{ padding: 8 }}>
        {items.length === 0 ? (
          <div className="text-xs">Sin items aun.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="place-items-table">
              <thead>
                <tr className="text-xs" style={{ textAlign: "left" }}>
                  <th>Ok</th>
                  <th>Imagen</th>
                  <th>Item</th>
                  <th>Cant.</th>
                  <th>Precio yen</th>
                  <th>Pagado por</th>
                  <th>Personas</th>
                  <th>Total</th>
                  <th>Por persona</th>
                  <th>Notas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const total =
                    (Number(it.qty) || 0) * (Number(it.priceJPY) || 0);
                  const peopleCount = Number(it.peopleCount) || 1;
                  const perPerson = total / peopleCount;
                  const src = it.imageUrl || "";
                  return (
                    <tr
                      key={it.id}
                      className="text-xs"
                      style={{ borderTop: "1px solid var(--border)" }}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={!!it.checked}
                          onChange={(e) =>
                            updateItem(it.id, { checked: e.target.checked })
                          }
                        />
                      </td>

                      <td className="place-item-image-cell">
                        {isImageUrl(src) ? (
                          <a href={src} target="_blank" rel="noreferrer">
                            <img src={src} alt={it.name} />
                          </a>
                        ) : (
                          <div className="text-xs" style={{ opacity: 0.7 }}>
                            Sin imagen
                          </div>
                        )}
                        <input
                          className="input mt-1"
                          placeholder="https://imagen.com/foto.jpg"
                          value={src}
                          onChange={(e) =>
                            updateItem(it.id, { imageUrl: e.target.value })
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="input"
                          value={it.name}
                          onChange={(e) =>
                            updateItem(it.id, { name: e.target.value })
                          }
                        />
                      </td>

                      <td>
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

                      <td>
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

                      <td>
                        <input
                          className="input"
                          list={`place-item-people-${place.id}`}
                          value={it.paidBy || defaultPaidBy}
                          onChange={(e) =>
                            updateItem(it.id, { paidBy: e.target.value })
                          }
                        />
                      </td>

                      <td>
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

                      <td style={{ whiteSpace: "nowrap" }}>
                        <div>{currency(total)}</div>
                        <div className="text-xs">
                          {formatConvertedJPY(total, selectedCurrency)}
                        </div>
                      </td>

                      <td style={{ whiteSpace: "nowrap" }}>
                        <div>{currency(perPerson)}</div>
                        <div className="text-xs">
                          {formatConvertedJPY(perPerson, selectedCurrency)}
                        </div>
                      </td>

                      <td>
                        <input
                          className="input"
                          value={it.notes || ""}
                          onChange={(e) =>
                            updateItem(it.id, { notes: e.target.value })
                          }
                        />
                      </td>

                      <td style={{ textAlign: "right" }}>
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

      {totalsByPayer.length > 0 && (
        <div className="place-items-payer-summary mt-2">
          {totalsByPayer.map(([person, total]) => (
            <div className="chip" key={person}>
              {person}: {formatMoneyPair(total, selectedCurrency)}
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 place-items-actions">
        <button
          className="btn-outline"
          onClick={() =>
            updatePlace(place.id, { spendJPY: Math.round(subtotal) })
          }
          title="Copiar subtotal al campo Gasto (yen) del lugar"
        >
          Aplicar subtotal a Gasto
        </button>
        <button
          className="btn-outline"
          onClick={registerExpensesByPayer}
          disabled={!totalsByPayer.length}
          title="Crea un gasto por cada usuario segun los items pagados"
        >
          Registrar gastos por usuario
        </button>
      </div>
    </div>
  );
}
