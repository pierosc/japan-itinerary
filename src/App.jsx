import MapPanel from "./components/MapPanel";
import Sidebar from "./components/Sidebar";
import "./styles.css";

export default function App() {
  return (
    <div className="h-screen w-screen p-3">
      <div className="h-full grid grid-cols-2 gap-3">
        <div className="panel">
          <div className="h-full">
            <MapPanel />
          </div>
        </div>
        <div className="panel overflow-auto">
          <div className="h-full flex flex-col gap-3 p-3">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
