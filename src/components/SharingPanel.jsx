// src/components/SharingPanel.jsx
import { useState } from "react";

export default function SharingPanel({ trip }) {
  const [query, setQuery] = useState("");
  const [invited, setInvited] = useState([]);

  const handleInvite = () => {
    const text = query.trim();
    if (!text) return;
    setInvited((prev) => [
      ...prev,
      { id: Date.now(), label: text, role: "editor" },
    ]);
    setQuery("");
  };

  return (
    <div className="card">
      <h2>Usuarios / Compartir viaje</h2>

      {!trip && (
        <p className="text-xs text-gray-600 mt-1">
          Primero selecciona o crea un viaje para poder compartirlo.
        </p>
      )}

      {trip && (
        <>
          <p className="text-xs text-gray-600 mt-1">
            Aquí podrás buscar otros usuarios de la plataforma para compartir
            este viaje. (Por ahora es sólo interfaz, la integración real con el
            backend la dejamos para después).
          </p>

          <div className="mt-2 flex gap-2">
            <input
              className="input"
              placeholder="Correo o nombre de usuario"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
            <button className="btn text-xs" onClick={handleInvite}>
              Invitar
            </button>
          </div>

          {invited.length > 0 && (
            <div className="mt-2">
              <h3 className="text-xs mb-1">Personas invitadas (mock):</h3>
              <ul className="list">
                {invited.map((u) => (
                  <li key={u.id} className="item">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{u.label}</div>
                        <div className="text-xs text-gray-600">
                          Rol: {u.role}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
