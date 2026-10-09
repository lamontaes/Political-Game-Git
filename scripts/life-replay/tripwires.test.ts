import { describe, expect, it } from "vitest";
import { parameterProblems } from "./parameters";
import {
  blockedStopgap,
  registryProblems,
  releaseProblems,
  replayTripwires,
  sourceProblems,
  stopgap,
} from "./tripwires";
import type { StopgapEntry } from "./tripwires";

const entry: StopgapEntry = {
  id: "SG-TEST",
  kind: "assumed-data",
  file: "core.ts",
  line: 1,
  whatItFakes: "Missing household resources",
  why: "Temporary experiment",
  who: "test",
  when: "2026-10-09",
  replacement: "Sourced household resources",
  status: "open",
};

describe("stopgap tripwires", () => {
  it("rejects an unregistered execution path", () => {
    expect(() => stopgap("SG-UNKNOWN", () => undefined)).toThrow(
      "Unregistered",
    );
    expect(
      registryProblems([], new Map([["core.ts", "stopgap('SG-TEST', sink);"]])),
    ).toContain("SG-TEST: marker has no registry entry");
  });
  it("checks the exact file and line and refuses stale or duplicate entries", () => {
    const sources = new Map([["core.ts", "stopgap('SG-TEST', sink);"]]);
    expect(registryProblems([entry], sources)).toEqual([]);
    expect(registryProblems([{ ...entry, line: 2 }], sources)).toContain(
      "SG-TEST: stale entry; no marker at the registered file and line",
    );
    expect(registryProblems([entry, entry], sources)).toContain(
      "SG-TEST: duplicate registry entry",
    );
    expect(
      registryProblems([{ ...entry, status: "replaced" }], sources),
    ).toContain("SG-TEST: replaced entry still has an active marker");
  });
  it("blocks release with a plain reason for every open entry", () => {
    const second = { ...entry, id: "SG-OTHER", kind: "player-text" };
    expect(releaseProblems([entry, second])).toEqual([
      blockedStopgap(entry),
      blockedStopgap(second),
    ]);
    expect(releaseProblems([{ ...entry, status: "replaced" }])).toEqual([]);
  });
  it("detects numeric constants, authored options, and player rendering", () => {
    expect(sourceProblems("core.ts", "const score = 0.25;")).toHaveLength(1);
    expect(
      sourceProblems("core.ts", 'const x = { options: ["win"] };'),
    ).toHaveLength(1);
    expect(sourceProblems("core.tsx", "const x = <p>Words</p>;")).not.toEqual(
      [],
    );
    expect(sourceProblems("core.ts", 'renderPlayerText("Words");')).not.toEqual(
      [],
    );
  });
  it("checks sourced, estimated, and tunable parameters against their inputs", () => {
    expect(
      parameterProblems({ x: { value: 1, tag: "SOURCED", purpose: "test" } }),
    ).not.toEqual([]);
    expect(
      parameterProblems({
        x: {
          value: 1,
          tag: "ESTIMATED",
          purpose: "test",
          estimatedFrom: "study",
          inputData: [1],
        },
      }),
    ).toEqual([]);
    expect(
      parameterProblems({
        x: {
          value: 10,
          tag: "TUNABLE",
          purpose: "test",
          realSpread: { minimum: 1, maximum: 5, citation: "study" },
        },
      }),
    ).not.toEqual([]);
  });
  it("keeps the checked-in diagnostic code and player import boundary clean", () => {
    expect(replayTripwires(process.cwd(), true)).toEqual([]);
  });
});
