import { type ReactNode } from "react";
import type {
  EntityId,
  World,
  FutureTransitionHandlerRegistry,
} from "../../simulation";
import { currentOpeningLifeScene } from "../../presentation/life-scene-flow";
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
  readonly pendingOpen?: boolean;
  readonly onClosePending?: () => void;
}

/**
 * Quiet Begin: the room is the surface. Resting play has no idle activity
 * list and does not auto-open the next scene. An active authored scene still
 * shows its transient choices. Household notes, favors, and pending
 * situations live on Personal, on demand.
 */
export function OpeningLifeFlow(props: OpeningLifeFlowProps) {
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
  const scene = currentOpeningLifeScene(props.world, props.playerPersonId);
  if (!scene) return null;
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
