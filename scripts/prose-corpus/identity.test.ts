import { readFileSync, writeFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

import {
  allocationHistory,
  baselineOf,
  ledgerOf,
  type AllocationHistory,
} from "./anchor-history";
import {
  mintAnchors,
  resolveAnchors,
  revisionOf,
  contextRevisionOf,
  type ComputedAnchor,
} from "./anchors";
import {
  computedLiterals,
  extractComputedProse,
  type ComputedSurface,
} from "./sources/computed";

/**
 * The identity defect P125-REPAIR-02 reproduced, and the repair that closes it.
 *
 * Two sentences sharing their first eight words used to share a key, so
 * inserting one ahead of the other silently handed the first one's ID — and any
 * owner mark on it — to the second. Editing past the eighth word left the ID
 * alone, so an approval kept applying to text nobody had read.
 *
 * Every test here drives the REAL extractor over a labelled synthetic fixture,
 * not a reimplementation of the key function. The fixture is test data and is
 * restored after each case; nothing here touches production prose.
 */

const FIXTURE = "scripts/prose-corpus/fixtures/synthetic-computed-surface.ts";
const PRISTINE = readFileSync(FIXTURE, "utf8");

const SURFACE: ComputedSurface = {
  sourcePath: FIXTURE,
  domain: "narration",
  bank: "synthetic",
  symbols: ["recapSentence", "quietSentence", "steadyState"],
  surface: "thread-recap",
  reachability: "DEV_FIXTURE_ONLY",
  reachabilityReason: "Synthetic test data. No player reaches this module.",
  grounding: [{ key: "none", description: "synthetic fixture" }],
};

/**
 * Allocation history stated explicitly, the way the CLI states it.
 *
 * `mintAnchors` no longer defaults its history argument. These cases are about
 * text-to-anchor matching rather than allocation, so they carry the history
 * their own fixture implies and nothing more.
 */
function historyOf(anchors: readonly ComputedAnchor[]): AllocationHistory {
  const ledger = ledgerOf(anchors.map((anchor) => anchor.anchor));
  return allocationHistory(ledger, baselineOf(ledger.issued));
}

function mintFresh(): readonly ComputedAnchor[] {
  return mintAnchors(computedLiterals([SURFACE]), [], historyOf([])).anchors;
}

function recordsWith(anchors: readonly ComputedAnchor[]) {
  return extractComputedProse([SURFACE], anchors);
}

function edit(from: string, to: string): void {
  const next = PRISTINE.replace(from, to);
  if (next === PRISTINE) throw new Error(`fixture edit did not apply: ${from}`);
  writeFileSync(FIXTURE, next);
}

afterEach(() => {
  writeFileSync(FIXTURE, PRISTINE);
});

const A = "You meet with your old friend again after work.";
const B = "You meet with your old friend again after school.";

describe("same-prefix insertion cannot move an identity", () => {
  it("keeps A's semantic ID on A when B is inserted ahead of it", () => {
    const anchors = mintFresh();
    const before = recordsWith(anchors).records;
    const a = before.find((record) => record.text === A);
    expect(a).toBeDefined();

    // B now precedes A inside the same enclosing symbol. Under the old
    // eight-word slug this handed A's key to B.
    edit(
      `  if (which === 0) return "${A}";\n  return "${B}";`,
      `  if (which === 0) return "${B}";\n  return "${A}";`,
    );

    const after = recordsWith(anchors).records;
    const aAfter = after.find((record) => record.text === A);
    const atOldId = after.find((record) => record.id === a!.id);

    expect(aAfter?.id).toBe(a!.id);
    expect(atOldId?.text).toBe(A);
    expect(atOldId?.text).not.toBe(B);
  });

  it("gives the two same-prefix sentences different identities", () => {
    const records = recordsWith(mintFresh()).records;
    const a = records.find((record) => record.text === A);
    const b = records.find((record) => record.text === B);
    expect(a?.id).toBeDefined();
    expect(b?.id).toBeDefined();
    expect(a?.id).not.toBe(b?.id);
  });

  it("survives reordering unrelated sentences in the same symbol", () => {
    const anchors = mintFresh();
    const before = new Map(
      recordsWith(anchors).records.map((record) => [record.text, record.id]),
    );
    edit(
      `  if (which === 0) return "Nothing much happened that week.";\n  if (which === 1) return "Nothing much happened that week.";\n  return "The week went by without anything to decide.";`,
      `  if (which === 0) return "The week went by without anything to decide.";\n  if (which === 1) return "Nothing much happened that week.";\n  return "Nothing much happened that week.";`,
    );
    for (const record of recordsWith(anchors).records) {
      if (record.text === "Nothing much happened that week.") continue;
      expect(record.id).toBe(before.get(record.text));
    }
  });
});

describe("an edit past the eighth word cannot ride a stale approval", () => {
  it("refuses to resolve rather than silently keeping the old identity", () => {
    const anchors = mintFresh();
    edit("again after work.", "again after a long shift.");
    const extraction = recordsWith(anchors);

    expect(extraction.problems.map((problem) => problem.kind).sort()).toContain(
      "unmapped-site",
    );
    expect(extraction.problems.map((problem) => problem.kind)).toContain(
      "orphaned-anchor",
    );
    // The changed sentence must not appear under the old identity.
    expect(
      extraction.records.some((record) => record.text.includes("long shift")),
    ).toBe(false);
  });

  it("keeps the anchor but changes the text revision on a deliberate re-mint", () => {
    const anchors = mintFresh();
    const before = recordsWith(anchors).records.find(
      (record) => record.text === A,
    )!;

    edit("again after work.", "again after a long shift.");
    const remint = mintAnchors(
      computedLiterals([SURFACE]),
      anchors,
      historyOf(anchors),
    );
    expect(remint.refused).toStrictEqual([]);
    expect(remint.minted).toStrictEqual([]);
    expect(remint.rebound).toHaveLength(1);

    const after = recordsWith(remint.anchors).records.find((record) =>
      record.text.includes("long shift"),
    )!;
    expect(after.id).toBe(before.id);
    expect(after.textRevision).not.toBe(before.textRevision);
  });
});

describe("ambiguity fails closed", () => {
  it("refuses to rebind when two sentences change at once", () => {
    const anchors = mintFresh();
    writeFileSync(
      FIXTURE,
      PRISTINE.replace("again after work.", "again after the shift.").replace(
        "again after school.",
        "again after the lecture.",
      ),
    );
    const remint = mintAnchors(
      computedLiterals([SURFACE]),
      anchors,
      historyOf(anchors),
    );
    expect(remint.refused.length).toBeGreaterThan(0);
    expect(remint.rebound).toStrictEqual([]);
    // Nothing was invented for the ambiguous group.
    expect(remint.minted).toStrictEqual([]);
  });

  it("reports a brand-new site instead of adopting a free anchor", () => {
    const anchors = mintFresh();
    edit(
      `  return "${B}";`,
      `  if (which === 2) return "A sentence nobody has anchored yet.";\n  return "${B}";`,
    );
    const extraction = recordsWith(anchors);
    expect(
      extraction.problems.some((problem) => problem.kind === "unmapped-site"),
    ).toBe(true);
    expect(
      extraction.records.some((record) => record.text.includes("nobody has")),
    ).toBe(false);
  });

  it("refuses when a repeated literal's multiplicity changes", () => {
    const anchors = mintFresh();
    edit(`  if (which === 1) return "Nothing much happened that week.";\n`, "");
    const extraction = recordsWith(anchors);
    expect(
      extraction.problems.some(
        (problem) => problem.kind === "ambiguous-occurrence",
      ),
    ).toBe(true);
  });
});

describe("duplicate literals at distinct sites stay distinct", () => {
  it("keeps one anchor per site even when the text matches exactly", () => {
    const records = recordsWith(mintFresh()).records.filter(
      (record) => record.text === "Nothing much happened that week.",
    );
    expect(records).toHaveLength(2);
    expect(new Set(records.map((record) => record.id)).size).toBe(2);
  });

  it("refuses an exact anchor collision", () => {
    const duplicated: ComputedAnchor[] = [
      {
        anchor: "recapSentence-0001",
        sourcePath: FIXTURE,
        symbol: "recapSentence",
        text: A,
        occurrence: 0,
        textRevision: revisionOf(A),
      },
      {
        anchor: "recapSentence-0001",
        sourcePath: FIXTURE,
        symbol: "recapSentence",
        text: A,
        occurrence: 1,
        textRevision: revisionOf(A),
      },
    ];
    const resolution = resolveAnchors(computedLiterals([SURFACE]), duplicated);
    expect(
      resolution.problems.some(
        (problem) => problem.kind === "ambiguous-occurrence",
      ),
    ).toBe(true);
  });
});

describe("slot and context changes are versioned, not ignored", () => {
  it("changes the text revision when only a slot name changes", () => {
    const anchors = mintFresh();
    const before = recordsWith(anchors).records.find((record) =>
      record.text.includes("all through the spring"),
    )!;
    edit(
      "{self} kept the same routine all through the spring.",
      "{player} kept the same routine all through the spring.",
    );
    const remint = mintAnchors(
      computedLiterals([SURFACE]),
      anchors,
      historyOf(anchors),
    );
    const after = recordsWith(remint.anchors).records.find((record) =>
      record.text.includes("{player}"),
    )!;
    expect(after.id).toBe(before.id);
    expect(after.textRevision).not.toBe(before.textRevision);
    expect(after.slots).toStrictEqual(["player"]);
  });

  it("changes the context revision when the grounding changes", () => {
    const anchors = mintFresh();
    const before = recordsWith(anchors).records[0]!;
    const regrounded = extractComputedProse(
      [
        {
          ...SURFACE,
          grounding: [
            { key: "enrollment", description: "a canonical enrollment record" },
          ],
        },
      ],
      anchors,
    ).records[0]!;
    expect(regrounded.id).toBe(before.id);
    expect(regrounded.contextRevision).not.toBe(before.contextRevision);
  });

  it("orders the context digest independently of grounding order", () => {
    const one = contextRevisionOf([
      { key: "a", description: "first" },
      { key: "b", description: "second" },
    ]);
    const other = contextRevisionOf([
      { key: "b", description: "second" },
      { key: "a", description: "first" },
    ]);
    expect(one).toBe(other);
  });
});

describe("the committed sidecar matches the committed source", () => {
  it("resolves every production computed site with no problems", () => {
    const extraction = extractComputedProse();
    expect(extraction.problems).toStrictEqual([]);
    expect(extraction.records.length).toBeGreaterThan(0);
  });

  it("gives every production computed record an anchor-shaped key", () => {
    for (const record of extractComputedProse().records) {
      expect(record.stableKey).toMatch(/^[A-Za-z_][A-Za-z0-9_]*-\d{4}$/);
      expect(record.textRevision).toMatch(/^[0-9a-f]{12}$/);
      expect(record.contextRevision).toMatch(/^[0-9a-f]{12}$/);
    }
  });
});
