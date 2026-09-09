import { lazy, Suspense, useCallback, useMemo, useRef, useState } from "react";
import { createGeneratedWorld, personName } from "../simulation";
import type { EntityId, World } from "../simulation/types";
import {
  activeWorkRelationshipsAt,
  organizationProfileAt,
} from "../simulation/life-queries";
import {
  BrowserSaveStore,
  type BrowserWorldSummary,
} from "../presentation/browser-world-repository";
import { resolveActiveMemberSeat } from "../presentation/legislative-member-seat";
import { SCENE_REGISTRY } from "../presentation/scene-registry";
import {
  cloneForReview,
  memoryReviewStorage,
  resetReview,
} from "../devtools/review-session";

import { ReviewContext } from "./review-context";
import "./review-hub.css";

const DeveloperViewer = lazy(() =>
  import("./DeveloperViewer").then((module) => ({
    default: module.DeveloperViewer,
  })),
);
const CausalTraceView = lazy(() =>
  import("./CausalTraceView").then((module) => ({
    default: module.CausalTraceView,
  })),
);
const CharacterProofView = lazy(() =>
  import("./CharacterProofView").then((module) => ({
    default: module.CharacterProofView,
  })),
);
const ContentBrowserView = lazy(() =>
  import("./ContentBrowserView").then((module) => ({
    default: module.ContentBrowserView,
  })),
);
const SceneGalleryView = lazy(() =>
  import("./SceneGalleryView").then((module) => ({
    default: module.SceneGalleryView,
  })),
);
const ProductionOfficeProofView = lazy(() =>
  import("./ProductionOfficeProofView").then((module) => ({
    default: module.ProductionOfficeProofView,
  })),
);
const ScenePresentationProofView = lazy(() =>
  import("./ScenePresentationProofView").then((module) => ({
    default: module.ScenePresentationProofView,
  })),
);
const SceneAuthoringProofView = lazy(() =>
  import("./SceneAuthoringProofView").then((module) => ({
    default: module.SceneAuthoringProofView,
  })),
);
const PlayerOffice = lazy(() =>
  import("../player/PlayerOffice").then((module) => ({
    default: module.PlayerOffice,
  })),
);
const MeasureFloorView = lazy(() =>
  import("../player/MeasureFloorView").then((module) => ({
    default: module.MeasureFloorView,
  })),
);
const LegislationDevRoute = lazy(() =>
  import("../player/LegislationWorkspace").then((module) => ({
    default: module.LegislationDevRoute,
  })),
);
declare const __PG_BUILD_IDENTITY__: {
  head: string;
  workspace: string;
  branch: string;
  dirty: boolean;
  sourceDigest: string;
  runId: string | null;
};
const VIEWS = [
  ["developer", "People & world"],
  ["causal-trace", "Causal trace"],
  ["scene-gallery", "Rooms & environments"],
  ["offices", "Offices & context"],
  ["content", "Content browser"],
  ["character-proof", "Character candidate proof"],
  ["production-office", "Production office proof"],
  ["scene-proof", "Scene & pose proof"],
  ["scene-authoring", "Scene authoring proof"],
  ["office-fixture", "Office workflow fixture"],
  ["floor", "Floor workflow fixture"],
  ["legislation", "Legislation workflow fixture"],
] as const;
type View = (typeof VIEWS)[number][0];
const FIXTURES = new Set<View>([
  "office-fixture",
  "floor",
  "legislation",
  "character-proof",
  "scene-proof",
  "scene-authoring",
  "production-office",
]);

export function DeveloperReviewHub() {
  const [session, setSession] = useState(() =>
    cloneForReview(
      createGeneratedWorld(
        new URLSearchParams(window.location.search).get("seed") ??
          "dev-lab2-review",
      ),
      "Generated development world; fictional initialization",
    ),
  );
  const [view, setView] = useState<View>("developer");
  const [revision, setRevision] = useState(0);
  const [seedInput, setSeedInput] = useState(session.world.seed);
  const [sceneId, setSceneId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [personId, setPersonId] = useState<EntityId | null>(null);
  const [saves, setSaves] = useState<readonly BrowserWorldSummary[]>([]);
  const [message, setMessage] = useState("");
  const store = useRef<BrowserSaveStore | null>(null);
  const activeView = useRef<View>("developer");
  const reportWorld = useCallback(
    (world: World) =>
      setSession((current) =>
        current.world === world
          ? current
          : current.world.id !== world.id
            ? cloneForReview(
                world,
                `Disposable ${activeView.current} context; authored initialization`,
              )
            : { ...current, world },
      ),
    [],
  );
  const initialWorld = useRef(session.world);
  const storage = useMemo(() => memoryReviewStorage(), [revision]);
  const environment = useMemo(
    () => ({ storage, initialWorld: initialWorld.current, reportWorld }),
    [storage, reportWorld, view, revision],
  );
  function navigate(next: View) {
    activeView.current = next;
    initialWorld.current = session.world;
    setView(next);
  }
  function replaceSource(world: World, source: string) {
    const next = cloneForReview(world, source);
    initialWorld.current = next.world;
    setSession(next);
    setPersonId(null);
    setView("developer");
    setRevision((n) => n + 1);
  }
  async function listSaves() {
    try {
      store.current ??= new BrowserSaveStore();
      const result = await store.current.list();
      setSaves(result.saves);
      setMessage(
        `${result.saves.length} saves available; ${result.damaged.length} unreadable. No save was opened or changed.`,
      );
    } catch (error) {
      setMessage(String(error));
    }
  }
  async function inspectSave(id: EntityId) {
    try {
      const world = await store.current!.inspectSnapshot(id);
      if (!world) throw new Error("Save no longer exists.");
      replaceSource(world, `Read-only snapshot of save ${id}`);
      setMessage("Snapshot cloned. Original save and metadata are unchanged.");
    } catch (error) {
      setMessage(String(error));
    }
  }
  const selected =
    personId && session.world.people[personId]
      ? personId
      : session.world.control.kind === "person"
        ? session.world.control.personId
        : session.world.personOrder[0];
  const work = selected
    ? activeWorkRelationshipsAt(session.world, selected)
    : [];
  const seat = selected
    ? resolveActiveMemberSeat(session.world, selected)
    : null;
  const identity =
    typeof __PG_BUILD_IDENTITY__ === "undefined" ? null : __PG_BUILD_IDENTITY__;
  return (
    <div
      className="review-hub"
      data-testid="review-hub"
      onClickCapture={(event) => {
        const link = (event.target as HTMLElement).closest("a");
        if (!link) return;
        const url = new URL(link.href, window.location.href);
        const target = url.searchParams.get("view");
        if (
          url.origin === window.location.origin &&
          VIEWS.some(([key]) => key === target)
        ) {
          event.preventDefault();
          const current = new URL(window.location.href);
          for (const [key, value] of url.searchParams)
            if (key !== "view") current.searchParams.set(key, value);
          window.history.replaceState({}, "", current);
          navigate(target as View);
          setRevision((n) => n + 1);
        }
      }}
    >
      <div className="review-safety-bar" role="note">
        DISPOSABLE REVIEW · {view} · seed <code>{session.world.seed}</code> ·
        normal saves untouched
      </div>
      <header className="review-header">
        <p className="eyebrow">Our Civic Duty · Developer review</p>
        <h1>Disposable cloned review world</h1>
        <p>
          Review changes never enter normal saves. Switching person or context
          grants no powers in real play, records no normal travel, and proves no
          normal-player reachability. Art previews do not grant visual approval.
        </p>
        <details>
          <summary>Exact build / source identity</summary>
          <pre data-testid="review-build">
            {JSON.stringify(identity, null, 2)}
          </pre>
          <p>
            Identity is captured at server startup. Restart after source changes
            before collecting evidence.
          </p>
        </details>
        <dl className="review-identity">
          <dt>World seed</dt>
          <dd data-testid="review-seed">{session.world.seed}</dd>
          <dt>World</dt>
          <dd>{session.world.id}</dd>
          <dt>Generator / schema</dt>
          <dd>
            {session.world.generatorVersion} / {session.world.schemaVersion}
          </dd>
          <dt>Moment / action sequence</dt>
          <dd>
            {session.world.currentDate}{" "}
            {session.world.currentMoment.minuteOfDay} /{" "}
            {session.world.actionSequence}
          </dd>
          <dt>Context</dt>
          <dd data-testid="review-context">
            {view} —{" "}
            {FIXTURES.has(view)
              ? "Authored development fixture prerequisites; separate disposable context, not the source save"
              : session.source}
          </dd>
        </dl>
        <div className="review-actions">
          <button
            onClick={() => {
              const next = resetReview(session);
              initialWorld.current = next.world;
              setSession(next);
              setRevision((n) => n + 1);
              setMessage(
                "Review reset to source snapshot; disposable storage cleared.",
              );
            }}
          >
            Reset review clone
          </button>
          <a href="/" onClick={() => storage.clear()}>
            Exit review and discard
          </a>
          <button onClick={() => void listSaves()}>Inspect saved worlds</button>
        </div>
        <div className="review-actions">
          <label>
            Generated review seed{" "}
            <input
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
            />
          </label>
          <button
            disabled={!seedInput.trim()}
            onClick={() =>
              replaceSource(
                createGeneratedWorld(seedInput),
                "Generated development world; fictional initialization",
              )
            }
          >
            Clone generated world
          </button>
        </div>
        {saves.length > 0 && (
          <ul>
            {saves.map((save) => (
              <li key={save.saveId}>
                <button onClick={() => void inspectSave(save.saveId)}>
                  Clone {save.playerName} · {save.saveId}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p role="status">{message}</p>
        <nav aria-label="Review contexts">
          {VIEWS.map(([key, label]) => (
            <button
              key={key}
              aria-pressed={view === key}
              onClick={() => navigate(key)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      <ReviewContext.Provider value={environment}>
        <Suspense
          fallback={<p role="status">Loading existing review surface…</p>}
        >
          <section
            key={`${view}:${revision}`}
            className="review-content"
            aria-label="Selected review context"
          >
            {view === "developer" && <DeveloperViewer />}
            {view === "causal-trace" && (
              <CausalTraceView reviewWorld={session.world} />
            )}
            {view === "content" && <ContentBrowserView />}
            {view === "character-proof" && <CharacterProofView />}
            {view === "production-office" && <ProductionOfficeProofView />}
            {view === "scene-proof" && <ScenePresentationProofView />}
            {view === "scene-authoring" && <SceneAuthoringProofView />}
            {view === "office-fixture" && <PlayerOffice />}
            {view === "floor" && <MeasureFloorView />}
            {view === "legislation" && <LegislationDevRoute />}
            {view === "scene-gallery" && (
              <>
                <label>
                  Inspect room{" "}
                  <select
                    value={sceneId}
                    onChange={(e) => setSceneId(e.target.value)}
                  >
                    <option value="">All registered rooms</option>
                    {[...SCENE_REGISTRY.scenes.values()].map((scene) => (
                      <option key={scene.sceneId} value={scene.sceneId}>
                        {scene.label} · {scene.sceneId}
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  Room selection is visual inspection only; no travel or
                  presence is recorded.
                </p>
                <SceneGalleryView selectedSceneId={sceneId} />
              </>
            )}
            {view === "offices" && (
              <div className="review-office">
                <h2>Existing office and work context</h2>
                <label>
                  Existing person{" "}
                  <select
                    value={selected ?? ""}
                    onChange={(e) => setPersonId(e.target.value as EntityId)}
                  >
                    {session.world.personOrder.map((id) => (
                      <option key={id} value={id}>
                        {personName(session.world.people[id]!)} · {id}
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  {seat?.kind === "unseated"
                    ? seat.reason
                    : seat
                      ? `Supported member seat: ${seat.seat.chamberKey}`
                      : "No person available."}
                </p>
                <pre>{JSON.stringify(work, null, 2)}</pre>
                {work.length === 0 && (
                  <p>
                    No active canonical work relationship for this person.
                    Selecting an office picture does not establish employment,
                    membership or legal authority.
                  </p>
                )}
                <h3>Institutions and organizations in this world</h3>
                <label>
                  Institution / organization{" "}
                  <select
                    value={organizationId}
                    onChange={(e) => setOrganizationId(e.target.value)}
                  >
                    <option value="">Select an existing record</option>
                    {session.world.history.organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {organizationProfileAt(session.world, org.id)?.name ??
                          "Name not recorded"}{" "}
                        · {org.id}
                      </option>
                    ))}
                  </select>
                </label>
                {organizationId && (
                  <pre>
                    {JSON.stringify(
                      session.world.history.organizations.find(
                        (org) => org.id === organizationId,
                      ),
                      null,
                      2,
                    )}
                  </pre>
                )}
                <p>
                  Organization identity alone establishes no office powers or
                  supported workflow.
                </p>
                <h3>Supported authored workflow contexts</h3>
                <p>
                  These existing adapters supply their own fictional
                  prerequisites. The original saved world remains unchanged.
                  Executive/judicial normal-work consumers owned by other lanes
                  are not registered in this base.
                </p>
                {(["office-fixture", "floor", "legislation"] as const).map(
                  (key) => (
                    <button key={key} onClick={() => navigate(key)}>
                      Open {key} disposable fixture
                    </button>
                  ),
                )}
              </div>
            )}
          </section>
        </Suspense>
      </ReviewContext.Provider>
    </div>
  );
}
