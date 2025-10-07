import React from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import "./index.css"   // <-- this is important

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)