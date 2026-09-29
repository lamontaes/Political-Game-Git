import { describe, expect, it, vi } from "vitest";

import { makeIsoDate } from "../dates";
import {
  lifePlaceByKey,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../life-places";
import { createProductionPolicyCatalog } from "../production-catalog";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import { lawInForce } from "./law-in-force";
import { questionAuthority } from "./question-authority";

/**
 * A city's own questions wait on its state's answer. A city minimum wage waits
 * on whether the state lets cities set one; a city nondiscrimination ordinance
 * waits on whether the state's "no" bars local ones. The starting-law file is
 * replaced here with a state of each kind.
 */
const P = "us-policy-positions:";
const LOCAL_WAGE = `${P}labor-workforce.local-minimum-wage-authority`;
const STATE_FAIRNESS = `${P}civil-family-community.ban-discrimination-in-housing-and-work`;

vi.mock("../../../data/research/laws/starting-law-2026.json", () => ({
  default: {
    defaultOperativeAt: "2000-01-01",
    questions: {
      "us-policy-positions:government-operations.broaden-local-authority": {
        answers: {
          "US-AL": { answer: "no", preempts: true },
          "US-OH": { answer: "yes", preempts: true },
        },
      },
      "us-policy-positions:labor-workforce.local-minimum-wage-authority": {
        answers: {
          "US-KY": { answer: "no", preempts: true },
          "US-OH": { answer: "yes" },
        },
      },
      "us-policy-positions:civil-family-community.ban-discrimination-in-housing-and-work":
        {
          answers: {
            "US-KY": { answer: "no", preempts: false },
            "US-TN": { answer: "no", preempts: true },
          },
        },
    },
  },
}));

const POLICY = createProductionPolicyCatalog();
const id = (key: string) =>
  POLICY.propositionOrder.find(
    (entry) => POLICY.propositions[entry]!.stableKey === key,
  )!;
const CITY_WAGE = id(`${P}labor-workforce.city-minimum-wage`);
const CITY_FAIRNESS = id(
  `${P}civil-family-community.city-nondiscrimination-ordinance`,
);
const COUNCIL_TERMS = id(`${P}government-operations.council-term-limits`);
const HOME_RULE = id(`${P}government-operations.broaden-local-authority`);
const POLICE_OVERSIGHT = id(
  `${P}justice-public-safety.civilian-oversight-of-police`,
);

const town = (key: string) => lifePlaceByKey(key)!.context.jurisdiction.id;
const lexington = town("lexington-fayette");
const columbus = town("3918000");
const indianapolis = town("1836003");
const memphis = searchLifePlaces("Memphis", 5, {
  stateJurisdictionKey: "US-TN",
}).find((place) => place.scope !== "state")!.context.jurisdiction.id;
const birmingham = searchLifePlaces("Birmingham", 5, {
  stateJurisdictionKey: "US-AL",
}).find((place) => place.scope !== "state")!.context.jurisdiction.id;

let sequence = 0;
function enacted(
  jurisdictionId: EntityId,
  propositionId: EntityId,
  answer: "yes" | "no",
  on: string,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  sequence += 1;
  const measureId = `measure_${sequence}` as EntityId;
  return {
    measure: {
      id: measureId,
      stableKey: `test:${sequence}`,
      sequence,
      jurisdictionId,
      rulePackId: "test",
      designation: `No. ${sequence}`,
      shortTitle: "A test law",
      summary: "A test law.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "council",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2026-01-01"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [propositionId],
      propositionAnswers: [{ propositionId, answer }],
    },
    enactment: {
      id: `enactment_${sequence}` as EntityId,
      stableKey: `test:${sequence}:enactment`,
      sequence: 1000 + sequence,
      measureId,
      resolvedAt: makeIsoDate(on),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(on),
      outcomeEventId: `event_${sequence}` as EntityId,
    },
  };
}

function worldWith(laws: readonly ReturnType<typeof enacted>[]): World {
  return {
    currentDate: makeIsoDate("2027-01-01"),
    policyCatalog: POLICY,
    history: {
      legislativeMeasures: laws.map((law) => law.measure),
      legislativeEnactments: laws.map((law) => law.enactment),
    },
  } as unknown as World;
}

describe("a city's own question, gated by its state", () => {
  const empty = worldWith([]);

  it("bars a city minimum wage where the state bars cities, and settles it where the state allows them", () => {
    expect(questionAuthority(empty, lexington, CITY_WAGE).may).toBe("no");
    expect(questionAuthority(empty, columbus, CITY_WAGE).may).toBe("yes");
    // Indiana's law is not in the file: the catalog's "varies by state" stands.
    expect(questionAuthority(empty, indianapolis, CITY_WAGE).may).toBe(
      "unknown",
    );
  });

  it("bars a city fairness ordinance only where the state's no says it preempts", () => {
    expect(questionAuthority(empty, memphis, CITY_FAIRNESS).may).toBe("no");
    expect(questionAuthority(empty, lexington, CITY_FAIRNESS).may).not.toBe(
      "no",
    );
    expect(questionAuthority(empty, columbus, CITY_FAIRNESS).may).not.toBe(
      "no",
    );
  });

  it("leaves a council's own terms to its charter in every state", () => {
    for (const place of [lexington, columbus, indianapolis, memphis])
      expect(questionAuthority(empty, place, COUNCIL_TERMS).may).toBe("yes");
  });

  it("lets an ordinance govern only while its state allows it", () => {
    const ohio = stateJurisdictionForKey("US-OH")!.id;
    const ordinance = enacted(columbus, CITY_WAGE, "yes", "2026-03-01");
    expect(
      lawInForce(worldWith([ordinance]), columbus, CITY_WAGE),
    ).toMatchObject({ answer: "yes", level: "local-ordinance" });
    // Ohio later bars its cities: the ordinance stays on the record and stops
    // governing from that day.
    const bar = enacted(ohio, id(LOCAL_WAGE), "no", "2026-09-01");
    const world = worldWith([ordinance, bar]);
    expect(
      lawInForce(world, columbus, CITY_WAGE, makeIsoDate("2026-08-31")),
    ).toMatchObject({ answer: "yes" });
    expect(
      lawInForce(world, columbus, CITY_WAGE, makeIsoDate("2026-09-01")),
    ).toBeNull();
    // Kentucky bars its cities from the start.
    const kentucky = enacted(lexington, CITY_WAGE, "yes", "2026-03-01");
    expect(lawInForce(worldWith([kentucky]), lexington, CITY_WAGE)).toBeNull();
  });

  it("settles a power left to home rule or Dillon's rule by the state's law on home rule", () => {
    // Ohio has home rule; Alabama follows Dillon's rule; Indiana's law is not
    // in the file, so the power stays unsettled.
    expect(questionAuthority(empty, columbus, POLICE_OVERSIGHT).may).toBe(
      "yes",
    );
    const dillon = questionAuthority(empty, birmingham, POLICE_OVERSIGHT);
    expect(dillon.may).toBe("no");
    expect(dillon.reason).toContain("Dillon's rule");
    expect(questionAuthority(empty, indianapolis, POLICE_OVERSIGHT).may).toBe(
      "unknown",
    );
    // A power the catalog settles for cities is not touched.
    expect(questionAuthority(empty, birmingham, COUNCIL_TERMS).may).toBe("yes");
  });

  it("opens a town's ordinance when its state adopts home rule, and closes it on repeal", () => {
    const alabama = stateJurisdictionForKey("US-AL")!.id;
    const ordinance = enacted(
      birmingham,
      POLICE_OVERSIGHT,
      "yes",
      "2026-03-01",
    );
    const adopt = enacted(alabama, HOME_RULE, "yes", "2026-07-01");
    const repeal = enacted(alabama, HOME_RULE, "no", "2027-07-01");
    const world = worldWith([ordinance, adopt, repeal]);
    // Under Dillon's rule the ordinance is on the record and governs nothing.
    expect(
      lawInForce(
        world,
        birmingham,
        POLICE_OVERSIGHT,
        makeIsoDate("2026-06-30"),
      ),
    ).toBeNull();
    expect(
      lawInForce(
        world,
        birmingham,
        POLICE_OVERSIGHT,
        makeIsoDate("2026-07-01"),
      ),
    ).toMatchObject({ answer: "yes", level: "local-ordinance" });
    expect(
      lawInForce(
        world,
        birmingham,
        POLICE_OVERSIGHT,
        makeIsoDate("2027-07-01"),
      ),
    ).toBeNull();
  });

  it("reads the state fairness question itself unchanged", () => {
    const tennessee = stateJurisdictionForKey("US-TN")!.id;
    expect(lawInForce(empty, tennessee, id(STATE_FAIRNESS))?.preempts).toBe(
      true,
    );
  });
});
