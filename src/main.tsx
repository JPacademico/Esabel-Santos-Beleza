import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { missingConfig } from "./lib/supabase";
import { renderConfigErrorScreen } from "./lib/configErrorScreen";
import "./styles/globals.css";

if (missingConfig.length > 0) {
  // Built without VITE_SUPABASE_* — explain it instead of showing a blank page.
  console.error(
    `[config] Variáveis ausentes no build: ${missingConfig.join(", ")}. ` +
      "Defina-as no provedor de hospedagem e publique novamente.",
  );
  renderConfigErrorScreen(missingConfig);
} else {
  // autoUpdate: a new build activates on the next navigation without prompting.
  registerSW({ immediate: true });

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
