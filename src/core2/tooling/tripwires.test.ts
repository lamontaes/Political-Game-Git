import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  assertReleaseReady,
  auditCore2Tripwires,
  countOpenStopgaps,
  reportOpenStopgapCount,
  runTripwiresCli,
  type StopgapEntry,
} from "./tripwires";
import { auditCheckRangeCoverage } from "./calibration-guard";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("P8 release tripwires", () => {
  it("accepts a registered source marker and reports the open count", () => {
    const marker = stopgapEntry("SG-P8-001", "src/core2/model.ts", 1);
    const root = fixtureRoot({
      sourceFiles: {
        "src/core2/model.ts":
          'stopgap("SG-P8-001");\nexport const eventKind = "work.completed";\n',
      },
      stopgaps: [marker],
    });

    const audit = auditCore2Tripwires(root);
    expect(audit.diagnostics).toEqual([]);
    expect(audit.openStopgapCount).toBe(1);
    expect(countOpenStopgaps([marker])).toBe(1);

    const write = vi.fn();
    expect(reportOpenStopgapCount([marker], write)).toBe(1);
    expect(write).toHaveBeenCalledWith("Open stopgap count: 1");
    expect(() => assertReleaseReady([marker])).toThrow(
      /Blocked: SG-P8-001, Temporary wage estimate.*Replace with a sourced payroll table/,
    );
  });

  it("keeps open stopgaps informational by default and blocks explicit release mode", () => {
    const marker = stopgapEntry("SG-P8-CLI", "src/core2/model.ts", 1);
    const root = fixtureRoot({
      sourceFiles: {
        "src/core2/model.ts": 'stopgap("SG-P8-CLI");\n',
      },
      stopgaps: [marker],
    });
    const write = vi.fn();
    const writeError = vi.fn();

    expect(runTripwiresCli(root, { write, writeError })).toBe(0);
    expect(write).toHaveBeenCalledWith("Open stopgap count: 1");
    expect(writeError).not.toHaveBeenCalled();

    expect(runTripwiresCli(root, { release: true, write, writeError })).toBe(1);
    expect(writeError).toHaveBeenCalledWith(
      expect.stringContaining("Blocked: SG-P8-CLI"),
    );
  });

  it("finds both unregistered markers and registry rows whose markers went stale", () => {
    const stale = stopgapEntry("SG-P8-OLD", "src/core2/old.ts", 3);
    const root = fixtureRoot({
      sourceFiles: {
        "src/core2/model.ts": 'stopgap("SG-P8-NEW");\n',
      },
      stopgaps: [stale],
    });

    const codes = auditCore2Tripwires(root).diagnostics.map((row) => row.code);
    expect(codes).toContain("unregistered-source-marker");
    expect(codes).toContain("stale-stopgap-entry");
  });

  it("requires a ledger location to match the marker's actual line", () => {
    const entry = stopgapEntry("SG-P8-002", "src/core2/model.ts", 1);
    const root = fixtureRoot({
      sourceFiles: {
        "src/core2/model.ts": '\nstopgap("SG-P8-002");\n',
      },
      stopgaps: [entry],
    });

    const diagnostic = auditCore2Tripwires(root).diagnostics.find(
      (row) => row.code === "stopgap-location-mismatch",
    );
    expect(diagnostic).toMatchObject({
      file: "src/core2/model.ts",
      line: 2,
    });
  });

  it("distinguishes literal markers from data-driven stopgap lookups", () => {
    const root = fixtureRoot({
      sourceFiles: {
        "src/core2/model.ts": [
          "const lookup = (id: string) => stopgap(id);",
          "const forwarded = { stopgapId: row.stopgapId };",
        ].join("\n"),
      },
    });
    expect(auditCore2Tripwires(root).diagnostics).toEqual([]);

    const malformed = fixtureRoot({
      sourceFiles: { "src/core2/model.ts": 'stopgap("SG_bad");\n' },
    });
    expect(
      auditCore2Tripwires(malformed).diagnostics.map((row) => row.code),
    ).toContain("malformed-stopgap-marker");
  });

  it("checks data-row markers and permits action data in JSON registries", () => {
    const entry = stopgapEntry(
      "SG-P8-param-restEffect",
      "src/core2/data/content.json",
      5,
    );
    const root = fixtureRoot({
      sourceFiles: {
        "src/core2/model.ts":
          'stopgap("SG-P8-param-restEffect");\nconst row = { stopgapId: "SG-P8-param-restEffect" };\n',
      },
      stopgaps: [entry],
      dataFiles: {
        "src/core2/data/content.json": `{
  "actions": [
    {
      "id": "earn",
      "stopgapId": "SG-P8-param-restEffect"
    }
  ]
}`,
      },
    });

    expect(auditCore2Tripwires(root).diagnostics).toEqual([]);
  });

  it("rejects numeric literals in production core but excludes tests, fixtures, and tooling", () => {
    const root = fixtureRoot({
      sourceFiles: {
        "src/core2/model.ts": "export const dailyLimit = 7;\n",
        "src/core2/model.test.ts": "export const fixtureLimit = 8;\n",
        "src/core2/fixtures/model.ts": "export const fixtureLimit = 9;\n",
        "src/core2/tooling/example.ts": "export const toolExitCode = 1;\n",
      },
    });

    const diagnostics = auditCore2Tripwires(root).diagnostics;
    expect(diagnostics.filter((row) => row.code === "numeric-literal")).toEqual(
      [
        expect.objectContaining({
          file: "src/core2/model.ts",
          line: 1,
        }),
      ],
    );
  });

  it("allows developer diagnostics and trace or provenance names", () => {
    const root = fixtureRoot({
      sourceFiles: {
        "src/core2/model.ts": [
          'const eventKind = "work.completed";',
          'const reasonKey = "calendar:missing-weekday";',
          'const sourceFactId = "source-fact:recorded-wage";',
          'function invalidInput(): never { throw new Error("The input date must be a valid UTC date."); }',
          "void [eventKind, reasonKey, sourceFactId, invalidInput];",
        ].join("\n"),
      },
    });

    expect(auditCore2Tripwires(root).diagnostics).toEqual([]);
  });

  it("keeps player-facing copy and authored situation/options data out of TypeScript", () => {
    const root = fixtureRoot({
      sourceFiles: {
        "src/core2/model.ts": [
          'const event = { kind: "work.completed", sourceEventId: "event:pay" };',
          'const notice = { playerText: "Your pay arrived." };',
          "const narration = `The meeting began.`;",
          'const options = [{ id: "join", label: "Join the meeting" }];',
          'const home = { label: realName ?? "Home" };',
          'const action = { id: "work", actKinds: ["follow-rules"], goalKinds: ["earn"], targetKind: "job", effect: "paid-work" };',
          'const registryRow = { id: "weekly", cadence: "days", intervalParameter: "daysPerWeek" };',
          "void [event, notice, narration, options, home, action, registryRow];",
        ].join("\n"),
      },
    });

    const codes = auditCore2Tripwires(root).diagnostics.map((row) => row.code);
    expect(codes).toContain("player-text-literal");
    expect(codes).toContain("inline-content-registry");
    expect(codes).toContain("inline-action-definition");
    expect(codes).not.toContain("numeric-literal");
  });

  it("admits empty runtime result containers while rejecting authored definitions", () => {
    const empty = fixtureRoot({
      sourceFiles: {
        "src/core2/runtime.ts":
          "const needValues = {}; const actionResults = []; void [needValues, actionResults];",
      },
    });
    expect(auditCore2Tripwires(empty).diagnostics).toEqual([]);
    const authored = fixtureRoot({
      sourceFiles: {
        "src/core2/runtime.ts":
          'const needs = { money: "authored-need" }; const actions = ["authored-action"]; void [needs, actions];',
      },
    });
    expect(
      auditCore2Tripwires(authored).diagnostics.filter(
        (row) => row.code === "inline-content-registry",
      ),
    ).toHaveLength(2);
  });

  it("rejects TypeScript branches on IDs held in content registries", () => {
    const root = fixtureRoot({
      sourceFiles: {
        "src/core2/model.ts": [
          'switch (action.id) { case "work-shift": break; }',
          'if (need.id === "money") useNeed(need);',
        ].join("\n"),
      },
      dataFiles: {
        "src/core2/data/content.json": JSON.stringify({
          actions: [{ id: "work-shift" }],
          needs: [{ id: "money" }],
        }),
      },
    });

    const diagnostics = auditCore2Tripwires(root).diagnostics;
    expect(
      diagnostics.filter((row) => row.code === "inline-content-switch"),
    ).toHaveLength(2);
  });

  it("rejects numeric material outside parameter values and metadata rows that contain content", () => {
    const root = fixtureRoot({
      parameters: {
        schemaVersion: 2,
        values: {
          wageFloor: {
            value: 12,
            tag: "SOURCED",
            citation: "Fixture source.",
            options: ["not parameter data"],
          },
        },
      },
    });

    const codes = auditCore2Tripwires(root).diagnostics.map((row) => row.code);
    expect(codes).toContain("parameter-row-shape");
    expect(codes).toContain("parameter-numeric-outside-value");
    expect(codes).toContain("parameter-content-field");
  });

  it("requires every estimated numeric parameter to stay tied to a stopgap", () => {
    const root = fixtureRoot({
      parameters: {
        openingReserve: {
          value: 6,
          tag: "ESTIMATED",
          estimatedFrom: "A provisional fixture estimate.",
          citation: "Fixture source.",
        },
      },
    });

    expect(
      auditCore2Tripwires(root).diagnostics.map((row) => row.code),
    ).toContain("parameter-estimate-stopgap");
  });

  it("validates numeric spreads as source-backed bounds with no extra fields", () => {
    const valid = fixtureRoot({
      parameters: {
        sourcedQuantity: {
          value: 4,
          tag: "SOURCED",
          citation: "Fixture source.",
          spread: {
            low: 1,
            high: 8,
            unit: "fixture units",
            citation: "Fixture range source.",
          },
        },
      },
    });
    expect(auditCore2Tripwires(valid).diagnostics).toEqual([]);

    const extraField = fixtureRoot({
      parameters: {
        sourcedQuantity: {
          value: 4,
          tag: "SOURCED",
          citation: "Fixture source.",
          spread: {
            low: 1,
            high: 8,
            unit: "fixture units",
            citation: "Fixture range source.",
            note: "unverified",
          },
        },
      },
    });
    expect(
      auditCore2Tripwires(extraField).diagnostics.map((row) => row.code),
    ).toContain("parameter-spread-shape");
  });

  it("validates generic target references separately from measured calibration", () => {
    const targetId = "P9-FIXTURE-OUTCOME";
    const root = fixtureRoot({
      parameters: {
        fixtureWeight: {
          value: 0,
          tag: "TUNABLE",
          citation: "Fixture metadata, not an empirical estimate.",
          spread: { status: "unmeasured", reason: "No bound in this fixture." },
          checkRange: { ref: targetId },
        },
      },
      calibrationCatalog: {
        sourceRevision: "abcdef12",
        p9SourceFiles: {
          "data/life-replay/lives/fixture.json": "a".repeat(40),
        },
        targets: [
          {
            id: targetId,
            revision: "abcdef12",
            sourceFiles: {
              "data/life-replay/lives/fixture.json": "a".repeat(40),
            },
            observations: [
              {
                lifeId: "fixture-life",
                stepId: "fixture-result",
                kind: "outcome",
                dateWindow: { earliest: "2021-01-01", latest: "2021-01-01" },
                sourceRefs: ["fixture-source"],
                sources: [
                  {
                    id: "fixture-source",
                    title: "Fixture source",
                    publisher: "Fixture publisher",
                    url: "https://example.invalid/fixture",
                  },
                ],
                checks: [
                  { metric: "fixture.status", expectedValue: "recorded" },
                ],
                ranges: [],
              },
            ],
            testRoute: {
              commandTemplate: null,
              evaluationContract: "Fixture only; no real replay route.",
            },
            calibrationStatus: "blocked; fixture route is absent",
          },
        ],
        parameterBindings: [
          {
            parameter: "fixtureWeight",
            checkRange: { ref: targetId },
            mappingStatus: "fixture contract only",
          },
        ],
      },
    });

    const audit = auditCore2Tripwires(root);
    expect(audit.calibration.blockers.map((row) => row.code)).toContain(
      "calibration-target-route-missing",
    );
    expect(audit.calibration.targetReferenceCount).toBe(1);
    expect(audit.calibration.empiricalCalibrationPass).toBe(false);
    expect(audit.calibration.blockerCount).toBeGreaterThan(0);
  });

  it("rejects inline target facts and unregistered or missing checkRange refs", () => {
    const catalog = {
      sourceRevision: "abcdef12",
      p9SourceFiles: { "data/life-replay/lives/fixture.json": "a".repeat(40) },
      targets: [],
      parameterBindings: [],
    };
    const extra = auditCheckRangeCoverage(
      {
        tune: {
          value: 0,
          tag: "TUNABLE",
          citation: "Fixture.",
          spread: { status: "unmeasured", reason: "No bound." },
          checkRange: {
            ref: "P9-NOT-REGISTERED",
            expectedValue: "future fact",
          },
        },
      },
      catalog,
    );
    expect(extra.diagnostics.map((row) => row.code)).toContain(
      "checkrange-shape",
    );

    const missing = auditCheckRangeCoverage(
      {
        tune: {
          value: 0,
          tag: "TUNABLE",
          citation: "Fixture.",
          spread: { status: "unmeasured", reason: "No bound." },
        },
      },
      catalog,
    );
    expect(missing.diagnostics.map((row) => row.code)).toContain(
      "checkrange-shape",
    );
  });

  it("allows resolved records but blocks release with plain explanations for every open one", () => {
    const resolved = stopgapEntry(
      "SG-P8-RESOLVED",
      "src/core2/old.ts",
      1,
      "resolved",
    );
    const open = stopgapEntry("SG-P8-OPEN", "src/core2/new.ts", 2);
    expect(countOpenStopgaps([resolved, open])).toBe(1);
    expect(() => assertReleaseReady([resolved, open])).toThrow(
      /Blocked: SG-P8-OPEN, Temporary wage estimate.*Replace with a sourced payroll table/,
    );
    expect(() => assertReleaseReady([resolved])).not.toThrow();
  });
});

interface FixtureOptions {
  readonly sourceFiles?: Readonly<Record<string, string>>;
  readonly dataFiles?: Readonly<Record<string, string>>;
  readonly stopgaps?: readonly StopgapEntry[];
  readonly parameters?: unknown;
  readonly calibrationCatalog?: unknown;
}

function fixtureRoot(options: FixtureOptions = {}): string {
  const root = mkdtempSync(join(tmpdir(), "p8-core-tripwire-fixture-"));
  temporaryRoots.push(root);
  const parameterTable = options.parameters ?? {
    zero: { value: 0, tag: "SOURCED", citation: "Arithmetic fixture." },
  };
  const parameterSource = JSON.stringify(parameterTable, null, 2);
  const defaultCatalog = {
    sourceRevision: "abcdef12",
    p9SourceFiles: {
      "data/life-replay/lives/fixture.json": "a".repeat(40),
    },
    targets: [],
    parameterBindings: [],
  };
  const suppliedCatalog = options.calibrationCatalog;
  const catalogBase =
    suppliedCatalog !== null &&
    typeof suppliedCatalog === "object" &&
    !Array.isArray(suppliedCatalog)
      ? (suppliedCatalog as Record<string, unknown>)
      : defaultCatalog;
  const calibrationCatalog = {
    ...catalogBase,
    p8ParameterPreimage: {
      path: "src/core2/data/parameters.json",
      sha256: createHash("sha256")
        .update(parameterSource, "utf8")
        .digest("hex"),
    },
  };
  writeFixtureFile(
    root,
    "src/core2/data/stopgaps.json",
    JSON.stringify(options.stopgaps ?? [], null, 2),
  );
  writeFixtureFile(root, "src/core2/data/parameters.json", parameterSource);
  writeFixtureFile(
    root,
    "src/core2/tooling/calibration-targets.json",
    JSON.stringify(calibrationCatalog, null, 2),
  );
  for (const [file, content] of Object.entries(options.sourceFiles ?? {})) {
    writeFixtureFile(root, file, content);
  }
  for (const [file, content] of Object.entries(options.dataFiles ?? {})) {
    writeFixtureFile(root, file, content);
  }
  if (!options.sourceFiles || Object.keys(options.sourceFiles).length === 0) {
    writeFixtureFile(
      root,
      "src/core2/model.ts",
      'export const eventKind = "work.completed";\n',
    );
  }
  return root;
}

function writeFixtureFile(root: string, file: string, content: string): void {
  const filePath = join(root, file);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf8");
}

function stopgapEntry(
  id: string,
  file: string,
  line: number,
  status: "open" | "resolved" = "open",
): StopgapEntry {
  return {
    id,
    kind: "estimated-cash",
    file,
    line,
    whatItFakes: "Temporary wage estimate",
    why: "The fixture has no funded payroll source yet.",
    addedBy: "test fixture",
    addedAt: "2026-10-09",
    replacement: "a sourced payroll table",
    status,
  };
}
