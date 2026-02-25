import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Landing } from "./components/pages/Landing";
import { Home } from "./components/pages/Home";
import { Dashboard } from "./components/pages/Dashboard";
import { Analytics } from "./components/pages/Analytics";
import { Species } from "./components/pages/Species";
import { Reports } from "./components/pages/Reports";
import { Settings } from "./components/pages/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Landing,
  },
  {
    path: "/app",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "dashboard", Component: Dashboard },
      { path: "analytics", Component: Analytics },
      { path: "species", Component: Species },
      { path: "reports", Component: Reports },
      { path: "settings", Component: Settings },
    ],
  },
]);
