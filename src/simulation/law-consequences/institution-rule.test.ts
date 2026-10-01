/// <reference types="node" />
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { observerPlace } from "../../presentation/observer-world";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { establishOpeningOfficeholders } from "../../presentation/opening-officeholders";
import { applyLegislativeStep } from "../../presentation/legislation-session";
import { ensureLivingWorldOpening } from "../living-world/opening";
import {
  CRUNCH46_WORLD_OPENING_VERSION,
  ensureWorldStartingConditions,
  generatePoliticalStartingConditions,
} from "../world-setup";
import {
  introduceMeasure,
  recordEnactment,
  measurePosition,
  availableMeasureSteps,
} from "../legislation";
import {
  US_CONGRESS_PACK_ID,
  US_CONGRESS_RULE_PACK,
} from "../congress-rule-pack";
import { seatedCongressChamber } from "../governing/congress-chambers";
import { chamberByKey } from "../legislature-rules";
import {
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "../legislation-scenarios";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import {
  STATEHOOD_ADMISSION_DAYS,
  STATEHOOD_QUESTION,
  statehoodPlace,
} from "../governing/statehood-admission";
import { STATEHOOD_PROVENANCE } from "../living-world/statehood-seats";
import { stateJurisdictionForKey } from "../life-places";
import { advanceWorld } from "../world";
import { serializeWorldPayload, deserializeWorld } from "../serialization";
import { isLawEffectStamp } from "../law-effect-stamp";
import type { World } from "../types";
import type { LawConsequenceRow } from "../law-consequence-types";
import { institutionRuleRegistration } from "./institution-rule";

const row: LawConsequenceRow = {
  id: "federal-statehood-admission",
  kind: "institution-rule",
  when: "effective",
  who: { selector: "admitted-congress-jurisdiction", predicates: [] },
  what: "seat-admitted-congress",
  decision: { op: "term", key: "operative-law-answer", type: "boolean" },
  conditions: [],
  lag: { days: 0, sourceIds: [] },
  onRepeal: "preserve-completed",
  evidence: {
    sourceIds: ["data/research/congress/statehood-seats.json"],
    population:
      "actual admitted jurisdiction and its congressional officeholders",
    scope: "federal admission authority",
    why: "An admitted state has voting representation through actual recorded officeholders.",
    uncertainty:
      "Existing maximum-stage schedule and first-seating assumptions are unchanged.",
  },
};
function enact(world: World, answer: "yes" | "no", key: string): World {
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (q) => q.stableKey === STATEHOOD_QUESTION,
  )!;
  world = introduceMeasure(world, {
    stableKey: key,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: US_CONGRESS_PACK_ID,
    designation: "H.R. FIXTURE",
    shortTitle: "Controlled statehood authority",
    summary: "Explicit authored legal-procedure fixture, not ordinary voting.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer }],
  });
  const measure = world.history.legislativeMeasures!.at(-1)!;
  const bodies = US_CONGRESS_RULE_PACK.chamberOrder.map(
    (key) => seatedCongressChamber(world, key)!.body,
  );
  const votePlan: Record<string, { yea: number }> = {};
  for (const key of US_CONGRESS_RULE_PACK.chamberOrder) {
    const chamber = chamberByKey(US_CONGRESS_RULE_PACK, key);
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committee.appointedMembers ?? 1,
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(key, stage.stageKey)] = {
        yea: bodies.find((body) => body.chamberKey === key)!.members.length,
      };
  }
  const procedure = {
    pack: US_CONGRESS_RULE_PACK,
    measureId: measure.id,
    bodies,
    committeeMemberCount: null,
    votePlan,
    governorAction: "signed" as const,
    governorRationale: "Explicit controlled admission fixture.",
  };
  for (
    let n = 0;
    n < 45 && measurePosition(world, measure.id).phase !== "awaiting-enactment";
    n += 1
  ) {
    const step = availableMeasureSteps(world, measure.id).find(
      (step) => step !== "offer-amendment",
    );
    if (!step) throw new Error("Controlled legal procedure has no next step");
    world = applyLegislativeStep(procedure, world, step).world;
  }
  return recordEnactment(world, {
    stableKey: `${key}:enacted`,
    measureId: measure.id,
    effectiveAt: world.currentDate,
  });
}
const seen = new Set<string>();
const cases: { seed: string; place: ReturnType<typeof observerPlace> }[] = [];
for (let n = 0; cases.length < 5 && n < 100; n += 1) {
  const seed = `team1-institution-kind-${n}`;
  const place = observerPlace(seed);
  if (!place.stateJurisdictionKey || seen.has(place.stateJurisdictionKey))
    continue;
  seen.add(place.stateJurisdictionKey);
  cases.push({ seed, place });
}
const receipts: unknown[] = [];
describe("institution kind reaches named voting-seat holders in five drawn observer places", () => {
  it.each(cases)(
    "$seed $place.displayName saves and continues actual stamped tenures",
    ({ seed, place }) => {
      const created = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
      });
      let world = ensureNationalElectionJurisdiction(
        ensureLivingWorldOpening(
          establishOpeningOfficeholders(
            ensureWorldStartingConditions(created.world, {
              openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
              political: generatePoliticalStartingConditions,
            }),
            created.playerPersonId,
          ),
          created.playerPersonId,
        ),
      );
      const question = Object.values(world.policyCatalog.propositions).find(
        (q) => q.stableKey === STATEHOOD_QUESTION,
      )!;
      world = {
        ...world,
        policyCatalog: {
          ...world.policyCatalog,
          propositions: {
            ...world.policyCatalog.propositions,
            [question.id]: { ...question, consequences: [row] },
          },
        },
      };
      world = enact(world, "yes", `${seed}:authority`);
      expect(
        world.history.events.filter((event) =>
          event.tags.includes(STATEHOOD_PROVENANCE),
        ),
      ).toHaveLength(0);
      // Advance the canonical clock only: no ordinary election/service emergence is claimed.
      world = advanceWorld(world, STATEHOOD_ADMISSION_DAYS);
      const jurisdictionId = stateJurisdictionForKey(
        `US-${statehoodPlace()}`,
      )!.id;
      const context = {
        onDate: world.currentDate,
        activity: "effective" as const,
        activityId: world.history.legislativeEnactments!.at(-1)!.outcomeEventId,
        subjectIds: [jurisdictionId],
      };
      const resolved = institutionRuleRegistration.resolve(world, row, context);
      expect(resolved).toHaveLength(1);
      const result = institutionRuleRegistration.apply(world, resolved[0]!);
      const events = result.history.events.filter((event) =>
        event.tags.includes(STATEHOOD_PROVENANCE),
      );
      expect(events).toHaveLength(3);
      for (const event of events) {
        const personId = event.participants.find(
          (person) => person.role === "focus:subject",
        )!.personId;
        expect(result.people[personId]).toBeDefined();
        expect(event.summary).toContain("serves as");
        expect(isLawEffectStamp(event.lawEffectStamps![0])).toBe(true);
        expect(event.lawEffectStamps![0]!.governingLawKey).toBe(
          resolved[0]!.law.measureId,
        );
      }
      const continued = deserializeWorld(serializeWorldPayload(result));
      expect(
        continued.history.events.filter((event) =>
          event.tags.includes(STATEHOOD_PROVENANCE),
        ),
      ).toEqual(events);
      const repeated = institutionRuleRegistration.apply(
        continued,
        resolved[0]!,
      );
      expect(
        repeated.history.events.filter((event) =>
          event.tags.includes(STATEHOOD_PROVENANCE),
        ),
      ).toEqual(events);
      const repealed = enact(continued, "no", `${seed}:prospective-repeal`);
      expect(
        institutionRuleRegistration.resolve(repealed, row, context),
      ).toEqual([]);
      expect(
        repealed.history.events.filter((event) =>
          event.tags.includes(STATEHOOD_PROVENANCE),
        ),
      ).toEqual(events);
      receipts.push({
        seed,
        place: place.displayName,
        sourceLaw: resolved[0]!.law.measureId,
        canonicalSaveContinue: true,
        repeatNoDuplicate: true,
        prospectiveNoNewResolution: true,
        completedHistoryPreserved: true,
        namedEvents: events.map((event) => ({
          summary: event.summary,
          personId: event.participants[0]!.personId,
          eventId: event.id,
          date: event.occurredAt,
          stamps: event.lawEffectStamps,
        })),
      });
      if (process.env.TEAM1_INSTITUTION_RECEIPT)
        writeFileSync(
          process.env.TEAM1_INSTITUTION_RECEIPT,
          JSON.stringify(receipts, null, 2),
        );
    },
  );
});
