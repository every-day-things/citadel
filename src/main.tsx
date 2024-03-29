import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import "@mantine/core/styles.css";
import '@mantine/core/styles.layer.css';
import 'mantine-datatable/styles.css';

// biome-ignore lint/style/noNonNullAssertion: If this fails, we'll notice.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
