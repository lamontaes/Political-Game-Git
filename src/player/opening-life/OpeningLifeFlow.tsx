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

  if (props.foreground) return <>{props.foreground}</>;
  if (props.pendingOpen && props.pendingLife) {
    return (
      <div
        className="pg-opening-pending"
        data-testid="pending-life-surface"
        /*
          Escape closes the top layer, and while the moment is open that is
          the moment. Handled here rather than on the document so Escape
          anywhere else in the game is somebody else's.
        */
        onKeyDown={(event) => {
          if (event.key !== "Escape" || !props.onClosePending) return;
          event.stopPropagation();
          props.onClosePending();
        }}
      >
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
  /*
   * The moment is opened from the room, not standing on it.
   *
   * A panel docked permanently over a full room covers whoever is standing
   * where it lands — measured at 1440x900 and 1024x768, there is no viewport
   * where it leaves every person reachable, and the people are how a life is
   * played. So the room offers the moment and the player opens it. An active
   * authored scene is untouched: it still shows its own choices below, so
   * nothing a player must decide waits behind this control.
   */
  const opener =
    props.pendingAvailable && props.onOpenPending ? (
      <button
        type="button"
        className="pg-moment-opener"
        data-testid="open-moment"
        onClick={props.onOpenPending}
      >
        The moment
        <small>What is happening here, and what you can do</small>
      </button>
    ) : null;
  if (!scene) return opener;
  return (
    <>
      {opener}
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
        variant="room"
      />
    </>
  );
}
