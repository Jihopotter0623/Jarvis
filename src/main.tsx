import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Catch and suppress benign, expected development-sandbox WebSocket HMR connection errors
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const msg = event.reason?.message || String(event.reason);
    if (msg.toLowerCase().includes("websocket") || msg.toLowerCase().includes("vite") || msg.toLowerCase().includes("hmr")) {
      event.preventDefault();
      event.stopPropagation();
      console.warn("[Sandbox HMR Guard] Suppressed expected dev sandbox WebSocket connection message:", msg);
    }
  });

  window.addEventListener("error", (event) => {
    const msg = event.message || "";
    if (msg.toLowerCase().includes("websocket") || msg.toLowerCase().includes("vite") || msg.toLowerCase().includes("hmr")) {
      event.preventDefault();
      event.stopPropagation();
      console.warn("[Sandbox HMR Guard] Suppressed expected dev sandbox WebSocket error:", msg);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

