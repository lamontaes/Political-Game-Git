import { createRoot } from "react-dom/client";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../src/presentation/new-game";
import { evaluateTownCoupleActors } from "../../src/simulation/living-world/town-couple-actor-adapter";
import { canonicalJson } from "../../src/simulation";
import { projectDecisionTraceDetails } from "../../src/devtools/trace-adapters";
import { CausalTraceView } from "../../src/ui/CausalTraceView";

// Same canonical producer used by the changed unit file; test-only authored
// dating review, not a passive opening decision or a running Observer world.
const game = createNewGameWorld({
  ...DEFAULT_NEW_GAME_SETUP,
  seed: "saved-decision-inspector",
});
const world = evaluateTownCoupleActors(game.world, {
  stableKey: "inspector-fixture:canonical-couple-review",
  personIds: [game.world.personOrder[0]!, game.world.personOrder[1]!],
  stage: "dating",
  startedAt: null,
  retention: "durable",
}).world;
const proof = {
  seed: world.seed,
  initial: canonicalJson(world),
  snapshot: () => canonicalJson(world),
  expected: world.history.decisionTraces.map((record) => ({
    id: record.id,
    calculation: projectDecisionTraceDetails(record).currentCodeCalculation,
  })),
};
(
  window as unknown as { decisionInspectorReceiverProof: typeof proof }
).decisionInspectorReceiverProof = proof;
createRoot(document.getElementById("root")!).render(
  <CausalTraceView reviewWorld={world} />,
);
