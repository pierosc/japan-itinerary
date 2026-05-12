// src/main.jsx
/* eslint-disable react-refresh/only-export-components */
import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider, useUser } from "@clerk/clerk-react";
import App from "./App.jsx";
import "./styles.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  console.warn(
    "⚠️ Falta VITE_CLERK_PUBLISHABLE_KEY en tu .env. La app correra en modo invitado."
  );
}

function ClerkBackedApp() {
  const clerkUser = useUser();
  return <App auth={{ ...clerkUser, hasClerk: true }} />;
}

const offlineAuth = {
  isLoaded: true,
  isSignedIn: false,
  user: null,
  hasClerk: false,
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {PUBLISHABLE_KEY ? (
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <ClerkBackedApp />
      </ClerkProvider>
    ) : (
      <App auth={offlineAuth} />
    )}
  </React.StrictMode>
);
