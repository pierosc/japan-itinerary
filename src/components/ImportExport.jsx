import { useItineraryStore } from "../hooks/useItineraryStore";

export default function ImportExport() {
  const { exportJSON, importJSON, clearAll } = useItineraryStore();

  const handleExport = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dt = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.download = `itinerario-japon-${dt}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const txt = await file.text();
    try {
      importJSON(txt);
      alert("Itinerario cargado.");
    } catch (err) {
      alert("Error al importar: " + err.message);
    }
    e.target.value = "";
  };

  return (
    <div className="toolbar card">
      <label className="btn" style={{ cursor: "pointer" }}>
        Importar JSON
        <input
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImport}
        />
      </label>
      <button className="btn-outline" onClick={handleExport}>
        Exportar JSON
      </button>
      <button className="btn-outline" onClick={clearAll}>
        Vaciar
      </button>
    </div>
  );
}
