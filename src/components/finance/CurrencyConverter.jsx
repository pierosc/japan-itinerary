import { useState } from "react";
import { useItineraryStore } from "../../hooks/useItineraryStore";

const presets = [
  { code: "USD", ratePerJPY: 0.0065 },
  { code: "EUR", ratePerJPY: 0.006 },
  { code: "PEN", ratePerJPY: 0.025 }, // Perú (aprox)
  { code: "MXN", ratePerJPY: 0.11 },
  { code: "CLP", ratePerJPY: 6.0 },
];

export default function CurrencyConverter() {
  const { currency, setCurrencyCode, setCurrencyRatePerJPY } =
    useItineraryStore();
  const [jpy, setJpy] = useState(1000);

  const converted = (Number(jpy) || 0) * (currency.ratePerJPY || 0);

  return (
    <>
      <h2 className="font-semibold mb-2">Convertidor de moneda</h2>
      <div
        className="grid"
        style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}
      >
        <label>
          <span className="text-xs">Moneda destino</span>
          <select
            className="input"
            value={currency.code}
            onChange={(e) => setCurrencyCode(e.target.value)}
          >
            {presets.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-xs">Tasa (1 JPY → {currency.code})</span>
          <input
            className="input"
            type="number"
            step="0.0001"
            value={currency.ratePerJPY}
            onChange={(e) => setCurrencyRatePerJPY(e.target.value)}
          />
        </label>
        <div className="flex" style={{ gap: 8, alignItems: "flex-end" }}>
          {presets.map((p) => (
            <button
              key={p.code}
              className="btn-outline"
              onClick={() => {
                setCurrencyCode(p.code);
                setCurrencyRatePerJPY(p.ratePerJPY);
              }}
            >
              {p.code}
            </button>
          ))}
        </div>
      </div>

      <div
        className="mt-2 grid"
        style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}
      >
        <label>
          <span className="text-xs">Conversor rápido</span>
          <input
            className="input"
            type="number"
            value={jpy}
            onChange={(e) => setJpy(e.target.value)}
          />
        </label>
        <div
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontWeight: 700 }}>
            ¥{Number(jpy) || 0} ≈ {currency.code}{" "}
            {converted ? converted.toFixed(2) : "0.00"}
          </div>
        </div>
      </div>
    </>
  );
}
