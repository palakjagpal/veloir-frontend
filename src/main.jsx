import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
    <App />
  </BrowserRouter>,
);
