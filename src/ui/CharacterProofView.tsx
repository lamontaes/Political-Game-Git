import { useMemo, useRef, useState, type CSSProperties } from "react";

import clippingAfterUrl from "../../docs/agent/evidence/office-clipping-after-1440x900.png";
import clippingBeforeUrl from "../../docs/agent/evidence/office-clipping-before-1440x900.png";
import provenanceData from "../../art/manifest/provenance.json";
import {
  CHARACTER_PROOF_SCENE,
  CHARACTER_PROOF_SETS,
  clearCharacterProofSnapshot,
  composeCharacterProof,
  createCharacterProofSetWorld,
  loadCharacterProofSnapshot,
  saveCharacterProofSnapshot,
  summarizeComponentReuse,
  type CharacterProofCharacter,
  type CharacterProofSetId,
  type CharacterProofWorldSource,
} from "../presentation/character-proof";
import { createRunBFixture } from "../presentation/run-b-fixture";
import {
  composeOfficeVisuals,
  CANDIDATE_REVIEW_CHARACTER_LIBRARY,
  CANDIDATE_REVIEW_VISUAL_LIBRARY,
  PRODUCTION_CHARACTER_LIBRARY,
  PRODUCTION_VISUAL_LIBRARY,
} from "../presentation/visual-integration";
import { ModularCharacter } from "../player/ModularCharacter";
import { useSceneTransform } from "../player/useSceneTransform";
import type { EntityId, World } from "../simulation/types";

interface ProvenanceEntryLike {
  readonly provenance_id: string;
  readonly asset_id?: string;
  readonly source_url_or_path?: string;
  readonly document_photo_plan_title?: string;
}

const PROVENANCE_BY_ASSET = new Map<string, ProvenanceEntryLike>(
  (provenanceData.entries as ProvenanceEntryLike[])
    .filter((entry) => entry.asset_id)
    .map((entry) => [entry.asset_id!, entry]),
);

function proofSetFromUrl(): CharacterProofSetId {
  const value = new URLSearchParams(window.location.search).get("set");
  return value === "dev" ? "dev" : "real";
}

/**
 * Which library a proof set composes from.
 *
 * The `real` set reviews BANKED CANDIDATES: parts that have files and hashes
 * but are in no catalog generation, so no player-facing surface can reach them.
 * They are composed here, and only here, so a person can decide whether the art
 * is good enough to promote.
 */
function librariesFor(setId: CharacterProofSetId) {
  return setId === "real"
    ? {
        characters: CANDIDATE_REVIEW_CHARACTER_LIBRARY,
        visuals: CANDIDATE_REVIEW_VISUAL_LIBRARY,
      }
    : {
        characters: PRODUCTION_CHARACTER_LIBRARY,
        visuals: PRODUCTION_VISUAL_LIBRARY,
      };
}

function initialWorld(setId: CharacterProofSetId): {
  readonly world: World;
  readonly source: CharacterProofWorldSource;
} {
  const restored = loadCharacterProofSnapshot(window.localStorage, setId);
  if (restored) return { world: restored, source: "restored-snapshot" };
  return {
    world: createCharacterProofSetWorld(
      librariesFor(setId).characters,
      CHARACTER_PROOF_SETS[setId],
    ),
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
        <dt>Recipe key</dt>
        <dd>
          <code>{plan.recipeKey}</code>
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

/** Office people through the ordinary seam: authored recipes win, else modular. */
function OfficePathTable() {
  const rows = useMemo(() => {
    const fixture = createRunBFixture();
    const guestBase = fixture.scenePeople[1];
    const primaryBase = fixture.scenePeople[0];
    // Two unpinned visitors without authored recipes: one at the desk chair,
    // whose seated-at-desk pose has a generation-1 DEV body, and one at the
    // guest chair, whose pose has no body yet and therefore fails closed.
    const deskVisitor = {
      ...primaryBase,
      personId: "person_proof_visitor_desk" as EntityId,
      title: "Visitor",
      role: "Constituent",
    };
    const guestVisitor = {
      ...guestBase,
      personId: "person_proof_visitor_guest" as EntityId,
      title: "Visitor",
      role: "Constituent",
    };
    const composition = composeOfficeVisuals(
      [...fixture.scenePeople, deskVisitor, guestVisitor],
      PRODUCTION_VISUAL_LIBRARY,
    );
    return composition.characters.map((visual) => ({
      personId: visual.personId,
      anchorId: visual.anchorId,
      path: visual.asset
        ? "flattened (authored recipe)"
        : visual.modular
          ? `modular (generation ${visual.modular.catalogGeneration})`
          : "placeholder (fail closed)",
      detail: visual.asset
        ? visual.asset.assetId
        : visual.modular
          ? visual.modular.layers.map((layer) => layer.assetId).join(", ")
          : visual.appearanceRecipeId,
    }));
  }, []);
  return (
    <table data-testid="character-proof-paths">
      <thead>
        <tr>
          <th>Person</th>
          <th>Anchor</th>
          <th>Path</th>
          <th>Visual</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.personId} data-path={row.path}>
            <td>
              <code>{row.personId}</code>
            </td>
            <td>{row.anchorId}</td>
            <td>{row.path}</td>
            <td>
              <code>{row.detail}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CharacterProofView() {
  const [setId] = useState<CharacterProofSetId>(proofSetFromUrl);
  const set = CHARACTER_PROOF_SETS[setId];
  const [{ world, source }, setWorldState] = useState(() =>
    initialWorld(setId),
  );
  const [debugAnchors, setDebugAnchors] = useState(false);
  const [status, setStatus] = useState<string>(
    source === "restored-snapshot"
      ? "Restored the saved world snapshot from browser storage."
      : "Created a fresh seeded world.",
  );

  const libraries = librariesFor(setId);
  const composition = useMemo(
    () => composeCharacterProof(world, libraries.characters, libraries.visuals),
    [world, libraries],
  );
  const reuse = useMemo(
    () => summarizeComponentReuse([...composition.stage, composition.side]),
    [composition],
  );
  const lineage = useMemo(
    () =>
      reuse.map((row) => {
        const entry = PROVENANCE_BY_ASSET.get(row.assetId);
        return {
          assetId: row.assetId,
          kind: row.kind,
          master: entry?.source_url_or_path ?? "—",
          title: entry?.document_photo_plan_title ?? "—",
        };
      }),
    [reuse],
  );

  return (
    <main
      className="character-proof"
      data-testid="character-proof"
      data-proof-set={setId}
      data-world-source={source}
      data-world-id={world.id}
      data-world-seed={world.seed}
      data-catalog-generation={libraries.characters.catalogGeneration}
    >
      <header className="character-proof-header">
        <div>
          <p className="character-proof-eyebrow">
            Developer proof · {set.label}
          </p>
          <h1>Modular character runtime proof</h1>
          <p>
            Four generated people from world <code>{world.seed}</code> rendered
            through one compositor from shared components. Library generation{" "}
            {libraries.characters.catalogGeneration}; people pinned to{" "}
            {set.catalogGeneration ?? libraries.characters.catalogGeneration}.
          </p>
          <p>
            Sets:{" "}
            <a href="?view=character-proof&set=real">
              real production candidates
            </a>{" "}
            · <a href="?view=character-proof&set=dev">DEV fixtures</a>
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
              saveCharacterProofSnapshot(window.localStorage, world, setId);
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
              clearCharacterProofSnapshot(window.localStorage, setId);
              setWorldState({
                world: createCharacterProofSetWorld(libraries.characters, set),
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
            {composition.side.plan.complete
              ? ""
              : " No released body exists for this pose in the person's body family, so the compositor fails closed instead of faking a seated pose."}
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

      <section className="character-proof-reuse">
        <h2>Source-master lineage</h2>
        <table data-testid="character-proof-lineage">
          <thead>
            <tr>
              <th>Normalized component</th>
              <th>Kind</th>
              <th>Source master</th>
              <th>Master record</th>
            </tr>
          </thead>
          <tbody>
            {lineage.map((row) => (
              <tr key={row.assetId} data-asset-id={row.assetId}>
                <td>
                  <code>{row.assetId}</code>
                </td>
                <td>{row.kind}</td>
                <td>
                  <code>{row.master}</code>
                </td>
                <td>{row.title}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="character-proof-reuse">
        <h2>Ordinary office seam: flattened vs modular</h2>
        <p>
          The same <code>composeOfficeVisuals</code> serves every person. An
          explicit authored recipe still wins (A01/B01); otherwise the person's
          modular recipe resolves for the anchor's pose, and a missing body for
          that pose fails closed.
        </p>
        <OfficePathTable />
      </section>

      <section className="character-proof-reuse">
        <h2>Office seat-contact repair</h2>
        <p>
          Before: the foreground occluder's worktop polygon swept through the
          primary chair and painted it over the woman's lap, and both authored
          roots sat mid-torso instead of on the seat line, so the man floated
          below and beside the guest chair. After: the polygon stops at the
          chair, and both roots are the measured seat-contact lines.
        </p>
        <div className="character-proof-evidence">
          <figure>
            <img src={clippingBeforeUrl} alt="Office before the repair" />
            <figcaption>Before (1440×900)</figcaption>
          </figure>
          <figure>
            <img src={clippingAfterUrl} alt="Office after the repair" />
            <figcaption>After (1440×900)</figcaption>
          </figure>
        </div>
      </section>
    </main>
  );
}
