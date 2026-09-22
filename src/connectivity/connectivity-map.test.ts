import { describe, expect, it } from "vitest";

import {
  combinationOf,
  droppedEntryIds,
  renderConnectivityMap,
  renderedEntryIds,
  validateConnectivityEntries,
  type ConnectivityEntry,
} from "./connectivity-map";

function entry(over: Partial<ConnectivityEntry> = {}): ConnectivityEntry {
  return {
    mapVersion: "connectivity-map/v1",
    entryId: "budgets",
    title: "Budgets",
    system: { present: true, detail: "A model underneath, and real numbers." },
    surface: { present: true, detail: "A page showing them." },
    control: {
      present: false,
      detail: "Nothing moves them, and the page says so in its own words.",
    },
    declaredInContent: false,
    playerReach: "does-not-reach",
    playerReachDetail: "A player can read a budget and cannot touch it.",
    measurements: [
      {
        what: "The budget page and what it declares about itself",
        found: "System and numbers present, no control.",
        at: "main at 1c4992e8",
      },
    ],
    measuredBy: "hardcoded-content audit",
    reMeasuredByPublisher: false,
    recordedAt: "2026-09-22T16:00:00.000Z",
    ...over,
  };
}

function codes(entries: readonly ConnectivityEntry[]) {
  return validateConnectivityEntries(entries).findings.map((f) => f.code);
}

describe("the eight combinations", () => {
  it("separates a subject that is only a name from one that is nothing", () => {
    const bare = {
      system: { present: false, detail: "No model." },
      surface: { present: false, detail: "No screen." },
      control: { present: false, detail: "None." },
    };
    expect(combinationOf(entry({ ...bare }))).toBe("nothing");
    expect(
      combinationOf(
        entry({
          ...bare,
          declaredInContent: true,
          declaredDetail: "The shipped pack declares a health domain.",
        }),
      ),
    ).toBe("named-only");
  });

  it("reads budgets as a system a player can see and cannot touch", () => {
    expect(combinationOf(entry())).toBe("no-control");
  });
});

describe("what it refuses", () => {
  it("refuses an entry with no measurement, because that is an opinion", () => {
    expect(codes([entry({ measurements: [] })])).toContain("no-measurement");
  });

  it("refuses a measurement that names no tree", () => {
    // A claim travels further than its measurement. One with no tree cannot
    // be rechecked, and an unrecheckable claim costs the document its credit.
    expect(
      codes([
        entry({
          measurements: [{ what: "I looked", found: "Nothing there", at: "" }],
        }),
      ]),
    ).toContain("unanchored-measurement");
  });

  it("requires the detail even when the part is absent", () => {
    expect(
      codes([entry({ system: { present: false, detail: "  " } })]),
    ).toContain("bad-system");
  });

  it("refuses a declared subject that does not say where it is declared", () => {
    expect(codes([entry({ declaredInContent: true })])).toContain(
      "undeclared-declaration",
    );
  });

  it("accepts a complete entry", () => {
    expect(codes([entry()])).toEqual([]);
  });
});

describe("the rendered map", () => {
  it("opens with the entry that says it opens the document, and does not repeat it", () => {
    const document = renderConnectivityMap(
      [
        entry(),
        entry({
          entryId: "who-lives-in-the-world",
          title: "Who lives in the world",
          surface: { present: false, detail: "No screen reports it." },
          opensTheDocument: "Every other entry turns on this one.",
        }),
      ],
      "2026-09-22T16:00:00.000Z",
    );
    expect(document).toContain("## Start here");
    expect(document.indexOf("### Who lives in the world")).toBeLessThan(
      document.indexOf("### Budgets"),
    );
    expect(document.split("### Who lives in the world").length - 1).toBe(1);
  });

  it("marks a reading the publishing lane did not re-measure", () => {
    expect(
      renderConnectivityMap([entry()], "2026-09-22T00:00:00.000Z"),
    ).toContain("**Carried, not re-measured here.**");
    expect(
      renderConnectivityMap(
        [entry({ reMeasuredByPublisher: true })],
        "2026-09-22T00:00:00.000Z",
      ),
    ).not.toContain("Carried, not re-measured here");
  });

  it("lists every subject it contains, so a missing one is visible", () => {
    const document = renderConnectivityMap(
      [entry({ entryId: "budgets" }), entry({ entryId: "healthcare" })],
      "2026-09-22T00:00:00.000Z",
    );
    expect([...renderedEntryIds(document)].sort()).toEqual([
      "budgets",
      "healthcare",
    ]);
  });

  it("sees a subject this branch does not hold as a drop", () => {
    const previous = renderConnectivityMap(
      [entry({ entryId: "budgets" }), entry({ entryId: "healthcare" })],
      "2026-09-22T00:00:00.000Z",
    );
    expect(droppedEntryIds(previous, [entry({ entryId: "budgets" })])).toEqual([
      "healthcare",
    ]);
  });
});

describe("a subject the game makes in two places", () => {
  const twoProducers = {
    producers: [
      {
        path: "src/simulation/governing/program-families.ts",
        at: "main at 7e011a42",
        reachedByPlay: "reaches" as const,
        reachDetail: "Walked: a Colorado governor's first-year agenda.",
      },
      {
        path: "src/simulation/legislation-program-families.ts",
        at: "main at 7e011a42",
        reachedByPlay: "not-walked" as const,
        reachDetail: "Nobody has walked this one yet.",
      },
    ],
    kind: "coverage" as const,
    playerVisible: true,
    visibilityDetail: "A governor is offered 13 subjects, a legislator 20.",
  };

  it("accepts two anchored producers", () => {
    expect(codes([entry({ duplication: twoProducers })])).toEqual([]);
  });

  it("refuses a duplication with one producer", () => {
    expect(
      codes([
        entry({
          duplication: {
            ...twoProducers,
            producers: [twoProducers.producers[0]!],
          },
        }),
      ]),
    ).toEqual(["single-producer"]);
  });

  it("refuses a producer read at no named tree", () => {
    expect(
      codes([
        entry({
          duplication: {
            ...twoProducers,
            producers: [
              twoProducers.producers[0]!,
              { ...twoProducers.producers[1]!, at: " " },
            ],
          },
        }),
      ]),
    ).toEqual(["unanchored-producer"]);
  });

  it("refuses a disagreement kind or visibility it cannot read", () => {
    expect(
      codes([
        entry({
          duplication: {
            ...twoProducers,
            kind: "vibes" as never,
            visibilityDetail: "",
          },
        }),
      ]),
    ).toEqual(["unknown-disagreement", "missing-visibility"]);
  });

  it("says an unwalked producer is unknown, never unreached", () => {
    const document = renderConnectivityMap(
      [entry({ duplication: twoProducers })],
      "2026-09-22T00:00:00.000Z",
    );
    expect(document).toContain("**Made in 2 places.**");
    expect(document).toContain(
      "`src/simulation/legislation-program-families.ts` at main at 7e011a42: not walked, so whether a player reaches it is not known.",
    );
    expect(document).not.toMatch(
      /legislation-program-families\.ts` at main at 7e011a42: a player does not reach it/,
    );
  });

  it("renders nothing extra for an entry with one producer", () => {
    expect(
      renderConnectivityMap([entry()], "2026-09-22T00:00:00.000Z"),
    ).not.toContain("Made in");
  });
});
