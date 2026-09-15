import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ArtDeskView } from "./ui/ArtDeskView";
import "./styles.css";
import "./player/player.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ArtDeskView />
  </StrictMode>,
);
