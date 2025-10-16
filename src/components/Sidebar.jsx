import ItineraryList from "./ItineraryList";
import PlaceForm from "./PlaceForm";
import ImportExport from "./ImportExport";
import DaySelector from "./day/DaySelector";
import BudgetSummary from "./finance/BudgetSummary";
import CurrencyConverter from "./finance/CurrencyConverter";
import { useItineraryStore } from "../hooks/useItineraryStore";

export default function Sidebar() {
  const selectedId = useItineraryStore((s) => s.selectedId);
  const selectedDate = useItineraryStore((s) => s.selectedDate);

  return (
    <div className="h-full w-full flex flex-col gap-3">
      <div className="toolbar card">
        <ImportExport />
      </div>

      <div className="card">
        <DaySelector />
      </div>

      <div className="card">
        <BudgetSummary />
      </div>

      <div className="card">
        <CurrencyConverter />
      </div>

      <div className="card">
        <ItineraryList />
      </div>

      {selectedId && (
        <div className="card">
          <PlaceForm />
        </div>
      )}
    </div>
  );
}
