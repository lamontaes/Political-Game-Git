import { LegislationWorkspace } from "./player/LegislationWorkspace";
import { PlayerOffice } from "./player/PlayerOffice";
import { CharacterProofView } from "./ui/CharacterProofView";
import { SceneAuthoringProofView } from "./ui/SceneAuthoringProofView";
import { ScenePresentationProofView } from "./ui/ScenePresentationProofView";
import { DeveloperViewer } from "./ui/DeveloperViewer";

export function App() {
  const view = new URLSearchParams(window.location.search).get("view");
  if (view === "developer") return <DeveloperViewer />;
  if (view === "character-proof") return <CharacterProofView />;
  if (view === "scene-proof") return <ScenePresentationProofView />;
  if (view === "scene-authoring") return <SceneAuthoringProofView />;
  if (view === "legislation") return <LegislationWorkspace />;
  return <PlayerOffice />;
}
