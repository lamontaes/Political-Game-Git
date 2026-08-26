import { PlayerOffice } from "./player/PlayerOffice";
import { DeveloperViewer } from "./ui/DeveloperViewer";

export function App() {
  const developerView =
    new URLSearchParams(window.location.search).get("view") === "developer";
  return developerView ? <DeveloperViewer /> : <PlayerOffice />;
}
