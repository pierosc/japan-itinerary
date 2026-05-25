import { useMemo, useState } from "react";
import { useItineraryStore } from "../../hooks/useItineraryStore";
import { formatConvertedJPY } from "../../utils/money";

function fmt(n) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function splitPeople(value) {
  return value
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

export default function ExpenseLedger({ trip, currentUser }) {
  const {
    expenses,
    selectedDate,
    addExpense,
    removeExpense,
    currency,
  } = useItineraryStore();

  const currentUserLabel =
    currentUser?.fullName ||
    currentUser?.primaryEmailAddress?.emailAddress ||
    currentUser?.id ||
    "Yo";

  const defaultPeople = useMemo(() => {
    const people = [currentUserLabel];
    if (trip?.ownerUserId && trip.ownerUserId !== currentUser?.id) {
      people.push(`Dueño ${trip.ownerUserId}`);
    }
    (trip?.sharedWithUserIds || []).forEach((id) => {
      if (id !== currentUser?.id) people.push(id);
    });
    return [...new Set(people)];
  }, [currentUser?.id, currentUserLabel, trip?.ownerUserId, trip?.sharedWithUserIds]);

  const [form, setForm] = useState({
    title: "",
    amountJPY: "",
    date: selectedDate,
    paidBy: currentUserLabel,
    kind: "personal",
    participantsText: defaultPeople.join(", "),
    notes: "",
  });

  const dayExpenses = expenses.filter((e) => e.date === selectedDate);
  const tripExpenses = expenses;

  const balances = useMemo(() => {
    const totals = new Map();

    tripExpenses.forEach((expense) => {
      const paidBy = expense.paidBy || "Sin persona";
      const amount = Number(expense.amountJPY) || 0;
      totals.set(paidBy, (totals.get(paidBy) || 0) + amount);

      if (expense.kind === "shared") {
        const participants = expense.participants?.length
          ? expense.participants
          : [paidBy];
        const share = participants.length ? amount / participants.length : 0;
        participants.forEach((person) => {
          totals.set(person, (totals.get(person) || 0) - share);
        });
      }
    });

    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [tripExpenses]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (!Number(form.amountJPY)) return;

    addExpense({
      title: form.title,
      amountJPY: form.amountJPY,
      date: form.date || selectedDate,
      paidBy: form.paidBy || currentUserLabel,
      kind: form.kind,
      participants:
        form.kind === "shared" ? splitPeople(form.participantsText) : [],
      notes: form.notes,
    });

    setForm((prev) => ({
      ...prev,
      title: "",
      amountJPY: "",
      date: selectedDate,
      notes: "",
    }));
  };

  return (
    <section className="card expense-ledger" data-tour="expense-ledger">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold mb-2">Gastos personales y compartidos</h2>
        <span className="text-xs">{tripExpenses.length} gastos</span>
      </div>

      <form className="expense-form" onSubmit={handleSubmit}>
        <label>
          <span className="text-xs">Concepto</span>
          <input
            className="input"
            placeholder="Souvenirs, hotel, taxi..."
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>

        <label>
          <span className="text-xs">Monto (¥)</span>
          <input
            className="input"
            type="number"
            min="0"
            value={form.amountJPY}
            onChange={(e) => setForm({ ...form, amountJPY: e.target.value })}
          />
        </label>

        <label>
          <span className="text-xs">Fecha</span>
          <input
            className="input"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </label>

        <label>
          <span className="text-xs">Pagado por</span>
          <input
            className="input"
            list="expense-people"
            value={form.paidBy}
            onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
          />
          <datalist id="expense-people">
            {defaultPeople.map((person) => (
              <option key={person} value={person} />
            ))}
          </datalist>
        </label>

        <label>
          <span className="text-xs">Tipo</span>
          <select
            className="input"
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value })}
          >
            <option value="personal">Personal</option>
            <option value="shared">Compartido</option>
          </select>
        </label>

        <label>
          <span className="text-xs">Participantes</span>
          <input
            className="input"
            disabled={form.kind !== "shared"}
            value={form.participantsText}
            onChange={(e) =>
              setForm({ ...form, participantsText: e.target.value })
            }
            placeholder="Separados por coma"
          />
        </label>

        <label className="expense-notes">
          <span className="text-xs">Notas</span>
          <input
            className="input"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>

        <button className="btn" type="submit">
          Agregar gasto
        </button>
      </form>

      <div className="expense-columns">
        <div>
          <div className="font-medium mb-2">Día seleccionado</div>
          <ul className="list scroll-list expense-list">
            {dayExpenses.length ? (
              dayExpenses.map((expense) => (
                <li className="item" key={expense.id}>
                  <div className="flex justify-between gap-2">
                    <div style={{ minWidth: 0 }}>
                      <div className="font-medium">{expense.title}</div>
                      <div className="text-xs">
                        {expense.kind === "shared" ? "Compartido" : "Personal"} ·{" "}
                        {expense.paidBy}
                      </div>
                      {expense.kind === "shared" && (
                        <div className="text-xs">
                          Entre: {(expense.participants || []).join(", ")}
                        </div>
                      )}
                      {expense.kind === "shared" && (
                        <div className="text-xs">
                          Por persona:{" "}
                          {formatConvertedJPY(
                            (Number(expense.amountJPY) || 0) /
                              ((expense.participants || []).length || 1),
                            currency
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="font-semibold">
                        ¥{fmt(Number(expense.amountJPY) || 0)}
                      </div>
                      <div className="text-xs">
                        {formatConvertedJPY(expense.amountJPY, currency)}
                      </div>
                      <button
                        className="btn-outline text-xs"
                        onClick={() => removeExpense(expense.id)}
                        type="button"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="item text-xs">Sin gastos para este día.</li>
            )}
          </ul>
        </div>

        <div>
          <div className="font-medium mb-2">Balance del viaje</div>
          <ul className="list scroll-list expense-list">
            {balances.length ? (
              balances.map(([person, amount]) => (
                <li className="item" key={person}>
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{person}</span>
                    <span
                      className="font-semibold"
                      style={{ color: amount >= 0 ? "var(--ok)" : "var(--warn)" }}
                    >
                      {amount >= 0 ? "+" : "-"}¥{fmt(Math.abs(amount))}
                    </span>
                  </div>
                  <div className="text-xs">
                    ≈ {currency.code}{" "}
                    {Math.abs(amount * (currency.ratePerJPY || 0)).toFixed(2)}
                  </div>
                </li>
              ))
            ) : (
              <li className="item text-xs">Sin balance todavía.</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
