import { describe, expect, it } from "vitest";
import {
  OUTCOME_LINKS,
  OUTCOME_MEASURES,
  outcomeLinkStatus,
  outcomeWebStatus,
  shapedLinkFactor,
} from ".";

const SHAPES = new Set([
  "linear",
  "threshold",
  "diminishing",
  "exposure-years",
  "acute-decay",
]);
const EVIDENCE = new Set([
  "researched",
  "provisional",
  "contested",
  "about-zero",
  "to-confirm",
]);
const OWNERS = new Set(["M", "F", "O", "B", "C", "G"]);

describe("the outcome web table", () => {
  it("every link is complete: cause, outcome, strength, shape, owner, evidence and a source", () => {
    const keys = new Set<string>();
    for (const link of OUTCOME_LINKS) {
      expect(keys.has(link.key), link.key).toBe(false);
      keys.add(link.key);
      expect(link.from, link.key).not.toBe(link.to);
      expect(SHAPES.has(link.shape.kind), link.key).toBe(true);
      expect(EVIDENCE.has(link.evidence), link.key).toBe(true);
      expect(OWNERS.has(link.owner), link.key).toBe(true);
      expect(link.anchor.length, link.key).toBeGreaterThan(0);
      expect(link.source.length, link.key).toBeGreaterThan(0);
      expect(link.group.length, link.key).toBeGreaterThan(0);
      expect(link.lagMonths, link.key).toBeGreaterThanOrEqual(0);
    }
  });

  it("no cause and outcome pair is carried twice, so nothing is double counted", () => {
    const pairs = new Set<string>();
    for (const link of OUTCOME_LINKS) {
      const pair = `${link.from}->${link.to}`;
      expect(pairs.has(pair), pair).toBe(false);
      pairs.add(pair);
    }
  });

  it("an about-zero link is zero on purpose: its size is 0 and it never moves its outcome", () => {
    const aboutZero = OUTCOME_LINKS.filter(
      (link) => link.evidence === "about-zero",
    );
    // The research's about-zero list: voter ID, home internet, work
    // requirements, prison growth, pretrial detention, the child tax credit on
    // births, vote-by-mail on party share, incentives on broad growth, and more.
    expect(aboutZero.length).toBeGreaterThanOrEqual(9);
    for (const link of aboutZero) {
      expect(link.size, link.key).toBe(0);
      expect(link.strength, link.key).toBe("about-zero");
      expect(outcomeLinkStatus(link), link.key).toBe("about-zero");
      for (const value of [-10, 0, 3, 50]) {
        expect(shapedLinkFactor(link, value, 0), link.key).toBe(1);
      }
    }
  });

  it("every area has links, and every link says whether it acts today and why not", () => {
    const owners = new Set(OUTCOME_LINKS.map((link) => link.owner));
    for (const owner of ["M", "F", "O", "B", "C"]) {
      expect(owners.has(owner), owner).toBe(true);
    }
    const status = outcomeWebStatus();
    expect(status.length).toBe(OUTCOME_LINKS.length);
    const built = status.filter((row) => row.status === "built");
    // Unemployment is recorded, so its links into crime act today.
    expect(built.map((row) => row.key)).toEqual(
      expect.arrayContaining([
        "unemployment-to-burglary",
        "unemployment-to-assault",
        // Births read the web too: unemployment nine months earlier.
        "unemployment-to-births",
      ]),
    );
    for (const row of built) {
      expect(OUTCOME_MEASURES[row.from], row.key).toBeDefined();
    }
  });
});

describe("link shapes", () => {
  it("linear moves the outcome by size per unit from the baseline, both ways", () => {
    const link = { shape: { kind: "linear" as const }, size: 0.03 };
    expect(shapedLinkFactor(link, 7, 4)).toBeCloseTo(1.09, 10);
    expect(shapedLinkFactor(link, 3, 4)).toBeCloseTo(0.97, 10);
    expect(shapedLinkFactor(link, 4, 4)).toBe(1);
  });

  it("a threshold does nothing until it is passed, then climbs faster past a second one", () => {
    const link = {
      shape: {
        kind: "threshold" as const,
        at: 22,
        steeperAt: 32,
        steeperExtraSize: 0.02,
      },
      size: 0.01,
    };
    expect(shapedLinkFactor(link, 20, 0)).toBe(1);
    expect(shapedLinkFactor(link, 30, 0)).toBeCloseTo(1.08, 10);
    // Past 32 each point counts three times as much as between 22 and 32.
    const at35 = shapedLinkFactor(link, 35, 0);
    const at34 = shapedLinkFactor(link, 34, 0);
    const at25 = shapedLinkFactor(link, 25, 0);
    const at24 = shapedLinkFactor(link, 24, 0);
    expect((at35 - at34) / (at25 - at24)).toBeCloseTo(3, 10);
  });

  it("diminishing returns: each further unit counts for less and the effect is bounded", () => {
    const link = {
      shape: { kind: "diminishing" as const, scale: 1 },
      size: -0.34,
    };
    const one = 1 - shapedLinkFactor(link, 1, 0);
    const two = 1 - shapedLinkFactor(link, 2, 0);
    const far = 1 - shapedLinkFactor(link, 1000, 0);
    expect(two - one).toBeLessThan(one);
    expect(far).toBeLessThan(0.34 + 1e-9);
  });

  it("person-level shapes never move a place's rate", () => {
    for (const kind of ["exposure-years", "acute-decay"] as const) {
      const shape =
        kind === "acute-decay" ? { kind, halfLifeDays: 7 } : { kind };
      expect(shapedLinkFactor({ shape, size: 0.5 }, 9, 0)).toBe(1);
    }
  });
});
