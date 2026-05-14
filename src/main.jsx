/* eslint-disable react-refresh/only-export-components */
import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider, useSession, useUser } from "@clerk/clerk-react";
import App from "./App.jsx";
import { setSupabaseAccessTokenProvider } from "./components/lib/supabaseClient";
import { FeedbackProvider } from "./components/ui/FeedbackProvider";
import "./styles.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const SUPABASE_JWT_TEMPLATE =
  import.meta.env.VITE_CLERK_SUPABASE_JWT_TEMPLATE || "";

if (!PUBLISHABLE_KEY) {
  console.warn(
    "Falta VITE_CLERK_PUBLISHABLE_KEY en tu .env. La app correra en modo invitado."
  );
}

function ClerkBackedApp() {
  const clerkUser = useUser();
  const { session } = useSession();

  setSupabaseAccessTokenProvider(() => {
    if (!session) return null;
    if (SUPABASE_JWT_TEMPLATE) {
      return session.getToken({ template: SUPABASE_JWT_TEMPLATE });
    }
    return session.getToken();
  });

  React.useEffect(() => {
    return () => {
      setSupabaseAccessTokenProvider(null);
    };
  }, []);

  return (
    <App
      auth={{
        ...clerkUser,
        hasClerk: true,
        supabaseReady: !clerkUser.isSignedIn || Boolean(session),
      }}
    />
  );
}

const offlineAuth = {
  isLoaded: true,
  isSignedIn: false,
  user: null,
  hasClerk: false,
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <FeedbackProvider>
      {PUBLISHABLE_KEY ? (
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
          <ClerkBackedApp />
        </ClerkProvider>
      ) : (
        <App auth={offlineAuth} />
      )}
    </FeedbackProvider>
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[PWA] No se pudo registrar el service worker", error);
    });
  });
}
