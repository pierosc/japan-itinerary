import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import {
  fetchProfilesByIds,
  searchProfiles,
  updateTripSharing,
} from "./services/userService";

export default function UsersPanel({ trip, currentUser, onUpdateTripMeta }) {
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
  const currentUserProfile = useMemo(
    () =>
      user?.id
        ? {
            user_id: user.id,
            email: user.primaryEmailAddress?.emailAddress || "",
            full_name: user.fullName || user.username || "",
            avatar_url: user.imageUrl || "",
          }
        : null,
    [user]
  );

  const ownerLabel =
    ownerProfile?.full_name ||
    ownerProfile?.email ||
    (ownerUserId
      ? ownerUserId === user?.id
        ? currentUserProfile?.full_name || currentUserProfile?.email || "Tu"
        : ownerUserId
      : "Invitado / sin dueno online");

  useEffect(() => {
    const ids = (trip?.sharedWithUserIds || []).filter(
      (id) => id && id !== ownerUserId
    );
    setSharedUserIds(ids);
  }, [ownerUserId, trip?.sharedWithUserIds]);

  useEffect(() => {
    if (!canUseSupabase || !ownerUserId) {
      setOwnerProfile(null);
      return;
    }

    let cancelled = false;

    (async () => {
      if (ownerUserId === user?.id && currentUserProfile) {
        setOwnerProfile(currentUserProfile);
        return;
      }

      const result = await fetchProfilesByIds([ownerUserId]);
      if (cancelled) return;
      setOwnerProfile(result.ok ? result.profiles?.[0] || null : null);
    })();

    return () => {
      cancelled = true;
    };
  }, [canUseSupabase, currentUserProfile, ownerUserId, user?.id]);

  useEffect(() => {
    if (!canUseSupabase) return;
    if (!sharedUserIds.length) {
      setSharedProfiles([]);
      return;
    }

    let cancelled = false;

    (async () => {
      const result = await fetchProfilesByIds(sharedUserIds);
      if (cancelled) return;
      setSharedProfiles(result.ok ? result.profiles || [] : []);
    })();

    return () => {
      cancelled = true;
    };
  }, [canUseSupabase, sharedUserIds]);

  useEffect(() => {
    if (!canUseSupabase || !isOwner) {
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
      const result = await searchProfiles(term);
      if (cancelled) return;

      const filtered = result.ok
        ? (result.profiles || []).filter(
            (profile) =>
              profile.user_id !== user.id &&
              !sharedUserIds.includes(profile.user_id)
          )
        : [];
      setResults(filtered);
    })();

    return () => {
      cancelled = true;
    };
  }, [canUseSupabase, isOwner, q, sharedUserIds, user?.id]);

  const updateShared = async (nextIds) => {
    if (!canUseSupabase) return;
    if (!isOwner) {
      setError("Solo el dueno del viaje puede cambiar usuarios.");
      return;
    }

    const sanitizedIds = [...new Set(nextIds)].filter(
      (id) => id && id !== ownerUserId
    );

    setLoading(true);
    setError(null);

    const result = await updateTripSharing(tripId, sanitizedIds);

    if (result.ok) {
      setSharedUserIds(sanitizedIds);
      onUpdateTripMeta?.({ sharedWithUserIds: sanitizedIds });
      setQ("");
      setResults([]);
    } else {
      setError(result.error?.message || "Error actualizando el sharing.");
    }

    setLoading(false);
  };

  const handleAddUser = async (profile) => {
    if (!isOwner || profile.user_id === ownerUserId) return;
    await updateShared([...sharedUserIds, profile.user_id]);
  };

  const handleRemoveUser = async (userIdToRemove) => {
    if (!isOwner || userIdToRemove === ownerUserId) return;
    await updateShared(sharedUserIds.filter((id) => id !== userIdToRemove));
  };

  const sharedList = useMemo(() => {
    const map = new Map(sharedProfiles.map((profile) => [profile.user_id, profile]));
    return sharedUserIds
      .map((id) => map.get(id) || { user_id: id, email: id, full_name: "" })
      .filter((profile) => profile.user_id !== ownerUserId);
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
    <div className="list-panel" data-tour="users-panel">
      <h2 className="font-semibold mb-2">Users</h2>

      <div className="item">
        <div className="text-xs">Dueno del viaje</div>
        <div className="font-medium">{ownerLabel}</div>
        <div className="text-xs">
          {isOwner
            ? "Tu puedes agregar o quitar usuarios."
            : "Solo el dueno puede quitar usuarios o cambiar el sharing."}
        </div>
      </div>

      <div data-tour="users-sharing">
        {!supabase ? (
          <div className="text-xs text-gray-600">Supabase no esta configurado.</div>
        ) : !user?.id ? (
          <div className="text-xs text-gray-600">
            Inicia sesion para compartir viajes.
          </div>
        ) : (
          <>
            <div className="text-xs text-gray-600 mb-2">
              Busca usuarios registrados y compartelos para que puedan editar el
              mismo viaje.
            </div>

          {!isOwner && ownerUserId && (
            <div className="text-xs text-gray-600 mb-2">
              Este viaje pertenece a otro usuario. Puedes editar el itinerario
              compartido, pero solo el dueno puede cambiar usuarios.
            </div>
          )}

          <input
            className="input mb-2"
            placeholder="Buscar por email o nombre..."
            value={q}
            onChange={(event) => setQ(event.target.value)}
            disabled={!isOwner}
          />

          {results.length > 0 && (
            <div className="card" style={{ padding: 10, marginBottom: 10 }}>
              <div className="text-xs mb-2">Resultados</div>
              <ul className="list scroll-list" style={{ maxHeight: 180 }}>
                {results.map((profile) => (
                  <li
                    key={profile.user_id}
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
                          {profile.full_name || profile.email || profile.user_id}
                        </div>
                        <div className="text-xs">{profile.email}</div>
                      </div>
                      <button
                        className="btn-outline text-xs"
                        onClick={() => handleAddUser(profile)}
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
              <div className="text-xs">Cargando...</div>
            ) : sharedList.length === 0 ? (
              <div className="text-xs text-gray-600">
                Aun no has compartido este viaje con nadie.
              </div>
            ) : (
              <ul className="list scroll-list">
                {sharedList.map((profile) => (
                  <li key={profile.user_id} className="item">
                    <div className="flex justify-between items-center gap-2">
                      <div style={{ minWidth: 0 }}>
                        <div className="font-medium">
                          {profile.full_name || profile.email || profile.user_id}
                        </div>
                        {profile.email && (
                          <div className="text-xs">{profile.email}</div>
                        )}
                      </div>
                      {isOwner && (
                        <button
                          className="btn-outline text-xs"
                          onClick={() => handleRemoveUser(profile.user_id)}
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
    </div>
  );
}
