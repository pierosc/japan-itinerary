// src/components/finance/FinancePanel.jsx
import { useItineraryStore } from "../../hooks/useItineraryStore";
import BudgetSummary from "./BudgetSummary";
import CurrencyConverter from "./CurrencyConverter";

export default function FinancePanel() {
  const financeOpen = useItineraryStore((s) => s.ui.financeOpen);
  const toggleFinance = useItineraryStore((s) => s.toggleFinance);

  return (
    <div className="card">
      <div
        className="flex"
        style={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <h2 className="font-semibold">Gastos & Conversor</h2>
        <button className="btn-outline" onClick={toggleFinance}>
          {financeOpen ? "Contraer" : "Expandir"}
        </button>
      </div>

      {financeOpen && (
        <div className="mt-2" style={{ display: "grid", gap: 12 }}>
          <BudgetSummary />
          <CurrencyConverter />
        </div>
      )}
    </div>
  );
}
