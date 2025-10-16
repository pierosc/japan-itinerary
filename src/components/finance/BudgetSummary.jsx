import { useItineraryStore } from "../../hooks/useItineraryStore";

function fmt(n) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export default function BudgetSummary() {
  const { days, selectedDate, totalJPYForDate, totalJPYAll, currency } =
    useItineraryStore();

  const dayJPY = totalJPYForDate(selectedDate);
  const tripJPY = totalJPYAll();
  const dayFX = dayJPY * (currency.ratePerJPY || 0);
  const tripFX = tripJPY * (currency.ratePerJPY || 0);

  return (
    <>
      <h2 className="font-semibold mb-2">Gastos</h2>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="card">
          <div className="text-xs">Día {selectedDate}</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>¥{fmt(dayJPY)}</div>
          <div className="text-xs">
            ≈ {currency.code} {dayFX ? dayFX.toFixed(2) : "0.00"}
          </div>
        </div>
        <div className="card">
          <div className="text-xs">Total viaje ({days.length} día/s)</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>¥{fmt(tripJPY)}</div>
          <div className="text-xs">
            ≈ {currency.code} {tripFX ? tripFX.toFixed(2) : "0.00"}
          </div>
        </div>
      </div>
    </>
  );
}
