/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from "react";

const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, message, tone = "info", duration = 3600 }) => {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      setToasts((current) => [
        ...current,
        { id, title, message, tone },
      ]);

      window.setTimeout(() => removeToast(id), duration);
      return id;
    },
    [removeToast]
  );

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        title: options.title || "Confirmar accion",
        message: options.message || "",
        confirmLabel: options.confirmLabel || "Confirmar",
        cancelLabel: options.cancelLabel || "Cancelar",
        tone: options.tone || "danger",
        resolve,
      });
    });
  }, []);

  const closeConfirm = useCallback(
    (value) => {
      if (confirmState?.resolve) confirmState.resolve(value);
      setConfirmState(null);
    },
    [confirmState]
  );

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div className="toast-region" aria-live="polite" aria-relevant="additions">
        {toasts.map((item) => (
          <div key={item.id} className={`toast toast--${item.tone}`}>
            <div className="toast-title">{item.title}</div>
            {item.message && <div className="toast-message">{item.message}</div>}
            <button
              className="toast-close"
              type="button"
              aria-label="Cerrar notificacion"
              onClick={() => removeToast(item.id)}
            >
              x
            </button>
          </div>
        ))}
      </div>

      {confirmState && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onClick={() => closeConfirm(false)}
        >
          <div
            className="dialog-card confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={confirmState.title}
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <h2 className="font-semibold">{confirmState.title}</h2>
              {confirmState.message && (
                <p className="text-xs confirm-message">{confirmState.message}</p>
              )}
            </div>
            <div className="dialog-actions">
              <button className="btn-outline" onClick={() => closeConfirm(false)}>
                {confirmState.cancelLabel}
              </button>
              <button
                className={`btn ${
                  confirmState.tone === "danger" ? "btn-danger" : ""
                }`}
                onClick={() => closeConfirm(true)}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error("useFeedback debe usarse dentro de FeedbackProvider");
  }
  return context;
}
