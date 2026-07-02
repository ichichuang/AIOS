import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { AiosThemeProvider } from "./theme/AiosThemeProvider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AiosThemeProvider>
      <App />
    </AiosThemeProvider>
  </React.StrictMode>
);
