import { LegislationWorkspace } from "./player/LegislationWorkspace";
import { MeasureFloorView } from "./player/MeasureFloorView";
import { PlayerOffice } from "./player/PlayerOffice";
import { CharacterProofView } from "./ui/CharacterProofView";
import { DeveloperViewer } from "./ui/DeveloperViewer";

export function App() {
  const view = new URLSearchParams(window.location.search).get("view");
  if (view === "developer") return <DeveloperViewer />;
  if (view === "character-proof") return <CharacterProofView />;
  if (view === "legislation") return <LegislationWorkspace />;
  if (view === "floor") return <MeasureFloorView />;
  return <PlayerOffice />;
}
