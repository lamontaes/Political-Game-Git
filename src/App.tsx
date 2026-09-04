import { LegislationDevRoute } from "./player/LegislationWorkspace";
import { PlayerGame } from "./player/PlayerGame";
import { PlayerOffice } from "./player/PlayerOffice";
import { CharacterProofView } from "./ui/CharacterProofView";
import { ContentBrowserView } from "./ui/ContentBrowserView";
import { DeveloperViewer } from "./ui/DeveloperViewer";

/**
 * Normal play is the game. Everything else here is a development route kept
 * deliberately reachable: the Run-D office fixture, the character proof, the
 * legislation workspace on its own, the content browser, and the world
 * inspector. None of them is what someone gets by opening the game.
 */
export function App() {
  const view = new URLSearchParams(window.location.search).get("view");
  if (view === "developer") return <DeveloperViewer />;
  if (view === "character-proof") return <CharacterProofView />;
  if (view === "content") return <ContentBrowserView />;
  if (view === "legislation") return <LegislationDevRoute />;
  if (view === "office-fixture") return <PlayerOffice />;
  return <PlayerGame />;
}
