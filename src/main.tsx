import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Initialize logger to capture all console logs
import "@/lib/logger";

createRoot(document.getElementById("root")!).render(<App />);
