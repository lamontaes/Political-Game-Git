import { useMemo, useRef, useState, type CSSProperties } from "react";

import {
  CHARACTER_PROOF_SCENE,
  clearCharacterProofSnapshot,
  composeCharacterProof,
  createCharacterProofWorld,
  loadCharacterProofSnapshot,
  saveCharacterProofSnapshot,
  summarizeComponentReuse,
  type CharacterProofCharacter,
  type CharacterProofWorldSource,
} from "../presentation/character-proof";
import {
  PRODUCTION_CHARACTER_LIBRARY,
  PRODUCTION_VISUAL_LIBRARY,
} from "../presentation/visual-integration";
import { ModularCharacter } from "../player/ModularCharacter";
import { useSceneTransform } from "../player/useSceneTransform";
import type { World } from "../simulation/types";

function initialWorld(): {
  readonly world: World;
  readonly source: CharacterProofWorldSource;
} {
  const restored = loadCharacterProofSnapshot(window.localStorage);
  if (restored) return { world: restored, source: "restored-snapshot" };
  return {
    world: createCharacterProofWorld(PRODUCTION_CHARACTER_LIBRARY),
    source: "fresh",
  };
}

function RecipeCard({ character }: { character: CharacterProofCharacter }) {
  const { plan } = character;
  return (
    <article
      className="character-proof-card"
      data-testid="character-proof-card"
      data-anchor-id={plan.anchorId}
      data-recipe-key={plan.recipeKey}
    >
      <h3>
        {character.name}{" "}
        <small>
          {plan.anchorId} · {plan.poseFamily}
        </small>
      </h3>
      <dl>
        <dt>Person</dt>
        <dd>
          <code>{plan.personId}</code>
        </dd>
        <dt>Appearance seed</dt>
        <dd>
          <code>{plan.appearanceSeed}</code>
        </dd>
        <dt>Catalog generation</dt>
        <dd>
          {plan.catalogGeneration}{" "}
          {plan.pinnedByPerson ? "(pinned by person)" : "(legacy default)"}
        </dd>
        <dt>Identity</dt>
        <dd>
          <code>
            {plan.identity.bodyFamily} / {plan.identity.headFamily}
          </code>
          <ul>
            {Object.entries(plan.identity.slots).map(([slotId, family]) => (
              <li key={slotId}>
                {slotId}: <code>{family ?? "—"}</code>
              </li>
            ))}
          </ul>
        </dd>
        <dt>Layers (draw order)</dt>
        <dd>
          <ol>
            {plan.layers.map((layer) => (
              <li key={layer.assetId} data-released={layer.released}>
                <code>{layer.assetId}</code> · L{layer.layer} ·{" "}
                {layer.attachmentAnchorId ?? "rig"}
              </li>
            ))}
          </ol>
        </dd>
      </dl>
      {!plan.complete ? (
        <p className="character-proof-warning">
          Incomplete: {plan.missing.join(", ")}
        </p>
      ) : null}
    </article>
  );
}

interface StageProps {
  readonly characters: readonly CharacterProofCharacter[];
  readonly debugAnchors: boolean;
  readonly testId: string;
  readonly label: string;
}

function ProofStage({ characters, debugAnchors, testId, label }: StageProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const transform = useSceneTransform(
    viewportRef,
    CHARACTER_PROOF_SCENE.plate,
    CHARACTER_PROOF_SCENE.camera,
  );
  const cameraStyle = {
    width: `${CHARACTER_PROOF_SCENE.plate.width}px`,
    height: `${CHARACTER_PROOF_SCENE.plate.height}px`,
    transform: `translate3d(${transform.xOffset}px, ${transform.yOffset}px, 0) scale(${transform.uniformScale})`,
  } satisfies CSSProperties;

  return (
    <div
      ref={viewportRef}
      className="character-proof-stage"
      data-testid={testId}
      aria-label={label}
    >
      <div
        className="scene-camera"
        data-testid={`${testId}-compositor`}
        data-scene-scale={transform.uniformScale}
        style={cameraStyle}
      >
        <div className="character-proof-floor" aria-hidden="true" />
        {characters.map((character) => (
          <ModularCharacter
            key={`${character.plan.personId}:${character.plan.anchorId}`}
            plan={character.plan}
            debugAnchors={debugAnchors}
            testId={`${testId}-character`}
          />
        ))}
        {debugAnchors
          ? characters.map((character) => (
              <span
                key={`scene-${character.plan.anchorId}`}
                className="scene-anchor-marker"
                data-testid={`${testId}-scene-anchor-marker`}
                data-anchor-id={character.plan.anchorId}
                title={`Scene anchor: ${character.plan.anchorId}`}
                style={
                  {
                    left: `${character.plan.root?.xPercent ?? 0}%`,
                    top: `${character.plan.root?.yPercent ?? 0}%`,
                  } satisfies CSSProperties
                }
              />
            ))
          : null}
      </div>
    </div>
  );
}

export function CharacterProofView() {
  const [{ world, source }, setWorldState] = useState(initialWorld);
  const [debugAnchors, setDebugAnchors] = useState(false);
  const [status, setStatus] = useState<string>(
    source === "restored-snapshot"
      ? "Restored the saved world snapshot from browser storage."
      : "Created a fresh seeded world.",
  );

  const composition = useMemo(
    () =>
      composeCharacterProof(
        world,
        PRODUCTION_CHARACTER_LIBRARY,
        PRODUCTION_VISUAL_LIBRARY,
      ),
    [world],
  );
  const reuse = useMemo(
    () => summarizeComponentReuse([...composition.stage, composition.side]),
    [composition],
  );

  return (
    <main
      className="character-proof"
      data-testid="character-proof"
      data-world-source={source}
      data-world-id={world.id}
      data-world-seed={world.seed}
      data-catalog-generation={PRODUCTION_CHARACTER_LIBRARY.catalogGeneration}
    >
      <header className="character-proof-header">
        <div>
          <p className="character-proof-eyebrow">
            Developer proof · DEV / NON-PRODUCTION fixture art
          </p>
          <h1>Modular character runtime proof</h1>
          <p>
            Four generated people from world <code>{world.seed}</code> rendered
            through one compositor from shared components. Catalog generation{" "}
            {PRODUCTION_CHARACTER_LIBRARY.catalogGeneration}.
          </p>
        </div>
        <div className="character-proof-controls">
          <label>
            <input
              type="checkbox"
              checked={debugAnchors}
              data-testid="character-proof-debug-anchors"
              onChange={(event) => setDebugAnchors(event.target.checked)}
            />
            Show root and attachment anchors
          </label>
          <button
            type="button"
            data-testid="character-proof-save"
            onClick={() => {
              saveCharacterProofSnapshot(window.localStorage, world);
              setStatus(
                "Saved the world snapshot to browser storage. Reload to restore it.",
              );
            }}
          >
            Save snapshot
          </button>
          <button
            type="button"
            data-testid="character-proof-reload"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
          <button
            type="button"
            data-testid="character-proof-clear"
            onClick={() => {
              clearCharacterProofSnapshot(window.localStorage);
              setWorldState({
                world: createCharacterProofWorld(PRODUCTION_CHARACTER_LIBRARY),
                source: "fresh",
              });
              setStatus(
                "Cleared the saved snapshot and created a fresh world.",
              );
            }}
          >
            Clear snapshot
          </button>
          <p role="status" data-testid="character-proof-status">
            {status} <em>Source: {source}.</em>
          </p>
        </div>
      </header>

      <ProofStage
        characters={composition.stage}
        debugAnchors={debugAnchors}
        testId="character-proof-stage"
        label="Four modular characters standing on a neutral stage"
      />

      <section className="character-proof-side">
        <ProofStage
          characters={[composition.side]}
          debugAnchors={debugAnchors}
          testId="character-proof-side"
          label="The first person again, seated, in another scene"
        />
        <div>
          <h2>Same person, another scene</h2>
          <p>
            {composition.side.name} at{" "}
            <code>{composition.side.plan.anchorId}</code> resolves the same
            identity key as on the stage; only the pose context changes.
          </p>
          <p>
            <code data-testid="character-proof-side-recipe-key">
              {composition.side.plan.recipeKey}
            </code>
          </p>
          {composition.side.plan.complete ? (
            <p data-testid="character-proof-side-status">
              Every slot this pose needs resolved.
            </p>
          ) : (
            <p
              className="character-proof-warning"
              data-testid="character-proof-side-status"
            >
              Incomplete in this pose:{" "}
              {composition.side.plan.missing.join(", ")}
            </p>
          )}
        </div>
      </section>

      <section className="character-proof-cards">
        {composition.stage.map((character) => (
          <RecipeCard key={character.plan.anchorId} character={character} />
        ))}
      </section>

      <section className="character-proof-reuse">
        <h2>Component reuse</h2>
        <table data-testid="character-proof-reuse">
          <thead>
            <tr>
              <th>Component</th>
              <th>Kind</th>
              <th>Used by</th>
            </tr>
          </thead>
          <tbody>
            {reuse.map((row) => (
              <tr key={row.assetId} data-asset-id={row.assetId}>
                <td>
                  <code>{row.assetId}</code>
                </td>
                <td>{row.kind}</td>
                <td>{row.usedBy.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
