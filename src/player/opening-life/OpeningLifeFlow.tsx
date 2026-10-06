import { useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  EntityId,
  World,
  FutureTransitionHandlerRegistry,
} from "../../simulation";
import { currentOpeningLifeScene } from "../../presentation/life-scene-flow";
import { LifeScenePanel } from "./LifeScenePanel";
import { nextPlayedSceneSpeaker } from "../../presentation/scene-conversation";
import { recordedRoomPresence } from "../../presentation/recorded-room-presence";
import { SceneConversation } from "../SceneConversation";

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
  const [dismissedPresence, setDismissedPresence] = useState<EntityId | null>(
    null,
  );
  const [activeExchange, setActiveExchange] = useState<{
    presenceId: EntityId;
    speakerId: EntityId;
  } | null>(null);
  const speaker = useMemo(
    () => nextPlayedSceneSpeaker(props.world, props.playerPersonId),
    [props.world, props.playerPersonId],
  );
  const presence = recordedRoomPresence(props.world, props.playerPersonId);
  const presenceId = presence?.eventId ?? null;
  useEffect(() => {
    if (speaker && presenceId && presenceId !== dismissedPresence)
      setActiveExchange((previous) =>
        previous?.presenceId === presenceId && previous.speakerId === speaker
          ? previous
          : { presenceId, speakerId: speaker },
      );
  }, [speaker, presenceId, dismissedPresence]);
  const currentSpeaker =
    activeExchange?.presenceId === presenceId &&
    presence?.personIds.includes(activeExchange.speakerId)
      ? activeExchange.speakerId
      : speaker;
  const scene = currentOpeningLifeScene(props.world, props.playerPersonId);

  if (props.foreground) return <>{props.foreground}</>;
  if (currentSpeaker && presence && dismissedPresence !== presence.eventId)
    return (
      <SceneConversation
        world={props.world}
        playerPersonId={props.playerPersonId}
        subject="life-talk"
        addressee={currentSpeaker}
        onWorldChange={props.onWorldChange}
        onChange={(next) => {
          if (next.addressee !== "everyone") props.onTalkTo(next.addressee);
        }}
        onBack={() => setDismissedPresence(presence.eventId)}
        transitionHandlers={props.transitionHandlers}
        presentPersonIds={presence.personIds}
      />
    );
  // Compatibility consumes only an already recorded canonical opening beat.
  // NEW transitions are supplied by live records through the shared foreground.
  if (!scene) return null;
  if (props.pendingOpen && props.pendingAvailable && props.pendingLife) {
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
  return (
    <>
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
