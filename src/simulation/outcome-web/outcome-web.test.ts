import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { lawInForceAtStart } from "../governing/law-in-force";
import { stateJurisdictionForKey } from "../life-places";
import { STATES } from "../state-reference";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import {
  drawnLinkSize,
  OUTCOME_LINKS,
  OUTCOME_WEB_CALIBRATED_AT,
  OUTCOMES_PRODUCED,
  outcomeFactor,
  outcomeLinkStatus,
  outcomeMeasure,
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
const OWNERS = new Set(["M", "F", "O", "B", "C", "G", "F-cloud"]);

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
      expect(outcomeMeasure(row.from), row.key).not.toBeNull();
      expect(OUTCOMES_PRODUCED.has(row.to), row.key).toBe(true);
    }
    // A ready link into an outcome nothing computes yet says so.
    const ready = OUTCOME_LINKS.find(
      (link) => link.key === "rent-control-to-rental-supply",
    )!;
    expect(outcomeLinkStatus(ready)).toBe("outcome-not-produced");
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

describe("laws as causes", () => {
  it("every law cause is a policy question a bill can answer", () => {
    for (const link of OUTCOME_LINKS) {
      if (!link.from.startsWith("law:")) continue;
      expect(outcomeMeasure(link.from), link.key).not.toBeNull();
    }
    expect(
      OUTCOME_LINKS.filter((link) => link.from.startsWith("law:")).length,
    ).toBeGreaterThanOrEqual(25);
  });

  /*
   * The first law-to-outcome chain in the game: a state law restricting
   * abortion raises births in its towns, from about seven months after it
   * takes effect (about +2.3%; Dench, Pineda-Torres and Myers 2024).
   */
  const QUESTION_KEY =
    "us-policy-positions:civil-family-community.restrict-abortion";
  const QUESTION = "proposition_restrict_abortion" as EntityId;
  const ohio = stateJurisdictionForKey("US-OH")!.id;

  function worldWith(currentDate: string, answer: "yes" | "no" | null): World {
    const measure: LegislativeMeasureRecord = {
      id: "measure_1" as EntityId,
      stableKey: "test:1",
      sequence: 1,
      jurisdictionId: ohio,
      rulePackId: "test",
      designation: "HB 1",
      shortTitle: "Restrict abortion",
      summary: "A test act.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2026-01-01"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [QUESTION],
      propositionAnswers: answer ? [{ propositionId: QUESTION, answer }] : [],
    };
    const enactment: LegislativeEnactmentRecord = {
      id: "enactment_1" as EntityId,
      stableKey: "test:1:enactment",
      sequence: 1001,
      measureId: measure.id,
      resolvedAt: makeIsoDate("2026-06-01"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate("2026-07-01"),
      outcomeEventId: "event_1" as EntityId,
    };
    return {
      currentDate: makeIsoDate(currentDate),
      policyCatalog: {
        propositions: { [QUESTION]: { id: QUESTION, stableKey: QUESTION_KEY } },
      },
      history: {
        legislativeMeasures: [measure],
        legislativeEnactments: [enactment],
      },
    } as unknown as World;
  }

  it("a restrict-abortion law raises births about 2.3%, seven months after it takes effect", () => {
    const early = outcomeFactor(
      worldWith("2026-12-01", "yes"),
      ohio,
      "births.rate",
      makeIsoDate("2026-12-01"),
    );
    // Seven months before December 1 the law was not yet in force.
    expect(early.multiplier).toBe(1);
    const later = outcomeFactor(
      worldWith("2027-03-01", "yes"),
      ohio,
      "births.rate",
      makeIsoDate("2027-03-01"),
    );
    expect(later.multiplier).toBeCloseTo(1.023, 10);
    expect(later.causes.map((cause) => cause.key)).toEqual([
      "abortion-ban-to-births",
    ]);
  });

  it("a law that says no, or no law at all, leaves births at the base rate", () => {
    for (const answer of ["no", null] as const) {
      const reading = outcomeFactor(
        worldWith("2027-03-01", answer),
        ohio,
        "births.rate",
        makeIsoDate("2027-03-01"),
      );
      expect(reading.multiplier, String(answer)).toBe(1);
    }
  });
});

describe("sizes are a baseline, not literal numbers", () => {
  const link = OUTCOME_LINKS.find(
    (candidate) => candidate.key === "unemployment-to-poverty",
  )!;
  const place = "place_a" as EntityId;
  const seeded = (seed: string) => ({ seed }) as unknown as World;

  it("each world draws each place's size within the research range, and keeps it", () => {
    const [low, high] = link.range!;
    const sizes = new Set<number>();
    for (let index = 0; index < 40; index += 1) {
      const size = drawnLinkSize(seeded(`world-${index}`), link, place);
      expect(size).toBeGreaterThanOrEqual(low);
      expect(size).toBeLessThanOrEqual(high);
      expect(drawnLinkSize(seeded(`world-${index}`), link, place)).toBe(size);
      sizes.add(size);
    }
    // Different worlds play out differently.
    expect(sizes.size).toBeGreaterThan(30);
    // So do different places in one world.
    expect(drawnLinkSize(seeded("w"), link, "place_b" as EntityId)).not.toBe(
      drawnLinkSize(seeded("w"), link, place),
    );
  });

  it("a link without a researched range spreads by its evidence, and an about-zero link stays zero", () => {
    const researched = {
      key: "x",
      size: 0.1,
      evidence: "researched" as const,
    };
    for (let index = 0; index < 20; index += 1) {
      const size = drawnLinkSize(seeded(`s${index}`), researched, place);
      expect(size).toBeGreaterThanOrEqual(0.075);
      expect(size).toBeLessThanOrEqual(0.125);
    }
    for (const zero of OUTCOME_LINKS.filter(
      (candidate) => candidate.evidence === "about-zero",
    ))
      expect(drawnLinkSize(seeded("w"), zero, place)).toBe(0);
    // A fixture world with no seed uses the central size.
    expect(drawnLinkSize({} as World, link, place)).toBe(link.size);
  });
});

describe("every state policy question has researched effects (F-cloud rows)", () => {
  const all = OUTCOME_LINKS.filter((link) => link.owner === "F-cloud");
  // Rows into a measure another lane is adding: they switch on when it lands.
  const waiting = all.filter((link) => link.to === "housing.homelessness");
  const rows = all.filter((link) => !waiting.includes(link));
  const places = Object.keys(STATES).flatMap((usps) => {
    const id = stateJurisdictionForKey(`US-${usps}`)?.id;
    return id ? [{ key: `US-${usps}`, id }] : [];
  });

  /** A world where one enacted state law answers `questionKey` in a place. */
  function enacted(
    place: EntityId,
    questionKey: string,
    answer: "yes" | "no",
    effectiveAt: string,
  ): World {
    const question = `proposition:${questionKey}` as EntityId;
    const measure: LegislativeMeasureRecord = {
      id: "measure_f" as EntityId,
      stableKey: "test:f",
      sequence: 1,
      jurisdictionId: place,
      rulePackId: "test",
      designation: "HB 1",
      shortTitle: "A test act",
      summary: "A test act.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2026-01-01"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [question],
      propositionAnswers: [{ propositionId: question, answer }],
    };
    const enactment: LegislativeEnactmentRecord = {
      id: "enactment_f" as EntityId,
      stableKey: "test:f:enactment",
      sequence: 1001,
      measureId: measure.id,
      resolvedAt: makeIsoDate("2026-06-01"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: "event_f" as EntityId,
    };
    return {
      currentDate: makeIsoDate("2040-01-01"),
      policyCatalog: {
        propositions: {
          [question]: { id: question, stableKey: questionKey },
        },
      },
      history: {
        legislativeMeasures: [measure],
        legislativeEnactments: [enactment],
      },
    } as unknown as World;
  }

  it("every row is a state law into an outcome the game produces", () => {
    for (const link of rows) {
      expect(link.from.startsWith("law:us-policy-positions:"), link.key).toBe(
        true,
      );
      expect(outcomeMeasure(link.from), link.key).not.toBeNull();
      expect(OUTCOMES_PRODUCED.has(link.to), link.key).toBe(true);
      expect(link.shape.kind, link.key).toBe("linear");
      const status = outcomeLinkStatus(link);
      expect(["built", "about-zero"], link.key).toContain(status);
      if (link.range) {
        const [low, high] = link.range;
        expect(link.size!, link.key).toBeGreaterThanOrEqual(
          Math.min(low, high),
        );
        expect(link.size!, link.key).toBeLessThanOrEqual(Math.max(low, high));
      }
    }
  });

  it("rows waiting on the homelessness measure say so, and the state override does not count by-right permitting twice", () => {
    expect(waiting.map((link) => link.key).sort()).toEqual([
      "by-right-permitting-to-homelessness",
      "housing-preemption-to-homelessness",
    ]);
    for (const link of waiting) {
      expect(outcomeMeasure(link.from), link.key).not.toBeNull();
      expect(outcomeLinkStatus(link), link.key).toBe(
        OUTCOMES_PRODUCED.has(link.to) ? "built" : "outcome-not-produced",
      );
    }
    const preemption = waiting.find(
      (link) => link.key === "housing-preemption-to-homelessness",
    )!;
    expect(preemption.moderator).toEqual({
      measure: "law:us-policy-positions:housing-land-use.by-right-permitting",
      effectAtFull: -0.5,
      mode: "scale",
    });
    expect(outcomeMeasure(preemption.moderator!.measure)).not.toBeNull();
  });

  it("each row reads its law in force in every place: a change from the starting law moves the outcome by its size, after its lag", () => {
    const effectiveAt = "2030-01-01";
    for (const link of rows) {
      const questionKey = link.from.slice("law:".length);
      const afterLag = makeIsoDate(
        `${2030 + Math.ceil(link.lagMonths / 12) + 1}-01-01`,
      );
      for (const place of places) {
        const factorFor = (answer: "yes" | "no", asOf = afterLag) => {
          const world = enacted(place.id, questionKey, answer, effectiveAt);
          return (
            outcomeFactor(world, place.id, link.to, asOf).causes.find(
              (cause) => cause.key === link.key,
            )?.factor ?? 1
          );
        };
        const label = `${link.key} in ${place.key}`;
        const startedYes =
          lawInForceAtStart(
            enacted(place.id, questionKey, "no", effectiveAt),
            place.id,
            `proposition:${questionKey}` as EntityId,
            OUTCOME_WEB_CALIBRATED_AT,
          ) === "yes";
        const yes = factorFor("yes");
        const no = factorFor("no");
        expect(yes - no, label).toBeCloseTo(link.size ?? 0, 10);
        // The starting law is the base: keeping it changes nothing.
        expect(startedYes ? yes : no, label).toBeCloseTo(1, 10);
        // Before the law takes effect and its lag passes, nothing moves.
        expect(
          factorFor(startedYes ? "no" : "yes", makeIsoDate("2029-12-01")),
          label,
        ).toBe(1);
      }
    }
  });
});
