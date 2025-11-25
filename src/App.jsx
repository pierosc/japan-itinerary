// src/App.jsx
import { useEffect } from "react";
import MapPanel from "./components/MapPanel";
import Sidebar from "./components/Sidebar";
import { useItineraryStore } from "./hooks/useItineraryStore";
import "./styles.css";

export default function App() {
  const theme = useItineraryStore((s) => s.ui.theme);

  // Sincronizar tema con clase en <body>
  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    if (theme === "light") {
      body.classList.add("theme-light");
    } else {
      body.classList.remove("theme-light");
    }
  }, [theme]);

  return (
    <div className="app-root">
      <div className="app-layout">
        <div className="panel app-map">
          <div className="h-full">
            <MapPanel />
          </div>
        </div>
        <div className="panel app-sidebar overflow-auto">
          <div className="h-full flex flex-col gap-3 p-3">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
