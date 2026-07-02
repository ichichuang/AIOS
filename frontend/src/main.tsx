import React from "react";
import ReactDOM from "react-dom/client";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Theme appearance="light" accentColor="indigo" grayColor="slate" panelBackground="translucent" radius="medium" scaling="95%">
      <App />
    </Theme>
  </React.StrictMode>
);
