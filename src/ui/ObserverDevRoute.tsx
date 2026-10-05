import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { EntityId, IsoDate, World } from "../simulation";
import { daysBetween } from "../simulation/dates";
import { deserializeWorld } from "../simulation/serialization";
import { isObserving } from "../presentation/life-continuation-shell";
import {
  observerSetup,
  openObserverWorld,
} from "../presentation/observer-world";
import {
  OBSERVER_RECORD_PAGE_SIZE,
  ObserverClock,
  ObserverRecordWorkspace,
} from "../player/ObserverWorkspace";
import { ObserverRunController } from "../player/observer-run-controller";
import { buildTraceIndex } from "../devtools";
import { CausalTraceView } from "./CausalTraceView";

async function readObserverSnapshot(file: File): Promise<World> {
  const reader = file.stream().getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      chunks.push(decoder.decode(part.value, { stream: true }));
    }
    const final = decoder.decode();
    if (final) chunks.push(final);
    return deserializeWorld(chunks);
  } finally {
    reader.releaseLock();
  }
}

/** Development entry only. The worker owns the clock; the inspector sees acknowledged checkpoints. */
export function ObserverDevRoute() {
  const params = new URLSearchParams(window.location.search);
  const [seed, setSeed] = useState(params.get("seed") ?? "observer-dev");
  const [world, setWorld] = useState<World | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  return world ? (
    <LiveObserver initialWorld={world} />
  ) : (
    <main>
      <h1>Observer developer trace</h1>
      <label>
        Seed{" "}
        <input value={seed} onChange={(event) => setSeed(event.target.value)} />
      </label>
      <button
        type="button"
        onClick={() => {
          try {
            setWorld(
              openObserverWorld(
                observerSetup(seed, params.get("place") ?? undefined),
              ).world,
            );
          } catch (error) {
            setProblem(String(error));
          }
        }}
      >
        Open watched world
      </button>
      <label>
        Open an existing Observer snapshot{" "}
        <input
          type="file"
          accept=".json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void readObserverSnapshot(file)
              .then((restored) => {
                if (!isObserving(restored))
                  throw new Error(
                    "Choose an Observer world. A played world cannot enter this route.",
                  );
                setWorld(restored);
              })
              .catch((error) => setProblem(String(error)));
          }}
        />
      </label>
      {problem ? <p role="alert">{problem}</p> : null}
    </main>
  );
}

function LiveObserver({ initialWorld }: { readonly initialWorld: World }) {
  const recordRef = useRef<HTMLElement>(null);
  const traceRef = useRef<HTMLDivElement>(null);
  const [world, setWorld] = useState(initialWorld);
  const [checkpoint, setCheckpoint] = useState(initialWorld);
  const [rootId, setRootId] = useState<EntityId | null>(null);
  const [targetDate, setTargetDate] = useState(initialWorld.currentDate);
  const [problem, setProblem] = useState<string | null>(null);
  const runner = useMemo(
    () => new ObserverRunController(initialWorld),
    [initialWorld],
  );
  runner.setCommit((next) => setWorld(next));
  useLayoutEffect(() => {
    runner.syncWorld(world);
    if (!runner.getSnapshot().running) setCheckpoint(world);
  }, [runner, world]);
  useEffect(() => () => runner.dispose(), [runner]);
  const [requestedId, setRequestedId] = useState<readonly EntityId[] | null>(
    null,
  );
  const [rootPage, setRootPage] = useState(0);
  const inspecting = requestedId !== null;
  const index = useMemo(
    () => (inspecting ? buildTraceIndex(checkpoint) : null),
    [checkpoint, inspecting],
  );
  const requested = new Set(requestedId ?? []);
  const roots = index
    ? index.nodes.filter(
        (node) =>
          requested.has(node.id) ||
          node.entityRefs.some((ref) => requested.has(ref.entityId)),
      )
    : [];
  const rootPages = Math.max(
    1,
    Math.ceil(roots.length / OBSERVER_RECORD_PAGE_SIZE),
  );
  const page = Math.min(rootPage, rootPages - 1);
  const visibleRoots = roots.slice(
    page * OBSERVER_RECORD_PAGE_SIZE,
    (page + 1) * OBSERVER_RECORD_PAGE_SIZE,
  );
  const focusedRoot =
    rootId ??
    roots.find((node) => requested.has(node.id))?.id ??
    roots[0]?.id ??
    null;
  useEffect(() => {
    if (focusedRoot) traceRef.current?.scrollIntoView({ block: "start" });
  }, [focusedRoot]);
  const pause = async () => {
    const next = await runner.pause();
    setCheckpoint(next);
    return next;
  };
  return (
    <div className="observer-dev" data-testid="observer-dev">
      <h1>Live Observer · developer trace</h1>
      <ObserverClock
        runner={runner}
        onOpenRecord={() => {
          void pause().catch((error) => setProblem(String(error)));
        }}
      />
      <label>
        Jump to date{" "}
        <input
          type="date"
          value={targetDate}
          onChange={(event) => setTargetDate(event.target.value as IsoDate)}
        />
      </label>
      <button
        type="button"
        onClick={() => {
          void (async () => {
            const paused = await pause();
            const days = daysBetween(paused.currentDate, targetDate);
            if (days < 0)
              throw new Error(
                "Choose the current date or a later date. This clock cannot rewind.",
              );
            if (days > 0) setCheckpoint(await runner.step(days));
            setProblem(null);
          })().catch((error) => setProblem(String(error)));
        }}
      >
        Run to date
      </button>
      {problem ? <p role="alert">{problem}</p> : null}
      <section
        ref={recordRef}
        className="observer-dev__record"
        aria-label="Paused world record"
      >
        <ObserverRecordWorkspace
          world={checkpoint}
          onOpenPerson={(id) => setRequestedId([id])}
          onTrace={(id) => {
            void pause()
              .then(() => {
                setRequestedId(typeof id === "string" ? [id] : id);
                setRootId(null);
                setRootPage(0);
                recordRef.current?.scrollTo({ top: 0 });
              })
              .catch((error) => setProblem(String(error)));
          }}
        />
      </section>
      {requestedId ? (
        <section className="observer-dev__roots" aria-label="Trace roots">
          <h2>Recorded roots</h2>
          {roots.length === 0 ? (
            <p>No trace adapter projects this record yet.</p>
          ) : (
            <ul>
              {visibleRoots.map((node) => (
                <li key={node.id}>
                  <button type="button" onClick={() => setRootId(node.id)}>
                    {node.recordText ?? node.developmentSummary}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {rootPages > 1 ? (
            <div role="group" aria-label="Trace root pages">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setRootPage(page - 1)}
              >
                Previous roots
              </button>
              <span>
                Page {page + 1} of {rootPages}
              </span>
              <button
                type="button"
                disabled={page + 1 === rootPages}
                onClick={() => setRootPage(page + 1)}
              >
                Next roots
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
      {focusedRoot && index ? (
        <div ref={traceRef}>
          <CausalTraceView
            key={checkpoint.history.nextSequence}
            reviewWorld={checkpoint}
            initialRootId={focusedRoot}
            reviewIndex={index}
          />
        </div>
      ) : null}
    </div>
  );
}
