import { LegislationDevRoute } from "./player/LegislationWorkspace";
import { PlayerGame } from "./player/PlayerGame";
import { PlayerOffice } from "./player/PlayerOffice";
import { CharacterProofView } from "./ui/CharacterProofView";
import { DeveloperViewer } from "./ui/DeveloperViewer";
import { SceneAuthoringProofView } from "./ui/SceneAuthoringProofView";
import { ScenePresentationProofView } from "./ui/ScenePresentationProofView";

/**
 * Normal play is the game. Everything else here is a development route kept
 * deliberately reachable: the Run-D office fixture, the character proof, the
 * scene presentation and scene authoring proofs, the legislation workspace on
 * its own, and the world inspector. None of them is what someone gets by
 * opening the game.
 */
export function App() {
  const view = new URLSearchParams(window.location.search).get("view");
  if (view === "developer") return <DeveloperViewer />;
  if (view === "character-proof") return <CharacterProofView />;
  if (view === "scene-proof") return <ScenePresentationProofView />;
  if (view === "scene-authoring") return <SceneAuthoringProofView />;
  if (view === "legislation") return <LegislationDevRoute />;
  if (view === "office-fixture") return <PlayerOffice />;
  return <PlayerGame />;
}
