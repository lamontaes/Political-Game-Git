/**
 * A link whose effect arrives by a path the reading engine does not keep
 * (`readerGap` in data/research/outcome-web/links.json) still runs in the web,
 * but its outcome's readers leave it out. The coverage review gives employer
 * plans and Medicare only, so the Medicaid expansion and the work requirement
 * must not move employer plans; the job-loss link still does. The web keeps
 * both Medicaid effects on the uninsured share, which the graduation link
 * reads (scripts/outcome-web/effect-matrix.ts grades them through it).
 */
import { describe, expect, it } from "vitest";
import matrix from "../../docs/reports/effect-web-matrix-2026-10-20.json" with { type: "json" };
import {
  OUTCOME_WEB_MODULE_ID,
  WEB_LINKS,
  WIRED_INTO,
} from "./outcome-web-model";
import { webReach } from "./outcome-web-reach";
import type { CoreAPI } from "./types";

const MEASURE = "health.uninsured-pct";
const MEDICAID = [
  "medicaid-expansion-to-coverage",
  "work-requirement-to-coverage",
];

/** A core holding one web month row for one place, every link into the measure at the given effect. */
function withRow(effect: number): CoreAPI {
  const links = WIRED_INTO.get(MEASURE) ?? [];
  const row = {
    id: "web:place:2025-02",
    placeId: "place",
    month: "2025-02",
    bases: { [MEASURE]: 8 },
    effects: Object.fromEntries(links.map((link) => [link.key, effect])),
  };
  return {
    state: {
      modules: new Map([[OUTCOME_WEB_MODULE_ID, {}]]),
      date: "2025-02-03",
    },
    moduleState: () => ({ table: () => ({ query: () => [row] }) }),
  } as unknown as CoreAPI;
}

describe("a link its outcome's reader cannot apply", () => {
  it("is the two Medicaid links into the uninsured share, each saying why", () => {
    const gapped = WEB_LINKS.filter((link) => link.readerGap);
    expect(gapped.map((link) => link.key).sort()).toEqual([...MEDICAID].sort());
    for (const link of gapped) {
      expect(link.to).toBe(MEASURE);
      expect(link.readerGap).toMatch(/coverage review gives employer plans/);
      // The web still runs it, so the uninsured share it keeps moves.
      expect(WIRED_INTO.get(MEASURE)?.some((l) => l.key === link.key)).toBe(
        true,
      );
    }
  });

  it("is left out of the factor the coverage review reads, and the job-loss link is not", () => {
    const reach = webReach(withRow(0.1), "place", MEASURE, {
      age: 40,
      sex: "male",
    });
    const parts = reach.parts.map((part) => part.link);
    expect(parts).toContain("unemployment-to-uninsured");
    for (const key of MEDICAID) expect(parts).not.toContain(key);
    expect(reach.recordId).toBe("web:place:2025-02");
  });

  it("is graded through the next link, never through the reader that skips it", () => {
    for (const key of MEDICAID) {
      const link = matrix.links.find((row) => row.key === key)!;
      expect(link.points.reaches.evidence, key).not.toMatch(/coverage\.ts/);
      expect(link.points.reaches.evidence, key).toMatch(
        /^through uninsured-to-graduation: /,
      );
    }
  });
});
