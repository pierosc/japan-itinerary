import ItineraryList from "./ItineraryList";
import PlaceForm from "./PlaceForm";
import ImportExport from "./ImportExport";
import DaySelector from "./day/DaySelector";
import FinancePanel from "./finance/FinancePanel";
import { useItineraryStore } from "../hooks/useItineraryStore";

export default function Sidebar() {
  const selectedId = useItineraryStore((s) => s.selectedId);

  return (
    <div className="h-full w-full flex flex-col gap-3">
      <div className="toolbar card">
        <ImportExport />
      </div>

      <div className="card">
        <DaySelector />
      </div>

      <FinancePanel />

      <div className="card">
        <ItineraryList />
      </div>

      {/* Mantengo el editor en el panel lateral si prefieres editar aquí también */}
      {selectedId && (
        <div className="card">
          <PlaceForm />
        </div>
      )}
    </div>
  );
}
