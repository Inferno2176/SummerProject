import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import "./index.css";

import { router } from "./app/router";

const savedTheme =
  localStorage.getItem("theme") || "dark";

document.documentElement.setAttribute(
  "data-theme",
  savedTheme,
);

ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);