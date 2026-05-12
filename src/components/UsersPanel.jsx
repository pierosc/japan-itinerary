// src/components/UsersPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";

export default function UsersPanel({ trip, currentUser }) {
  const tripId = trip?.id;
  const user = currentUser;
  const ownerUserId = trip?.ownerUserId || null;
  const isOwner = Boolean(user?.id && ownerUserId && user.id === ownerUserId);

  const [sharedUserIds, setSharedUserIds] = useState([]);
  const [sharedProfiles, setSharedProfiles] = useState([]);
  const [ownerProfile, setOwnerProfile] = useState(null);

  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const canUseSupabase = !!supabase && !!user?.id && !!tripId;
  const ownerLabel =
    ownerProfile?.full_name ||
    ownerProfile?.email ||
    (ownerUserId
      ? ownerUserId === user?.id
        ? "Tú"
        : ownerUserId
      : "Invitado / sin dueño online");

  // Cargar shared_with_user_ids del viaje
  useEffect(() => {
    if (!canUseSupabase) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data, error } = await supabase
          .from("trip_data")
          .select("shared_with_user_ids")
          .eq("trip_id", tripId)
          .maybeSingle();

        if (error) throw error;

        const ids = (data?.shared_with_user_ids || []).filter(
          (id) => id && id !== ownerUserId
        );
        if (!cancelled) setSharedUserIds(ids);
      } catch {
        if (!cancelled) setError("No se pudo cargar usuarios compartidos.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canUseSupabase, ownerUserId, tripId, user?.id]);

  useEffect(() => {
    if (!supabase || !ownerUserId) {
      setOwnerProfile(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, email, full_name, avatar_url")
          .eq("user_id", ownerUserId)
          .maybeSingle();

        if (error) throw error;
        if (!cancelled) setOwnerProfile(data || null);
      } catch {
        if (!cancelled) setOwnerProfile(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ownerUserId]);

  // Resolver perfiles para mostrar nombres/emails
  useEffect(() => {
    if (!canUseSupabase) return;
    if (!sharedUserIds.length) {
      setSharedProfiles([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, email, full_name, avatar_url")
          .in("user_id", sharedUserIds);

        if (error) throw error;
        if (!cancelled) setSharedProfiles(data || []);
      } catch {
        if (!cancelled) setSharedProfiles([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canUseSupabase, sharedUserIds, tripId]);

  // Buscar en profiles (email / nombre)
  useEffect(() => {
    if (!canUseSupabase) return;
    if (!isOwner) {
      setResults([]);
      return;
    }
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // búsqueda simple: email ilike OR full_name ilike
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, email, full_name, avatar_url")
          .or(`email.ilike.%${term}%,full_name.ilike.%${term}%`)
          .limit(8);

        if (error) throw error;

        // no te muestres a ti misma y no repitas ya compartidos
        const filtered = (data || []).filter(
          (p) => p.user_id !== user.id && !sharedUserIds.includes(p.user_id)
        );

        if (!cancelled) setResults(filtered);
      } catch {
        if (!cancelled) setResults([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canUseSupabase, isOwner, q, user?.id, sharedUserIds]);

  const updateShared = async (nextIds) => {
    if (!canUseSupabase) return;
    if (!isOwner) {
      setError("Solo el dueño del viaje puede cambiar usuarios.");
      return;
    }
    const sanitizedIds = [...new Set(nextIds)].filter(
      (id) => id && id !== ownerUserId
    );
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("trip_data")
        .update({ shared_with_user_ids: sanitizedIds })
        .eq("trip_id", tripId)
        .eq("user_id", ownerUserId);

      if (error) throw error;
      setSharedUserIds(sanitizedIds);
      setQ("");
      setResults([]);
    } catch {
      setError("Error actualizando el sharing.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (profile) => {
    if (!isOwner || profile.user_id === ownerUserId) return;
    const next = [...sharedUserIds, profile.user_id];
    await updateShared(next);
  };

  const handleRemoveUser = async (userIdToRemove) => {
    if (!isOwner || userIdToRemove === ownerUserId) return;
    const next = sharedUserIds.filter((id) => id !== userIdToRemove);
    await updateShared(next);
  };

  const sharedList = useMemo(() => {
    // asegura orden estable según sharedUserIds
    const map = new Map(sharedProfiles.map((p) => [p.user_id, p]));
    return sharedUserIds
      .map((id) => map.get(id) || { user_id: id, email: id, full_name: "" })
      .filter((p) => p.user_id !== ownerUserId)
      .filter(Boolean);
  }, [ownerUserId, sharedProfiles, sharedUserIds]);

  if (!tripId) {
    return (
      <div>
        <h2 className="font-semibold mb-2">Users</h2>
        <div className="text-xs text-gray-600">No hay viaje activo.</div>
      </div>
    );
  }

  return (
    <div className="list-panel">
      <h2 className="font-semibold mb-2">Users</h2>

      <div className="item">
        <div className="text-xs">Dueño del viaje</div>
        <div className="font-medium">{ownerLabel}</div>
        <div className="text-xs">
          {isOwner
            ? "Tú puedes agregar o quitar usuarios."
            : "Solo el dueño puede quitar usuarios o cambiar el sharing."}
        </div>
      </div>

      {!supabase ? (
        <div className="text-xs text-gray-600">
          Supabase no está configurado.
        </div>
      ) : !user?.id ? (
        <div className="text-xs text-gray-600">
          Inicia sesión para compartir viajes.
        </div>
      ) : (
        <>
          <div className="text-xs text-gray-600 mb-2">
            Busca usuarios registrados (desde <code>profiles</code>) y
            compártelos para que puedan editar el mismo viaje.
          </div>

          {!isOwner && ownerUserId && (
            <div className="text-xs text-gray-600 mb-2">
              Este viaje pertenece a otro usuario. Puedes editar el itinerario
              compartido, pero solo el dueño puede cambiar usuarios.
            </div>
          )}

          <input
            className="input mb-2"
            placeholder="Buscar por email o nombre…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={!isOwner}
          />

          {results.length > 0 && (
            <div className="card" style={{ padding: 10, marginBottom: 10 }}>
              <div className="text-xs mb-2">Resultados</div>
              <ul className="list scroll-list" style={{ maxHeight: 180 }}>
                {results.map((p) => (
                  <li
                    key={p.user_id}
                    className="item"
                    style={{ cursor: "default" }}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div style={{ minWidth: 0 }}>
                        <div
                          className="font-medium"
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {p.full_name || p.email || p.user_id}
                        </div>
                        <div className="text-xs">{p.email}</div>
                      </div>
                      <button
                        className="btn-outline text-xs"
                        onClick={() => handleAddUser(p)}
                        disabled={loading || !isOwner}
                      >
                        Compartir
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card" style={{ padding: 10 }}>
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium">Compartido con</div>
              <div className="text-xs text-gray-600">
                {sharedList.length} usuarios
              </div>
            </div>

            {loading ? (
              <div className="text-xs">Cargando…</div>
            ) : sharedList.length === 0 ? (
              <div className="text-xs text-gray-600">
                Aún no has compartido este viaje con nadie.
              </div>
            ) : (
              <ul className="list scroll-list">
                {sharedList.map((p) => (
                  <li key={p.user_id} className="item">
                    <div className="flex justify-between items-center gap-2">
                      <div style={{ minWidth: 0 }}>
                        <div className="font-medium">
                          {p.full_name || p.email || p.user_id}
                        </div>
                        {p.email && <div className="text-xs">{p.email}</div>}
                      </div>
                      {isOwner && (
                        <button
                          className="btn-outline text-xs"
                          onClick={() => handleRemoveUser(p.user_id)}
                          disabled={loading}
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {error && (
              <div
                className="text-xs"
                style={{ color: "var(--danger)", marginTop: 8 }}
              >
                {error}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
