import { LegislationDevRoute } from "./player/LegislationWorkspace";
import { PlayerGame } from "./player/PlayerGame";
import { PlayerOffice } from "./player/PlayerOffice";
import { CharacterProofView } from "./ui/CharacterProofView";
import { ContentBrowserView } from "./ui/ContentBrowserView";
import { DeveloperViewer } from "./ui/DeveloperViewer";
import { SceneAuthoringProofView } from "./ui/SceneAuthoringProofView";
import { ProductionOfficeProofView } from "./ui/ProductionOfficeProofView";
import { SceneGalleryView } from "./ui/SceneGalleryView";
import { ScenePresentationProofView } from "./ui/ScenePresentationProofView";

/**
 * Normal play is the game. Everything else here is a development route kept
 * deliberately reachable: the PRODUCTION office proof, the Run-D office
 * fixture, the character proof, the scene presentation and scene authoring
 * proofs, the legislation workspace on its own, the content browser, and the
 * world inspector. None of them is what someone gets by opening the game.
 *
 * `scene-gallery` is the room review: every registered room with its own
 * picture, what uses it, and what is missing. It is the surface that answers
 * "is this background wired" without anybody reading React or JSON.
 *
 * `production-office` and `office-fixture` are deliberately different routes.
 * The first draws the approved 5504x3072 master through the production scene;
 * the second draws the prompt30 development fixture and its two authored legacy
 * sitters, and is kept only as regression evidence.
 */
export function App() {
  const view = new URLSearchParams(window.location.search).get("view");
  if (view === "developer") return <DeveloperViewer />;
  if (view === "character-proof") return <CharacterProofView />;
  if (view === "content") return <ContentBrowserView />;
  if (view === "production-office") return <ProductionOfficeProofView />;
  if (view === "scene-gallery") return <SceneGalleryView />;
  if (view === "scene-proof") return <ScenePresentationProofView />;
  if (view === "scene-authoring") return <SceneAuthoringProofView />;
  if (view === "legislation") return <LegislationDevRoute />;
  if (view === "office-fixture") return <PlayerOffice />;
  return <PlayerGame />;
}
