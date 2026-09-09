import { useState, type ReactNode } from "react";
import type {
  EntityId,
  World,
  FutureTransitionHandlerRegistry,
} from "../../simulation";
import { openNextLifeScene } from "../../presentation/life-scene-flow";
import { OpeningLifePanel } from "./OpeningLifePanel";
import { LifeScenePanel } from "./LifeScenePanel";

/** Typed root integration seam. The caller keeps its navigation, save store and scene. */
export interface OpeningLifeFlowProps {
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly alreadyIntroduced: boolean;
  readonly onWorldChange: (world: World) => void;
  readonly continuingLife: ReactNode;
  readonly transitionHandlers?: FutureTransitionHandlerRegistry;
}

export function OpeningLifeFlow(props: OpeningLifeFlowProps) {
  const [phase, setPhase] = useState<"world" | "household" | "play">(
    props.alreadyIntroduced ? "play" : "world",
  );
  const [continuing, setContinuing] = useState(false);
  function enter() {
    const next = openNextLifeScene(props.world, props.playerPersonId);
    props.onWorldChange(next);
    setPhase("play");
  }
  if (phase !== "play")
    return (
      <OpeningLifePanel
        world={props.world}
        playerPersonId={props.playerPersonId}
        phase={phase}
        onBack={() => setPhase("world")}
        onNext={() => (phase === "world" ? setPhase("household") : enter())}
        onSkip={enter}
      />
    );
  if (continuing) return props.continuingLife;
  return (
    <div className="life-moment pg-opening-flow">
      <button
        type="button"
        className="ui-action"
        onClick={() => setContinuing(true)}
      >
        Continue your life
      </button>
      <LifeScenePanel
        world={props.world}
        playerPersonId={props.playerPersonId}
        onWorldChange={props.onWorldChange}
        onContinue={() => setContinuing(true)}
        transitionHandlers={props.transitionHandlers}
      />
    </div>
  );
}
