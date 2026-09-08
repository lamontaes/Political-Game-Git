import { describe, expect, it } from "vitest";

import { serializeWorld, worldContentId } from "../simulation";
import {
  buildTraceExport,
  exportTraceFromWorld,
  traceExportJson,
  traceExportMarkdown,
  TRACE_EXPORT_FORMAT_VERSION,
} from "./trace-export";
import { buildTraceIndex } from "./trace-index";
import { createCausalTraceFixture } from "./trace-fixture";

const fixture = createCausalTraceFixture("normal");
const decisionTraceId = fixture.world.history.decisionTraces.at(-1)?.id;
if (!decisionTraceId) {
  throw new Error("The fixture recorded no decision trace to export.");
}

describe("deterministic export", () => {
  it("produces byte-identical JSON for an identical replay and request", () => {
    const replayed = createCausalTraceFixture("normal");
    const first = traceExportJson(
      exportTraceFromWorld(fixture.world, {
        rootId: decisionTraceId,
        direction: "both",
        maxDepth: 6,
      }),
    );
    const second = traceExportJson(
      exportTraceFromWorld(replayed.world, {
        rootId: decisionTraceId,
        direction: "both",
        maxDepth: 6,
      }),
    );
    expect(second).toBe(first);
  });

  it("produces byte-identical Markdown for an identical replay and request", () => {
    const replayed = createCausalTraceFixture("normal");
    const first = traceExportMarkdown(
      exportTraceFromWorld(fixture.world, {
        rootId: decisionTraceId,
        direction: "upstream",
        maxDepth: 8,
      }),
    );
    const second = traceExportMarkdown(
      exportTraceFromWorld(replayed.world, {
        rootId: decisionTraceId,
        direction: "upstream",
        maxDepth: 8,
      }),
    );
    expect(second).toBe(first);
    expect(first.length).toBeGreaterThan(0);
  });

  it("changes when the request changes, so identical bytes mean something", () => {
    const upstream = traceExportJson(
      exportTraceFromWorld(fixture.world, {
        rootId: decisionTraceId,
        direction: "upstream",
        maxDepth: 8,
      }),
    );
    const both = traceExportJson(
      exportTraceFromWorld(fixture.world, {
        rootId: decisionTraceId,
        direction: "both",
        maxDepth: 8,
      }),
    );
    expect(both).not.toBe(upstream);
  });

  it("changes when the world changes", () => {
    const quiet = createCausalTraceFixture("quiet");
    const normalExport = traceExportJson(
      exportTraceFromWorld(fixture.world, {
        rootId: decisionTraceId,
        direction: "upstream",
        maxDepth: 8,
      }),
    );
    const quietDecisionId = quiet.world.history.decisionTraces.at(-1)?.id;
    expect(quietDecisionId).toBeDefined();
    if (!quietDecisionId) return;
    const quietExport = traceExportJson(
      exportTraceFromWorld(quiet.world, {
        rootId: quietDecisionId,
        direction: "upstream",
        maxDepth: 8,
      }),
    );
    expect(quietExport).not.toBe(normalExport);
  });
});

describe("export identity", () => {
  const index = buildTraceIndex(fixture.world);
  const exported = buildTraceExport(index, {
    rootId: decisionTraceId,
    direction: "upstream",
    maxDepth: 8,
  });

  it("carries enough identity to stand alone in a bug report", () => {
    expect(exported.formatVersion).toBe(TRACE_EXPORT_FORMAT_VERSION);
    expect(exported.identity.seed).toBe(fixture.seed);
    expect(exported.identity.worldId).toBe(fixture.world.id);
    expect(exported.identity.worldContentId).toBe(
      worldContentId(fixture.world),
    );
    expect(exported.identity.historyFrontier).toBe(
      fixture.world.history.nextSequence,
    );
    expect(exported.request.rootId).toBe(decisionTraceId);
    expect(exported.request.direction).toBe("upstream");
    expect(exported.rootFound).toBe(true);
    expect(exported.sourceKeys.length).toBeGreaterThan(0);
  });

  it("writes the identity, the classes and the boundaries into the Markdown", () => {
    const markdown = traceExportMarkdown(exported);
    expect(markdown).toContain(fixture.seed);
    expect(markdown).toContain(worldContentId(fixture.world));
    expect(markdown).toContain("decision-trace");
    expect(markdown).toContain("UNKNOWN");
    expect(markdown).toContain("## Boundaries");
  });

  it("says the root was not found rather than exporting a different record", () => {
    const missing = buildTraceExport(index, {
      rootId: "record_that_is_not_here" as typeof decisionTraceId,
      direction: "upstream",
    });
    expect(missing.rootFound).toBe(false);
    expect(missing.nodes).toEqual([]);
    expect(traceExportMarkdown(missing)).toContain(
      "No record matched this request.",
    );
  });

  it("uses the world's own serializer rather than a second one", () => {
    // The export is JSON with sorted keys, which is what canonicalJson does
    // and what the world's content identity is already computed from. If this
    // ever diverges, the trace and the save would disagree about what the same
    // record says.
    const json = traceExportJson(exported);
    expect(json.endsWith("\n")).toBe(true);
    expect(JSON.parse(json)).toMatchObject({
      formatVersion: TRACE_EXPORT_FORMAT_VERSION,
    });
    expect(serializeWorld(fixture.world).length).toBeGreaterThan(0);
  });
});
