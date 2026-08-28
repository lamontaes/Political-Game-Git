import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

import { RUN_A_CIVIC_CONCEPT_ID } from "../presentation/run-a-learning";
import type { QuickDossierProjection } from "../presentation/run-a-projection";
import type {
  RunAPersonPinId,
  RunAUiAction,
  RunAUiState,
} from "../presentation/run-a-state";
import type { ConversationAddressee } from "../presentation/run-b-conversation";
import type {
  RunBFixture,
  RunBScenePersonContext,
} from "../presentation/run-b-fixture";
import {
  composeOfficeVisuals,
  OFFICE_VISUAL_SCENE,
  PRODUCTION_VISUAL_LIBRARY,
  type ComposedCharacterVisual,
} from "../presentation/visual-integration";
import {
  resolveSceneTransform,
  type SceneTransform,
} from "../presentation/scene-transform";
import type { EntityId } from "../simulation";
import { QuickDossier } from "./QuickDossier";

function useOfficeSceneTransform(
  viewportRef: RefObject<HTMLElement | null>,
): SceneTransform {
  const [transform, setTransform] = useState(() =>
    resolveSceneTransform(
      OFFICE_VISUAL_SCENE.plate,
      OFFICE_VISUAL_SCENE.plate,
      OFFICE_VISUAL_SCENE.camera,
    ),
  );

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const update = () => {
      const bounds = viewport.getBoundingClientRect();
      const next = resolveSceneTransform(
        { width: bounds.width, height: bounds.height },
        OFFICE_VISUAL_SCENE.plate,
        OFFICE_VISUAL_SCENE.camera,
        window.devicePixelRatio,
      );
      setTransform((current) =>
        current.viewport.width === next.viewport.width &&
        current.viewport.height === next.viewport.height &&
        current.devicePixelRatio === next.devicePixelRatio
          ? current
          : next,
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [viewportRef]);

  return transform;
}

interface PersonActionMenuProps {
  readonly name: string;
  readonly anchorId: RunBScenePersonContext["anchorId"];
  readonly personId: EntityId;
  readonly pinId: RunAPersonPinId;
  readonly dispatch: (action: RunAUiAction) => void;
  readonly onTalk: () => void;
}

function PersonActionMenu({
  name,
  anchorId,
  personId,
  pinId,
  dispatch,
  onTalk,
}: PersonActionMenuProps) {
  const inspectRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    inspectRef.current?.focus();
  }, []);

  return (
    <div
      className="person-action-menu civic-glass"
      role="menu"
      aria-label={`Actions for ${name}`}
      data-testid="person-action-menu"
      data-anchor-id={anchorId}
    >
      <p>{name}</p>
      <button
        ref={inspectRef}
        type="button"
        role="menuitem"
        onClick={() => dispatch({ type: "inspect-person" })}
      >
        <span>Inspect</span>
        <small>Review your notes and impressions</small>
      </button>
      <button type="button" role="menuitem" onClick={onTalk}>
        <span>Talk</span>
        <small>Start an in-room conversation</small>
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          dispatch({ type: "pin-person", personId, pinId });
          dispatch({ type: "dismiss-overlay" });
        }}
      >
        <span>Pin person</span>
        <small>Keep nearby context</small>
      </button>
    </div>
  );
}

interface ScenePersonProps {
  readonly person: RunBScenePersonContext;
  readonly dossier: QuickDossierProjection;
  readonly state: RunAUiState;
  readonly conversationAddressee: ConversationAddressee | null;
  readonly visual: ComposedCharacterVisual;
  readonly onSelect: (personId: EntityId) => void;
}

function ScenePerson({
  person,
  dossier,
  state,
  conversationAddressee,
  visual,
  onSelect,
}: ScenePersonProps) {
  const selected =
    state.overlay === "person-actions" &&
    state.selectedPersonId === person.personId;
  const addressed =
    conversationAddressee === "everyone" ||
    conversationAddressee === person.personId;
  const labelSuppressed =
    conversationAddressee !== null ||
    (state.selectedPersonId === person.personId &&
      (state.overlay === "person-actions" || state.overlay === "dossier"));

  return (
    <button
      type="button"
      className={`scene-person scene-person--${person.visualVariant}`}
      style={
        {
          left: `${visual.hitbox.leftPercent}%`,
          top: `${visual.hitbox.topPercent}%`,
          width: `${visual.hitbox.widthPercent}%`,
          height: `${visual.hitbox.heightPercent}%`,
        } satisfies CSSProperties
      }
      aria-label={`${dossier.name}, ${dossier.title}`}
      aria-haspopup="menu"
      aria-expanded={selected}
      data-testid={
        person.visualVariant === "primary" ? "scene-person" : "scene-person-b"
      }
      data-person-id={person.personId}
      data-anchor-id={person.anchorId}
      data-addressed={addressed ? "true" : "false"}
      data-label-suppressed={labelSuppressed ? "true" : "false"}
      onClick={() => onSelect(person.personId)}
    >
      <span
        className="person-nameplate"
        data-testid={
          person.visualVariant === "primary"
            ? "scene-person-nameplate"
            : "scene-person-b-nameplate"
        }
      >
        <strong>{dossier.name}</strong>
        <small>{dossier.title}</small>
      </span>
    </button>
  );
}

interface CivicLearningProps {
  readonly learned: boolean;
  readonly dispatch: (action: RunAUiAction) => void;
}

function CivicLearning({ learned, dispatch }: CivicLearningProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <aside
      className="civic-learning civic-glass"
      role="dialog"
      aria-modal="false"
      aria-labelledby="civic-learning-title"
      data-testid="civic-learning-popover"
    >
      <header>
        <div>
          <p>Civic reference</p>
          <h2 id="civic-learning-title">Committee referral</h2>
        </div>
        <button
          ref={closeRef}
          type="button"
          className="icon-button"
          aria-label="Close civic reference"
          onClick={() => dispatch({ type: "dismiss-overlay" })}
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>
      <p>
        A committee referral sends a proposal to the group responsible for its
        subject so members can study it before any later action.
      </p>
      <p className="civic-learning-note">
        Opening this reference does not mark it learned or move time.
      </p>
      {learned ? (
        <p className="learned-confirmation" role="status">
          Marked learned. This reference remains available from navigation.
        </p>
      ) : (
        <button
          type="button"
          className="mark-learned"
          onClick={() =>
            dispatch({
              type: "mark-concept-learned",
              conceptId: RUN_A_CIVIC_CONCEPT_ID,
            })
          }
        >
          Mark as learned
        </button>
      )}
    </aside>
  );
}

interface OfficeSceneProps {
  readonly fixture: RunBFixture;
  readonly dossiers: Readonly<Record<string, QuickDossierProjection>>;
  readonly state: RunAUiState;
  readonly dispatch: (action: RunAUiAction) => void;
  readonly conversationAddressee: ConversationAddressee | null;
  readonly onTalk: (personId: EntityId) => void;
  readonly onOpenWorkingDocument: () => void;
  readonly onOpenBriefing: () => void;
}

export function OfficeScene({
  fixture,
  dossiers,
  state,
  dispatch,
  conversationAddressee,
  onTalk,
  onOpenWorkingDocument,
  onOpenBriefing,
}: OfficeSceneProps) {
  const learned = state.learnedConceptIds.includes(RUN_A_CIVIC_CONCEPT_ID);
  const selectedScenePerson = fixture.scenePeople.find(
    (person) => person.personId === state.selectedPersonId,
  );
  const selectedDossier = selectedScenePerson
    ? dossiers[selectedScenePerson.personId]
    : undefined;
  const visualComposition = composeOfficeVisuals(
    fixture.scenePeople,
    PRODUCTION_VISUAL_LIBRARY,
  );
  const sceneViewportRef = useRef<HTMLElement>(null);
  const sceneTransform = useOfficeSceneTransform(sceneViewportRef);
  const cameraStyle = {
    width: `${OFFICE_VISUAL_SCENE.plate.width}px`,
    height: `${OFFICE_VISUAL_SCENE.plate.height}px`,
    transform: `translate3d(${sceneTransform.xOffset}px, ${sceneTransform.yOffset}px, 0) scale(${sceneTransform.uniformScale})`,
  } satisfies CSSProperties;
  const documentAnchors = OFFICE_VISUAL_SCENE.documentAnchors;

  return (
    <section
      ref={sceneViewportRef}
      className="office-scene"
      aria-label={`A quiet legislative office in ${fixture.locationDisplayName}`}
      data-testid="political-office-scene"
    >
      <div
        className="scene-camera"
        data-testid="office-art-compositor"
        data-environment-asset-id={visualComposition.environment.assetId}
        data-virtual-width={OFFICE_VISUAL_SCENE.plate.width}
        data-virtual-height={OFFICE_VISUAL_SCENE.plate.height}
        data-scene-scale={sceneTransform.uniformScale}
        data-scene-scale-x={sceneTransform.scaleX}
        data-scene-scale-y={sceneTransform.scaleY}
        data-scene-offset-x={sceneTransform.xOffset}
        data-scene-offset-y={sceneTransform.yOffset}
        data-camera-x={sceneTransform.camera.x}
        data-camera-y={sceneTransform.camera.y}
        data-camera-width={sceneTransform.camera.width}
        data-camera-height={sceneTransform.camera.height}
        data-camera-constraint={sceneTransform.constrainedAxis}
        data-device-pixel-ratio={sceneTransform.devicePixelRatio}
        style={cameraStyle}
      >
        <img
          className="scene-environment-art"
          src={visualComposition.environment.url}
          alt=""
          aria-hidden="true"
          draggable="false"
        />
        {visualComposition.characters.map((visual) =>
          visual.asset ? (
            <img
              key={`art-${visual.personId}`}
              className={`scene-character-art scene-character-art--${visual.visualVariant}`}
              src={visual.asset.url}
              alt=""
              aria-hidden="true"
              draggable="false"
              data-testid={`scene-character-art-${visual.visualVariant}`}
              data-asset-id={visual.asset.assetId}
              data-anchor-id={visual.anchorId}
              data-appearance-recipe-id={visual.appearanceRecipeId}
              style={{
                left: `${visual.leftPercent}%`,
                top: `${visual.topPercent}%`,
                width: `${visual.widthPercent}%`,
                zIndex: visual.depth,
              }}
            />
          ) : null,
        )}
        {visualComposition.occluders.map((occluder) => (
          <img
            key={occluder.id}
            className="scene-environment-occluder"
            src={occluder.asset.url}
            alt=""
            aria-hidden="true"
            draggable="false"
            data-occluder-id={occluder.id}
            data-asset-id={occluder.asset.assetId}
            style={{ zIndex: occluder.depth }}
          />
        ))}
        {fixture.scenePeople.map((person) => {
          const dossier = dossiers[person.personId];
          const visual = visualComposition.characters.find(
            (candidate) => candidate.personId === person.personId,
          );
          if (!dossier || !visual) return null;
          return (
            <ScenePerson
              key={person.personId}
              person={person}
              dossier={dossier}
              state={state}
              conversationAddressee={conversationAddressee}
              visual={visual}
              onSelect={(personId) =>
                dispatch({ type: "select-person", personId })
              }
            />
          );
        })}
        <button
          type="button"
          className="office-working-document-entry"
          style={{
            left: `${documentAnchors["working-draft"].xPercent}%`,
            top: `${documentAnchors["working-draft"].yPercent}%`,
          }}
          aria-label="Open Working Draft — Transit Access Pilot"
          data-testid="working-document-entry"
          data-scene-anchor-id="working-draft"
          onClick={onOpenWorkingDocument}
        >
          <strong>Transit Access Pilot</strong>
        </button>

        <button
          type="button"
          className="briefing-memo"
          style={{
            left: `${documentAnchors["briefing-memo"].xPercent}%`,
            top: `${documentAnchors["briefing-memo"].yPercent}%`,
          }}
          aria-label="Open Afternoon briefing"
          data-testid="briefing-memo-entry"
          data-scene-anchor-id="briefing-memo"
          onClick={onOpenBriefing}
        >
          <strong>Afternoon briefing</strong>
        </button>

        {!learned ? (
          <button
            type="button"
            className="civic-marker"
            style={{
              left: `${documentAnchors["civic-marker"].xPercent}%`,
              top: `${documentAnchors["civic-marker"].yPercent}%`,
            }}
            aria-label="Explain committee referral. Shift click to mark learned."
            data-testid="civic-learning-marker"
            data-scene-anchor-id="civic-marker"
            onClick={(event) =>
              dispatch(
                event.shiftKey
                  ? {
                      type: "mark-concept-learned",
                      conceptId: RUN_A_CIVIC_CONCEPT_ID,
                    }
                  : { type: "open-civic-learning" },
              )
            }
          >
            i
          </button>
        ) : null}
      </div>

      {state.overlay === "person-actions" &&
      selectedScenePerson &&
      selectedDossier ? (
        <PersonActionMenu
          name={selectedDossier.name}
          anchorId={selectedScenePerson.anchorId}
          personId={selectedScenePerson.personId}
          pinId={
            selectedScenePerson.visualVariant === "primary"
              ? "person"
              : "person-b"
          }
          dispatch={dispatch}
          onTalk={() => onTalk(selectedScenePerson.personId)}
        />
      ) : null}
      {state.overlay === "dossier" && selectedDossier ? (
        <QuickDossier
          dossier={selectedDossier}
          onClose={() => dispatch({ type: "dismiss-overlay" })}
        />
      ) : null}
      {state.overlay === "civic" ? (
        <CivicLearning learned={learned} dispatch={dispatch} />
      ) : null}

      <div className="scene-vignette" aria-hidden="true" />
    </section>
  );
}
