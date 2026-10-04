import { useState } from "react";
import { createRoot } from "react-dom/client";
import { smallWorld } from "../../fixtures/small-world";
import {
  recordWorldEvent,
  serializeWorld,
  type World,
} from "../../../src/simulation";
import {
  ObserverClock,
  ObserverInspectorWorkspace,
} from "../../../src/player/ObserverWorkspace";
import { ObserverRunController } from "../../../src/player/observer-run-controller";
import { WorkspaceFrame } from "../../../src/player/ShellWorkspaces";
import "../../../src/player/shell.css";

// Generated residents and canonical history; this is an isolated access fixture,
// not a replacement for PlayerGame's Observer-mode admission/return proof.
const initial = smallWorld({
  place: "2537385",
  seed: "observer-access-generated",
  people: 4,
}).world;
const paused = recordWorldEvent(initial, {
  stableKey: "test:observer-access:checkpoint",
  type: "test.observer-checkpoint",
  occurredAt: initial.currentDate,
  recordedAt: initial.currentDate,
  jurisdictionId: null,
  involvedEntityIds: [],
  participants: [],
  personFactConstraints: [],
  visibility: "public",
  tags: [],
  summary: "The isolated Observer checkpoint was recorded.",
  context: {
    location: null,
    socialContext: null,
    pressure: null,
    choice: null,
    motivation: null,
    immediateReaction: null,
  },
});
let releasePause: () => void = () => {};
class DeferredPauseController extends ObserverRunController {
  override async pause(): Promise<World> {
    await new Promise<void>((resolve) => {
      releasePause = resolve;
    });
    this.syncWorld(paused);
    return super.pause();
  }
}
const runner = new DeferredPauseController(initial);
const before = serializeWorld(paused);
let forwardedExactWorld = false;
Object.assign(window, {
  observerAccessProof: {
    releasePause: () => releasePause(),
    unchanged: () => serializeWorld(paused) === before,
    forwardedExactWorld: () => forwardedExactWorld,
    identity: {
      seed: paused.seed,
      worldId: paused.id,
      date: paused.currentDate,
      frontier: paused.history.nextSequence,
    },
  },
});
function Harness() {
  const [reviewWorld, setReviewWorld] = useState<World | null>(null);
  const offerInspector = !new URLSearchParams(location.search).has(
    "withoutInspector",
  );
  return (
    <>
      <ObserverClock
        runner={runner}
        onOpenRecord={() => {}}
        {...(offerInspector
          ? {
              onOpenInspector: (world: World) => {
                forwardedExactWorld = world === paused;
                setReviewWorld(world);
              },
            }
          : {})}
      />
      {reviewWorld ? (
        <WorkspaceFrame
          title="Developer inspector"
          testid="observer-inspector-workspace"
          canGoBack
          onBack={() => setReviewWorld(null)}
          onClose={() => setReviewWorld(null)}
        >
          <ObserverInspectorWorkspace world={reviewWorld} />
        </WorkspaceFrame>
      ) : null}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
