// src/components/UsersPanel.jsx
import { useEffect, useState } from "react";
import { supabase } from "../components/lib/supabaseClient"; // Asegúrate de tener la configuración de supabase
import { useUser } from "@clerk/clerk-react";

/**
 * Este componente maneja los correos electrónicos con los que se comparte un viaje.
 * Muestra la lista de correos compartidos, permite añadir nuevos y eliminar los existentes.
 *
 * Props:
 * - tripId: ID del viaje a modificar.
 */
export default function UsersPanel({ tripId }) {
  const { user } = useUser(); // Obtener el usuario autenticado
  const [sharedEmails, setSharedEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tripId) return;

    const fetchSharedEmails = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("trip_data")
          .select("shared_with_emails")
          .eq("trip_id", tripId)
          .single();

        if (error) throw error;

        setSharedEmails(data?.shared_with_emails || []);
      } catch (error) {
        setError("Error al cargar los correos compartidos.");
      } finally {
        setLoading(false);
      }
    };

    fetchSharedEmails();
  }, [tripId]);

  const handleAddEmail = async () => {
    if (!newEmail.includes("@")) {
      setError("Introduce un correo válido.");
      return;
    }
    const updatedEmails = [...sharedEmails, newEmail];
    await updateSharedEmails(updatedEmails);
  };

  const handleRemoveEmail = async (email) => {
    const updatedEmails = sharedEmails.filter((e) => e !== email);
    await updateSharedEmails(updatedEmails);
  };

  const updateSharedEmails = async (updatedEmails) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("trip_data")
        .update({ shared_with_emails: updatedEmails })
        .eq("trip_id", tripId);

      if (error) throw error;

      setSharedEmails(updatedEmails);
    } catch (error) {
      setError("Error al actualizar los correos compartidos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="font-semibold mb-2">Usuarios del viaje</h2>
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="input mb-2"
          />
          <button
            onClick={handleAddEmail}
            disabled={loading}
            className="btn mb-4"
          >
            Añadir
          </button>

          {error && <p className="text-red-500">{error}</p>}

          <ul>
            {sharedEmails.map((email, idx) => (
              <li key={idx} className="flex justify-between items-center mb-2">
                <span>{email}</span>
                <button
                  onClick={() => handleRemoveEmail(email)}
                  disabled={loading}
                  className="text-red-500"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
