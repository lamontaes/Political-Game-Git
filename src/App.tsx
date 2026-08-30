import { PlayerGame } from "./player/PlayerGame";
import { PlayerOffice } from "./player/PlayerOffice";
import { DeveloperViewer } from "./ui/DeveloperViewer";

export function App() {
  const view = new URLSearchParams(window.location.search).get("view");
  if (view === "developer") {
    return <DeveloperViewer />;
  }
  if (view === "office") {
    return <PlayerOffice />;
  }
  return <PlayerGame />;
}
