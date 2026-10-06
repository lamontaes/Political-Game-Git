import { createRoot } from "react-dom/client";

import "../../src/player/player.css";
import { deserializeWorld } from "../../src/simulation/serialization";
import { LifeContinuationPanel } from "../../src/player/LifeContinuationPanel";
import { projectLifeContinuation } from "../../src/presentation/people-continuation";
import type { EntityId } from "../../src/simulation";

interface LookBackProofCase {
  readonly serializedWorld: string;
  readonly personId: EntityId;
}

declare global {
  interface Window {
    __B19_LOOKBACK_CASE__?: LookBackProofCase;
    __showB19LookBackCase__?: (proofCase: LookBackProofCase) => void;
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("B19 proof root was not supplied.");

function render(proofCase: LookBackProofCase): void {
  const world = deserializeWorld(proofCase.serializedWorld);
  const view = projectLifeContinuation(world, proofCase.personId);
  if (!view) throw new Error("The saved World has no ended played life.");

  reactRoot.render(
    <LifeContinuationPanel
      key={view.ended}
      world={world}
      view={view}
      observing={false}
      onCommit={() => undefined}
      onViewRecord={() => undefined}
    />,
  );
}

const reactRoot = createRoot(root);
window.__showB19LookBackCase__ = render;
if (window.__B19_LOOKBACK_CASE__) render(window.__B19_LOOKBACK_CASE__);
