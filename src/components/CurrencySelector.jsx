import { useItineraryStore } from "../hooks/useItineraryStore";
import { CURRENCY_PRESETS } from "../utils/money";

export default function CurrencySelector({ compact = false }) {
  const currency = useItineraryStore((s) => s.currency);
  const setCurrencyCode = useItineraryStore((s) => s.setCurrencyCode);
  const setCurrencyRatePerJPY = useItineraryStore(
    (s) => s.setCurrencyRatePerJPY
  );

  const handleCurrencyChange = (code) => {
    const preset = CURRENCY_PRESETS.find((item) => item.code === code);
    setCurrencyCode(code);
    if (preset) setCurrencyRatePerJPY(preset.ratePerJPY);
  };

  return (
    <div className={compact ? "currency-selector compact" : "currency-selector"}>
      <label className="currency-selector-field">
        {!compact && <span className="text-xs">Moneda</span>}
        <select
          className="input"
          aria-label="Moneda"
          value={currency.code}
          onChange={(e) => handleCurrencyChange(e.target.value)}
        >
          {CURRENCY_PRESETS.map((preset) => (
            <option key={preset.code} value={preset.code}>
              {preset.code}
            </option>
          ))}
        </select>
      </label>

      {!compact && (
        <label className="currency-selector-field">
          <span className="text-xs">Tasa 1 JPY</span>
          <input
            className="input"
            type="number"
            step="0.0001"
            value={currency.ratePerJPY}
            onChange={(e) => setCurrencyRatePerJPY(e.target.value)}
          />
        </label>
      )}
    </div>
  );
}
