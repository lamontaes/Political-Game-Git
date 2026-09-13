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
  /** Keeps the root's room/presence projection aligned with this foreground. */
  readonly onContinuingChange?: (continuing: boolean) => void;
  /**
   * The conversation box, while the player is talking to somebody.
   *
   * One thing is in the foreground of the room at a time. When a conversation
   * is open it takes the panel's place, and this flow keeps its own state —
   * which beat of the introduction it is on, whether the player had stepped
   * into the continuing life — so Back returns to exactly where they were.
   */
  readonly foreground?: ReactNode;
  /** Opens the conversation box with exactly the person chosen in the scene. */
  readonly onTalkTo: (personId: EntityId) => void;
  /** Whose Talk-to control to focus when a conversation hands the room back. */
  readonly returnFocusTo?: EntityId | null;
  readonly onFocusReturned?: () => void;
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
  // A conversation the player started is the foreground, wherever they were.
  if (props.foreground) return <>{props.foreground}</>;
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
  /*
   * The continuing life and its way back, as one column.
   *
   * These were two siblings of the room's bottom-centre flex row, so the
   * "Return to your day" control rendered as a full-height slab beside the
   * story panel and overlapped the people standing in the room.
   */
  if (continuing)
    return (
      <div className="pg-opening-continuing">
        {props.continuingLife}
        <button
          type="button"
          className="ui-action"
          onClick={() => {
            props.onWorldChange(
              openNextLifeScene(props.world, props.playerPersonId),
            );
            setContinuing(false);
            props.onContinuingChange?.(false);
          }}
        >
          Return to your day
        </button>
      </div>
    );
  return (
    <LifeScenePanel
      world={props.world}
      playerPersonId={props.playerPersonId}
      onWorldChange={props.onWorldChange}
      onContinue={() => {
        setContinuing(true);
        props.onContinuingChange?.(true);
      }}
      onTalkTo={props.onTalkTo}
      returnFocusTo={props.returnFocusTo ?? null}
      {...(props.onFocusReturned
        ? { onFocusReturned: props.onFocusReturned }
        : {})}
      transitionHandlers={props.transitionHandlers}
    />
  );
}
