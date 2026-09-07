import { canonicalJson } from "../simulation";
import type { EntityId } from "../simulation";
import { buildTraceIndex, unresolvedTraceLinks } from "./trace-index";
import type { TraceIdentity, TraceIndex } from "./trace-index";
import { TRACE_MODEL_VERSION } from "./trace-model";
import type { TraceNode } from "./trace-model";
import { walkTrace } from "./trace-walk";
import type {
  NormalizedTraceWalkRequest,
  TraceBoundary,
  TraceWalkRequest,
  TraceWalkStep,
} from "./trace-walk";

/**
 * A trace that can stand on its own in a bug report.
 *
 * The identity block is the part that matters and the part that is easy to
 * leave out: a trace without the seed, the world content id and the history
 * frontier is a picture of a graph nobody can get back to. With them, the same
 * replay and the same request reproduce the same export byte for byte, which
 * is the property the test suite actually asserts.
 *
 * Serialization goes through the world's existing canonical JSON emitter
 * rather than a second one. A tool whose whole purpose is showing what the
 * repository recorded has no business disagreeing with the repository about
 * how to write it down.
 */

export const TRACE_EXPORT_FORMAT_VERSION = "causal-trace-export-v1";

export interface TraceExportDocument {
  readonly formatVersion: typeof TRACE_EXPORT_FORMAT_VERSION;
  readonly modelVersion: typeof TRACE_MODEL_VERSION;
  readonly identity: TraceIdentity;
  readonly sourceKeys: readonly string[];
  readonly request: NormalizedTraceWalkRequest;
  readonly rootFound: boolean;
  readonly nodes: readonly TraceNode[];
  readonly steps: readonly TraceWalkStep[];
  readonly boundaries: readonly TraceBoundary[];
  /**
   * Recorded edges across the whole index whose target no source produced.
   * Counted rather than listed, because it is a property of the registry
   * rather than of this trace, and a developer needs to know it is non-zero.
   */
  readonly unresolvedLinkCountInIndex: number;
}

export function buildTraceExport(
  index: TraceIndex,
  request: TraceWalkRequest,
): TraceExportDocument {
  const walk = walkTrace(index, request);
  return {
    formatVersion: TRACE_EXPORT_FORMAT_VERSION,
    modelVersion: TRACE_MODEL_VERSION,
    identity: index.identity,
    sourceKeys: index.sourceKeys,
    request: walk.request,
    rootFound: walk.rootFound,
    nodes: walk.nodes,
    steps: walk.steps,
    boundaries: walk.boundaries,
    unresolvedLinkCountInIndex: unresolvedTraceLinks(index).length,
  };
}

/** Convenience for callers holding a world rather than an index. */
export function exportTraceFromWorld(
  world: Parameters<typeof buildTraceIndex>[0],
  request: TraceWalkRequest,
): TraceExportDocument {
  return buildTraceExport(buildTraceIndex(world), request);
}

/** Machine-readable form. Trailing newline so the file is a well-formed text file. */
export function traceExportJson(exported: TraceExportDocument): string {
  return `${canonicalJson(exported)}\n`;
}

// ---------------------------------------------------------------------------
// Human-reviewable form
// ---------------------------------------------------------------------------

function cell(value: string | number | null): string {
  if (value === null) return "—";
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function shortId(id: EntityId): string {
  return `\`${id}\``;
}

function nodeHeading(node: TraceNode): string {
  return `${node.recordClass} · ${node.family} · ${node.id}`;
}

export function traceExportMarkdown(exported: TraceExportDocument): string {
  const lines: string[] = [];
  lines.push("# Causal trace");
  lines.push("");
  lines.push(
    "Development diagnostic. Every link below is a field the record itself carries; nothing here is inferred.",
  );
  lines.push("");

  lines.push("## Identity");
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("| --- | --- |");
  lines.push(`| Export format | ${cell(exported.formatVersion)} |`);
  lines.push(`| Trace model | ${cell(exported.modelVersion)} |`);
  lines.push(`| World | ${cell(exported.identity.worldId)} |`);
  lines.push(`| Seed | ${cell(exported.identity.seed)} |`);
  lines.push(`| Schema version | ${cell(exported.identity.schemaVersion)} |`);
  lines.push(
    `| Generator version | ${cell(exported.identity.generatorVersion)} |`,
  );
  lines.push(`| Started at | ${cell(exported.identity.startedAt)} |`);
  lines.push(`| Current date | ${cell(exported.identity.currentDate)} |`);
  lines.push(
    `| History frontier | ${cell(exported.identity.historyFrontier)} |`,
  );
  lines.push(
    `| World content id | ${cell(exported.identity.worldContentId)} |`,
  );
  lines.push("");

  lines.push("## Request");
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("| --- | --- |");
  lines.push(`| Root record | ${cell(exported.request.rootId)} |`);
  lines.push(`| Root found | ${cell(String(exported.rootFound))} |`);
  lines.push(`| Direction | ${cell(exported.request.direction)} |`);
  lines.push(`| Max depth | ${cell(exported.request.maxDepth)} |`);
  lines.push(
    `| Link kinds | ${cell(exported.request.linkKinds === null ? "all" : exported.request.linkKinds.join(", "))} |`,
  );
  lines.push(`| Registered sources | ${cell(exported.sourceKeys.length)} |`);
  lines.push(
    `| Unresolved links in index | ${cell(exported.unresolvedLinkCountInIndex)} |`,
  );
  lines.push("");

  lines.push(`## Records (${exported.nodes.length})`);
  lines.push("");
  if (exported.nodes.length === 0) {
    lines.push("No record matched this request.");
    lines.push("");
  } else {
    lines.push("| Sequence | Class | Origin | Family | Record | Stable key |");
    lines.push("| --- | --- | --- | --- | --- | --- |");
    for (const node of exported.nodes) {
      lines.push(
        `| ${cell(node.sequence)} | ${cell(node.recordClass)} | ${cell(node.truthOrigin)} | ${cell(node.family)} | ${shortId(node.id)} | ${cell(node.stableKey)} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Walk");
  lines.push("");
  lines.push("| Depth | Direction | Record | Via field | From |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const step of exported.steps) {
    lines.push(
      `| ${cell(step.depth)} | ${cell(step.direction)} | ${shortId(step.nodeId)} | ${cell(step.viaRole)} | ${step.fromNodeId === null ? "—" : shortId(step.fromNodeId)} |`,
    );
  }
  lines.push("");

  lines.push(`## Boundaries (${exported.boundaries.length})`);
  lines.push("");
  lines.push(
    "A boundary is where the trace stops. `no-recorded-link` and `unresolved-target` mean the repository recorded nothing further — the answer is UNKNOWN, not a missing parent this tool could supply.",
  );
  lines.push("");
  if (exported.boundaries.length === 0) {
    lines.push("The walk reached no boundary.");
    lines.push("");
  } else {
    lines.push("| Kind | Record | Direction | Field | Note |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const boundary of exported.boundaries) {
      lines.push(
        `| ${cell(boundary.kind)} | ${shortId(boundary.nodeId)} | ${cell(boundary.direction)} | ${cell(boundary.role)} | ${cell(boundary.note)} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Record detail");
  lines.push("");
  for (const node of exported.nodes) {
    lines.push(`### ${nodeHeading(node)}`);
    lines.push("");
    lines.push(`- Stable key: \`${node.stableKey}\``);
    lines.push(`- Source: \`${node.sourceKey}\``);
    lines.push(
      `- Sequence: ${node.sequence === null ? "not sequenced by the history store" : node.sequence}`,
    );
    lines.push(`- Occurred at: ${node.occurredAt ?? "UNKNOWN"}`);
    lines.push(`- Recorded at: ${node.recordedAt ?? "UNKNOWN"}`);
    lines.push(`- Truth origin: ${node.truthOrigin}`);
    lines.push(`- Development summary: ${node.developmentSummary}`);
    lines.push(
      `- Recorded text: ${node.recordText === null ? "UNKNOWN — the record carries none" : `"${node.recordText}"`}`,
    );
    if (node.entityRefs.length > 0) {
      lines.push("- Entities named by the record:");
      for (const ref of node.entityRefs) {
        lines.push(`  - \`${ref.role}\` → \`${ref.entityId}\``);
      }
    }
    if (node.links.length > 0) {
      lines.push("- Recorded links:");
      for (const link of node.links) {
        lines.push(`  - ${link.kind} \`${link.role}\` → \`${link.targetId}\``);
      }
    }
    if (node.unrecordedLinks.length > 0) {
      lines.push("- UNKNOWN / UNLINKED:");
      for (const unrecorded of node.unrecordedLinks) {
        lines.push(
          `  - ${unrecorded.kind} \`${unrecorded.role}\` — ${unrecorded.note}`,
        );
      }
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
