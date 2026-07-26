import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

const BASE = import.meta.env.VITE_BASE_PATH || "";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={BASE}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
