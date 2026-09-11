import ReactDOM from "react-dom/client";
import "leaflet/dist/leaflet.css";

import App from "./App";
import { AppProvider } from "./context/AppContext";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <AppProvider>
    <App />
  </AppProvider>
);
