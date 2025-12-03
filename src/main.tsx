import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Temporarily disable logger - it may be crashing the app
// import "@/lib/logger";

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  createRoot(rootElement).render(<App />);
} catch (error) {
  console.error("Failed to render app:", error);
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial;">
        <h1>Error loading application</h1>
        <p>Please refresh the page or contact support.</p>
        <p style="color: red; font-size: 12px;">${error instanceof Error ? error.message : String(error)}</p>
      </div>
    `;
  }
}
