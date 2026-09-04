import { useMemo, useState } from "react";

import {
  buildTraceExport,
  buildTraceIndex,
  createCausalTraceFixture,
  projectConversationObserverTrace,
  traceExportJson,
  traceExportMarkdown,
  TRACE_RECORD_CLASSES,
  walkTrace,
  type TraceDirection,
  type TraceNode,
  type TraceRecordClass,
} from "../devtools";
import type { EntityId } from "../simulation";
import type { ConversationAudibility } from "../presentation/run-b-conversation";
import "./causal-trace.css";

/**
 * The inspector, as a development route.
 *
 * It reads a world and never writes one. Every control here filters, selects
 * or walks; none of them records anything, and the world this page holds is
 * the same object from the first render to the last. That is the property the
 * tests assert, and it is the reason the page can be opened against a save
 * without the act of looking changing what is being looked at.
 *
 * The page builds its own fixture world rather than reaching into a running
 * game. A diagnostic that can only be used while reproducing a bug is a
 * diagnostic nobody uses; this one opens on a deterministic conversation whose
 * causality is already interesting, and the seed is in the URL so a report can
 * name the exact world it is talking about.
 */

const AUDIBILITY_OPTIONS: readonly ConversationAudibility[] = [
  "normal",
  "quiet",
];

function readParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

function readAudibility(): ConversationAudibility {
  const value = readParam("audibility");
  return value === "quiet" ? "quiet" : "normal";
}

function matches(node: TraceNode, query: string): boolean {
  if (query.trim().length === 0) return true;
  const needle = query.trim().toLowerCase();
  return (
    node.id.toLowerCase().includes(needle) ||
    node.stableKey.toLowerCase().includes(needle) ||
    node.family.toLowerCase().includes(needle) ||
    node.developmentSummary.toLowerCase().includes(needle) ||
    (node.recordText ?? "").toLowerCase().includes(needle) ||
    node.entityRefs.some((ref) => ref.entityId.toLowerCase().includes(needle))
  );
}

export function CausalTraceView() {
  const [seed, setSeed] = useState(
    () => readParam("seed") ?? "causal-trace-observer",
  );
  const [audibility, setAudibility] =
    useState<ConversationAudibility>(readAudibility);
  const [classFilter, setClassFilter] = useState<TraceRecordClass | "all">(
    "all",
  );
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState<TraceDirection>("upstream");
  const [depth, setDepth] = useState(8);
  const [selectedId, setSelectedId] = useState<EntityId | null>(null);
  const [exportFormat, setExportFormat] = useState<"markdown" | "json">(
    "markdown",
  );
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const fixture = useMemo(
    () => createCausalTraceFixture(audibility, seed),
    [audibility, seed],
  );
  const index = useMemo(() => buildTraceIndex(fixture.world), [fixture]);

  const defaultRootId =
    fixture.world.history.decisionTraces.at(-1)?.id ??
    index.nodes.at(-1)?.id ??
    null;
  const rootId = selectedId ?? defaultRootId;

  const visible = index.nodes.filter(
    (node) =>
      (classFilter === "all" || node.recordClass === classFilter) &&
      (sourceFilter === "all" || node.sourceKey === sourceFilter) &&
      matches(node, query),
  );

  const selected = rootId ? (index.byId.get(rootId) ?? null) : null;
  const walk = rootId
    ? walkTrace(index, { rootId, direction, maxDepth: depth })
    : null;
  const exportDocument = rootId
    ? buildTraceExport(index, { rootId, direction, maxDepth: depth })
    : null;
  const exportText = exportDocument
    ? exportFormat === "json"
      ? traceExportJson(exportDocument)
      : traceExportMarkdown(exportDocument)
    : "";

  const observerTraces = fixture.turns.map((turn) =>
    projectConversationObserverTrace(fixture.world, {
      eventId: turn.eventId,
      declaredPresence: {
        basis: "the scene's recorded physical presence set",
        personIds: fixture.room.physicallyPresentPersonIds,
        note: "Supplied by the conversation room context, not by the event record.",
      },
      historySpan: turn.historySpan,
    }),
  );

  function copyExport() {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setCopyStatus("Copying is unavailable here; select the text instead.");
      return;
    }
    navigator.clipboard.writeText(exportText).then(
      () => setCopyStatus("Trace copied."),
      () => setCopyStatus("Copying was refused; select the text instead."),
    );
  }

  return (
    <main className="causal-trace" data-testid="causal-trace-view">
      <p className="causal-trace__banner">
        Development tool. This page reads canonical records and writes nothing.
        It is not part of the game.
      </p>
      <h1>Causal trace inspector</h1>
      <p>
        Every link shown here is a field the record itself carries. Where the
        repository recorded no parent, this page says UNKNOWN rather than
        offering a plausible one.
      </p>

      <dl className="causal-trace__identity" data-testid="trace-identity">
        <div>
          <dt>Seed</dt>
          <dd data-testid="trace-seed">{index.identity.seed}</dd>
        </div>
        <div>
          <dt>World</dt>
          <dd>{index.identity.worldId}</dd>
        </div>
        <div>
          <dt>Content id</dt>
          <dd data-testid="trace-content-id">
            {index.identity.worldContentId}
          </dd>
        </div>
        <div>
          <dt>History frontier</dt>
          <dd data-testid="trace-frontier">{index.identity.historyFrontier}</dd>
        </div>
        <div>
          <dt>Current date</dt>
          <dd>{index.identity.currentDate}</dd>
        </div>
        <div>
          <dt>Records projected</dt>
          <dd data-testid="trace-record-count">{index.nodes.length}</dd>
        </div>
      </dl>

      <div className="causal-trace__controls">
        <label>
          Seed
          <input
            value={seed}
            onChange={(event) => {
              setSeed(event.target.value);
              setSelectedId(null);
            }}
          />
        </label>
        <label>
          Audibility
          <select
            value={audibility}
            onChange={(event) => {
              setAudibility(event.target.value as ConversationAudibility);
              setSelectedId(null);
            }}
          >
            {AUDIBILITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Record class
          <select
            value={classFilter}
            onChange={(event) =>
              setClassFilter(event.target.value as TraceRecordClass | "all")
            }
          >
            <option value="all">all</option>
            {TRACE_RECORD_CLASSES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Source
          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
          >
            <option value="all">all</option>
            {index.sourceKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
        <label>
          Search id, key, entity or text
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          Direction
          <select
            value={direction}
            onChange={(event) =>
              setDirection(event.target.value as TraceDirection)
            }
          >
            <option value="upstream">upstream</option>
            <option value="downstream">downstream</option>
            <option value="both">both</option>
          </select>
        </label>
        <label>
          Depth
          <input
            type="number"
            min={0}
            max={32}
            value={depth}
            onChange={(event) =>
              setDepth(Math.max(0, Number(event.target.value) || 0))
            }
          />
        </label>
      </div>

      <div className="causal-trace__columns">
        <section aria-label="Records">
          <h2>Records ({visible.length})</h2>
          {visible.length === 0 ? (
            <p className="causal-trace__empty">
              No record matches these filters.
            </p>
          ) : (
            <ul className="causal-trace__list" data-testid="trace-record-list">
              {visible.map((node) => (
                <li key={node.id}>
                  <button
                    type="button"
                    className="causal-trace__record"
                    aria-current={node.id === rootId}
                    onClick={() => {
                      setSelectedId(node.id);
                      setCopyStatus(null);
                    }}
                  >
                    <span className="causal-trace__class">
                      {node.recordClass}
                    </span>
                    <code>{node.id}</code>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Trace">
          {selected === null ? (
            <p className="causal-trace__empty">Select a record to trace it.</p>
          ) : (
            <>
              <h2>Selected record</h2>
              <table data-testid="trace-selected">
                <tbody>
                  <tr>
                    <th scope="row">Id</th>
                    <td>
                      <code>{selected.id}</code>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Class</th>
                    <td>{selected.recordClass}</td>
                  </tr>
                  <tr>
                    <th scope="row">Truth origin</th>
                    <td>{selected.truthOrigin}</td>
                  </tr>
                  <tr>
                    <th scope="row">Family</th>
                    <td>{selected.family}</td>
                  </tr>
                  <tr>
                    <th scope="row">Stable key</th>
                    <td>
                      <code>{selected.stableKey}</code>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Sequence</th>
                    <td>
                      {selected.sequence === null
                        ? "not sequenced by the history store"
                        : selected.sequence}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Development summary</th>
                    <td>{selected.developmentSummary}</td>
                  </tr>
                  <tr>
                    <th scope="row">Recorded text</th>
                    <td>
                      {selected.recordText ?? (
                        <span className="causal-trace__unknown">
                          UNKNOWN — the record carries none
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              <h3>Recorded links ({selected.links.length})</h3>
              {selected.links.length === 0 ? (
                <p className="causal-trace__unknown">
                  UNLINKED — this record names no other record.
                </p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Kind</th>
                      <th>Field</th>
                      <th>Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.links.map((link) => (
                      <tr key={`${link.role}:${link.targetId}`}>
                        <td>{link.kind}</td>
                        <td>
                          <code>{link.role}</code>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="causal-trace__record"
                            onClick={() => setSelectedId(link.targetId)}
                          >
                            <code>{link.targetId}</code>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <h3>UNKNOWN / UNLINKED ({selected.unrecordedLinks.length})</h3>
              {selected.unrecordedLinks.length === 0 ? (
                <p className="causal-trace__empty">
                  Every optional link on this record was recorded.
                </p>
              ) : (
                <table data-testid="trace-unknown-links">
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Why the trace stops</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.unrecordedLinks.map((unrecorded) => (
                      <tr key={unrecorded.role}>
                        <td>
                          <code>{unrecorded.role}</code>
                        </td>
                        <td className="causal-trace__unknown">
                          {unrecorded.note}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <h2>Walk ({walk?.steps.length ?? 0} steps)</h2>
              <table data-testid="trace-walk">
                <thead>
                  <tr>
                    <th>Depth</th>
                    <th>Direction</th>
                    <th>Record</th>
                    <th>Class</th>
                    <th>Via field</th>
                  </tr>
                </thead>
                <tbody>
                  {(walk?.steps ?? []).map((step) => (
                    <tr key={`${step.direction}:${step.nodeId}`}>
                      <td>{step.depth}</td>
                      <td>{step.direction}</td>
                      <td>
                        <code>{step.nodeId}</code>
                      </td>
                      <td>{index.byId.get(step.nodeId)?.recordClass ?? "—"}</td>
                      <td>
                        <code>{step.viaRole ?? "—"}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h2>Boundaries ({walk?.boundaries.length ?? 0})</h2>
              <table data-testid="trace-boundaries">
                <thead>
                  <tr>
                    <th>Kind</th>
                    <th>Record</th>
                    <th>Field</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {(walk?.boundaries ?? []).map((boundary, position) => (
                    <tr key={`${boundary.kind}:${boundary.nodeId}:${position}`}>
                      <td>{boundary.kind}</td>
                      <td>
                        <code>{boundary.nodeId}</code>
                      </td>
                      <td>
                        <code>{boundary.role}</code>
                      </td>
                      <td>{boundary.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      </div>

      <h2>Who heard it</h2>
      <p>
        Read from the records each conversation turn wrote. Absence is reported
        with the reason the tool checked, never as a bare inference.
      </p>
      {observerTraces.map((trace, position) => (
        <section key={trace.eventId} aria-label={`Turn ${position + 1}`}>
          <h3>
            Turn {position + 1} · audibility{" "}
            {fixture.turns[position]?.audibility ?? "unknown"}
          </h3>
          <table data-testid={`observer-turn-${position + 1}`}>
            <tbody>
              <tr>
                <th scope="row">Recorded participants</th>
                <td>{trace.recordedPresentPersonIds.length}</td>
              </tr>
              <tr>
                <th scope="row">Claims recorded</th>
                <td>{trace.claims.length}</td>
              </tr>
              <tr>
                <th scope="row">Received the claim</th>
                <td data-testid={`observer-recipients-${position + 1}`}>
                  {trace.claimRecipientPersonIds.length === 0
                    ? "nobody"
                    : trace.claimRecipientPersonIds.join(", ")}
                </td>
              </tr>
              <tr>
                <th scope="row">Formed a perception</th>
                <td>
                  {trace.perceptions.length === 0
                    ? "nobody"
                    : trace.perceptions
                        .map((perception) => perception.personId)
                        .join(", ")}
                </td>
              </tr>
              <tr>
                <th scope="row">Did not learn it</th>
                <td
                  className="causal-trace__unknown"
                  data-testid={`observer-absences-${position + 1}`}
                >
                  {trace.absences.length === 0
                    ? "nobody the records can speak about"
                    : trace.absences
                        .map(
                          (absence) => `${absence.personId} (${absence.basis})`,
                        )
                        .join("; ")}
                </td>
              </tr>
              <tr>
                <th scope="row">Durable decisions recorded in this turn</th>
                <td>
                  {trace.decisionTraces.length === 0
                    ? "none"
                    : trace.decisionTraces
                        .map(
                          (decision) =>
                            `${decision.decisionType} → ${decision.selectedOptionKey ?? "no option"}`,
                        )
                        .join("; ")}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      ))}

      <h2>Export</h2>
      <div className="causal-trace__controls">
        <label>
          Format
          <select
            value={exportFormat}
            onChange={(event) =>
              setExportFormat(event.target.value as "markdown" | "json")
            }
          >
            <option value="markdown">markdown</option>
            <option value="json">json</option>
          </select>
        </label>
        <button type="button" onClick={copyExport}>
          Copy trace
        </button>
        {copyStatus === null ? null : <span role="status">{copyStatus}</span>}
      </div>
      <textarea
        className="causal-trace__export"
        aria-label="Trace export"
        data-testid="trace-export"
        readOnly
        value={exportText}
      />
    </main>
  );
}
