import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DeveloperReviewHub } from "./ui/DeveloperReviewHub";
import "./styles.css";
import "./player/player.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DeveloperReviewHub />
  </StrictMode>,
);
