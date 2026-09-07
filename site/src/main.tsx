import React from "react";
import ReactDOM from "react-dom/client";
// HashRouter (not BrowserRouter): the site is a static SPA that must also run
// from opaque-origin / no-fallback hosts (embedded previews, file://, plain
// static buckets) where History-API path navigation throws. Hash routing only
// touches location.hash, which is valid everywhere.
import { HashRouter } from "react-router-dom";
import "../../design/generated/tokens.css";
import "./index.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
