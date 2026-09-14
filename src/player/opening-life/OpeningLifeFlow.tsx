import { useEffect, type ReactNode } from "react";
import type {
  EntityId,
  World,
  FutureTransitionHandlerRegistry,
} from "../../simulation";
import {
  currentOpeningLifeScene,
  openNextLifeScene,
} from "../../presentation/life-scene-flow";
import { LifeScenePanel } from "./LifeScenePanel";

/** Typed root integration seam. The caller keeps its navigation, save store and scene. */
export interface OpeningLifeFlowProps {
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly onWorldChange: (world: World) => void;
  readonly foreground?: ReactNode;
  readonly onTalkTo: (personId: EntityId) => void;
  readonly returnFocusTo?: EntityId | null;
  readonly onFocusReturned?: () => void;
  readonly transitionHandlers?: FutureTransitionHandlerRegistry;
  /** Story/situation surface, opened on demand rather than as an idle card. */
  readonly pendingLife?: ReactNode;
  readonly pendingAvailable?: boolean;
  readonly pendingOpen?: boolean;
  readonly onOpenPending?: () => void;
  readonly onClosePending?: () => void;
}

/**
 * Quiet Begin: the room is the surface. Resting play has no idle activity
 * list. An active authored scene still shows its transient choices.
 * Household/world facts live on Personal, on demand.
 */
export function OpeningLifeFlow(props: OpeningLifeFlowProps) {
  const scene = currentOpeningLifeScene(props.world, props.playerPersonId);
  useEffect(() => {
    if (props.foreground) return;
    if (scene) return;
    try {
      const next = openNextLifeScene(props.world, props.playerPersonId);
      if (next !== props.world) props.onWorldChange(next);
    } catch {
      // Only the controlling player can open this scene.
    }
  }, [
    props.world,
    props.playerPersonId,
    props.foreground,
    scene,
    props.onWorldChange,
  ]);

  if (props.foreground) return <>{props.foreground}</>;
  if (props.pendingOpen && props.pendingLife) {
    return (
      <div className="pg-opening-pending" data-testid="pending-life-surface">
        {props.pendingLife}
        {props.onClosePending ? (
          <button
            type="button"
            className="ui-action"
            data-testid="pending-life-return"
            onClick={props.onClosePending}
          >
            Return to the room
          </button>
        ) : null}
      </div>
    );
  }
  if (!scene) {
    return (
      <section
        className="life-moment pg-opening-flow"
        data-testid="opening-life-scene"
      >
        <p className="game-note" data-testid="life-scene-quiet">
          Nothing here needs a choice right now.
        </p>
        {props.pendingAvailable && props.onOpenPending ? (
          <button
            type="button"
            className="ui-action"
            data-testid="pending-life-open"
            onClick={props.onOpenPending}
          >
            Open the pending decision
          </button>
        ) : null}
      </section>
    );
  }
  return (
    <LifeScenePanel
      world={props.world}
      playerPersonId={props.playerPersonId}
      onWorldChange={props.onWorldChange}
      onTalkTo={props.onTalkTo}
      returnFocusTo={props.returnFocusTo ?? null}
      {...(props.onFocusReturned
        ? { onFocusReturned: props.onFocusReturned }
        : {})}
      transitionHandlers={props.transitionHandlers}
    />
  );
}
