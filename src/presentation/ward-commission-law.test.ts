import { describe, expect, it } from "vitest";

import {
  addDays,
  makeIsoDate,
  simulationMomentOnLocalDate,
} from "../simulation/dates";
import {
  introduceMeasure,
  availableMeasureSteps,
  measurePosition,
  recordEnactment,
} from "../simulation/legislation";
import { rulePackById } from "../simulation/legislature-rule-packs";
import { localOrdinanceGameRulePack } from "../simulation/local-ordinance-game-profile";
import { legislativePackForJurisdiction } from "../simulation/legislative-institutions";
import { seatedChamberForPack } from "../simulation/governing/chamber-votes";
import { lawInForce } from "../simulation/governing/law-in-force";
import type { GovernmentUnitIdentity } from "../simulation/government-units";
import {
  committeeMembers,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type LegislativeProcedureContext,
  type AuthoredVoteCounts,
} from "../simulation/legislation-scenarios";
import { applyLegislativeStep } from "./legislation-session";
import { personName } from "../simulation/people";
import { writeWithWorldIntegrityOnce } from "../simulation/world";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
} from "../simulation/future-transitions";
import { sittingLocalOfficers } from "../simulation/living-world/local-government-seats";
import {
  redistrictAfterCensus,
  redistrictForWardCommission,
  localElectionFilingHandler,
  LOCAL_ELECTION_FILING,
  nextTownElectionDay,
  LOCAL_ELECTIONS_PROFILE,
} from "../simulation/living-world/local-elections";
import { COUNCIL_TERM_LIMIT_QUESTION } from "../simulation/living-world/local-council-term-limits";
import {
  councilWardPlan,
  drawWardCuts,
  townWardMap,
  WARD_COMMISSION_QUESTION,
  wardDrawerInForce,
} from "../simulation/living-world/town-wards";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
  type LifePlace,
} from "../simulation/life-places";
import { placeLocalGovernmentUnits } from "../simulation/nationwide-world/local-governments";
import { placeReferencePopulation } from "../simulation/nationwide-world/place-population";
import { SeededRng } from "../simulation/rng";
import type { LawEffectStampedRecord } from "../simulation/law-effect-stamp";
import type { EntityId, IsoDate, World } from "../simulation/types";
import { LEGISLATIVE_TERM_LIMIT_QUESTION } from "../simulation/nationwide-world/state-legislative-term-limits";
import { applyStateLegislatureTurnover } from "../simulation/nationwide-world/state-legislature-turnover";
import { observerSetup, openObserverWorld } from "./observer-world";

/**
 * An independent ward commission (the policy question "Should an independent
 * commission draw city council districts?") takes the town's ward map out of
 * the council's hands. A watched world opens in a town whose council elects
 * by ward, drawn at random from every state that has one; the town adopts a
 * commission by ordinance, then repeals it.
 *
 * 1. Before the law, the council holds the pen.
 * 2. At the town's next yearly review after the law takes effect, the
 *    commission redraws at equal population, whatever the members' homes.
 * 3. After a repeal, the next census-year redraw is the council's again.
 */

const SEED = "build-5:ward-commission:1";

/** Isolated later-date test context; scheduled history is retained and canceled. */
function atFixtureDate(world: World, date: IsoDate): World {
  return writeWithWorldIntegrityOnce(world, () => {
    let next = world;
    for (const item of world.history.futureDueItems) {
      if (
        item.dueAt >= date ||
        futureDueItemStateAt(next, item.id, {
          asOfDate: next.currentDate,
          historySequenceExclusive: next.history.nextSequence,
        })?.status !== "scheduled"
      )
        continue;
      next = cancelFutureDueItem(next, {
        stableKey: `stamp-fixture:${date}:${item.id}:cancel`,
        dueItemId: item.id,
        effectiveAt: next.currentDate,
        reasonKey: "civic:fixture-isolation",
        context: "Isolated later-date unit fixture, not ordinary time passage.",
      });
    }
    return {
      ...next,
      currentDate: date,
      currentMoment: simulationMomentOnLocalDate(next.currentMoment, date),
    };
  });
}

/** Canonical procedure with explicit supplied votes; not ordinary sponsor proof. */
function enactLawFixture(
  world: World,
  jurisdiction: EntityId,
  unit: GovernmentUnitIdentity | null,
  questionKey: string,
  answer: "yes" | "no",
): World {
  const pack = unit
    ? localOrdinanceGameRulePack(unit)!
    : rulePackById(legislativePackForJurisdiction(jurisdiction)!.packId);
  const question = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === questionKey,
  )!;
  let next = introduceMeasure(world, {
    stableKey: `stamp-fixture:${questionKey}:${answer}`,
    jurisdictionId: jurisdiction,
    rulePackId: pack.packId,
    designation: "Stamp fixture 1",
    shortTitle: "Authored stamp fixture law",
    summary: "Explicit supplied-vote fixture.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: pack.chamberOrder[0]!,
    propositionIds: [question.id],
    propositionAnswers: [{ propositionId: question.id, answer }],
  });
  const measureId = next.history.legislativeMeasures!.at(-1)!.id;
  const bodies = pack.chambers.map((chamber) =>
    unit
      ? {
          chamberKey: chamber.chamberKey,
          chamberName: chamber.name,
          members: sittingLocalOfficers(next, unit)
            .filter((row) => !row.mayor)
            .map((row, ordinal) => ({
              memberKey: `${unit.id}:fixture-seat:${ordinal + 1}`,
              name: personName(next.people[row.personId]!),
              personId: row.personId,
              caucusLabel: "Authored fixture",
            })),
        }
      : seatedChamberForPack(
          next,
          pack.packId,
          chamber.chamberKey,
          chamber.name,
        )!.body,
  );
  const votePlan: Record<string, AuthoredVoteCounts> = {};
  for (const chamber of pack.chambers) {
    const body = bodies.find((row) => row.chamberKey === chamber.chamberKey)!;
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committeeMembers(body, committee.appointedMembers).length,
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: body.members.length,
      };
  }
  const procedure: LegislativeProcedureContext = {
    pack,
    measureId,
    bodies,
    committeeMemberCount: null,
    votePlan,
    governorAction: "signed",
    governorRationale: "Explicit supplied approval for the fixture.",
  };
  for (
    let i = 0;
    i < 50 && measurePosition(next, measureId).phase !== "enacted";
    i++
  ) {
    const step = availableMeasureSteps(next, measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (!step)
      throw new Error(
        `Fixture law stopped at ${measurePosition(next, measureId).phase}`,
      );
    next =
      step === "record-enactment"
        ? recordEnactment(next, {
            stableKey: `${measureId}:fixture-enactment`,
            measureId,
            effectiveAt: next.currentDate,
          })
        : applyLegislativeStep(procedure, next, step).world;
  }
  expect(measurePosition(next, measureId).phase).toBe("enacted");
  return next;
}

/** A random town under 60,000 people whose council elects by ward. */
function wardTown(
  seed: string,
  excludedStates: ReadonlySet<string>,
): LifePlace {
  const rng = new SeededRng(`ward-town:${seed}`);
  const states = [...lifePlaceStateIdentities()];
  while (states.length > 0) {
    const state = states.splice(rng.integer(0, states.length), 1)[0]!;
    if (excludedStates.has(state.jurisdictionKey)) continue;
    const places = searchLifePlaces("", 5000, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    }).filter((place) => {
      const unit = placeLocalGovernmentUnits(place).municipal[0];
      const people = placeReferencePopulation(place.sourceGeoid ?? "")?.value;
      return (
        unit !== undefined &&
        people !== undefined &&
        people < 60_000 &&
        (councilWardPlan(unit)?.wardSeats ?? 0) >= 2
      );
    });
    if (places.length > 0) return rng.pick(places);
  }
  throw new Error("No town whose council elects by ward was found.");
}

describe("an independent ward commission law", { timeout: 600_000 }, () => {
  const selectedStates = new Set<string>();
  it.each([0, 1, 2, 3, 4])(
    `takes the map from the council and stamps its repeal (${SEED}:%i)`,
    (caseNumber) => {
      const seed = `${SEED}:${caseNumber}`;
      const place = wardTown(seed, selectedStates);
      expect(place.stateJurisdictionKey).not.toBeNull();
      selectedStates.add(place.stateJurisdictionKey!);
      const opened = openObserverWorld(observerSetup(seed, place.key));
      let world = opened.world;
      const unit = placeLocalGovernmentUnits(place).municipal[0]!;
      const opening = townWardMap(world, unit)!;
      const town = world.history.events.find(
        (event) =>
          event.type === "local.wards-drawn" &&
          event.tags.includes(`unit:${unit.id}`),
      )!.jurisdictionId!;

      // 1. No law: the council draws, and nothing is redrawn early.
      expect(opening.drawnBy).toBe("council");
      const openingEvent = world.history.events.find(
        (event) =>
          event.type === "local.wards-drawn" &&
          event.tags.includes(`unit:${unit.id}`),
      )!;
      expect(
        (openingEvent as LawEffectStampedRecord).lawEffectStamps,
      ).toBeUndefined();
      expect(wardDrawerInForce(world, unit, town)).toBe("council");
      expect(redistrictForWardCommission(world, unit, town)).toBe(world);

      // 2. The ordinance takes effect; the next yearly review redraws.
      world = enactLawFixture(
        world,
        town,
        unit,
        WARD_COMMISSION_QUESTION,
        "yes",
      );
      const question = Object.values(world.policyCatalog.propositions).find(
        (row) => row.stableKey === WARD_COMMISSION_QUESTION,
      )!;
      const commissionLaw = lawInForce(world, town, question.id)!;
      expect(wardDrawerInForce(world, unit, town)).toBe("commission");
      world = redistrictForWardCommission(world, unit, town);
      const commission = townWardMap(world, unit)!;
      expect(commission.drawnBy).toBe("commission");
      expect(commission.cuts).toEqual(
        drawWardCuts(opening.households, opening.wards, "commission", []),
      );
      const drawn = world.history.events.at(-1)!;
      console.log(
        JSON.stringify({
          seed,
          state: place.stateJurisdictionKey,
          place: place.displayName,
          geoid: place.key,
          savedEventId: drawn.id,
          stampPresent: Boolean(
            (drawn as LawEffectStampedRecord).lawEffectStamps,
          ),
        }),
      );
      expect((drawn as LawEffectStampedRecord).lawEffectStamps).toEqual([
        expect.objectContaining({
          governingLawKey: commissionLaw.measureId,
          source: "enacted",
          effectKind: "local.wards-drawn",
          questionKey: WARD_COMMISSION_QUESTION,
          jurisdictionId: town,
          appliedAt: world.currentDate,
        }),
      ]);
      expect(drawn.summary).toMatch(
        /drawn by an independent commission, the independent district commission law took effect/,
      );
      // Its map holds until the next redistricting; a second review is a no-op.
      expect(redistrictForWardCommission(world, unit, town)).toBe(world);

      // 3. A repeal hands the census-year redraw back to the council.
      const repealAt = makeIsoDate(
        `${Number(world.currentDate.slice(0, 4)) + 1}-02-01`,
      );
      world = atFixtureDate(world, repealAt);
      world = enactLawFixture(
        world,
        town,
        unit,
        WARD_COMMISSION_QUESTION,
        "no",
      );
      world = atFixtureDate(world, makeIsoDate("2031-03-01"));
      const repealLaw = lawInForce(world, town, question.id)!;
      expect(wardDrawerInForce(world, unit, town)).toBe("council");
      const members = sittingLocalOfficers(world, unit).length;
      expect(members).toBeGreaterThan(0);
      world = redistrictAfterCensus(world, unit, town);
      expect(townWardMap(world, unit)!.drawnBy).toBe("council");
      const repealed = world.history.events.at(-1)!;
      expect((repealed as LawEffectStampedRecord).lawEffectStamps).toEqual([
        expect.objectContaining({
          governingLawKey: repealLaw.measureId,
        }),
      ]);
      expect(JSON.parse(JSON.stringify(repealed)).lawEffectStamps).toHaveLength(
        1,
      );
      const reopened = deserializeWorld(serializeWorld(world));
      expect(
        (reopened.history.events.at(-1)! as LawEffectStampedRecord)
          .lawEffectStamps,
      ).toEqual((repealed as LawEffectStampedRecord).lawEffectStamps);

      console.log(
        JSON.stringify({
          seed,
          place: `${place.displayName} (${place.key})`,
          opening: opening.cuts,
          commission: commission.cuts,
          paired: commission.paired.length,
          summary: drawn.summary,
        }),
      );
    },
  );
});

describe("the council term-limit saved restriction", () => {
  const states = new Set<string>();
  it.each([0, 1, 2, 3, 4])(
    "keeps the governing law on a retirement event in distinct state %i",
    (caseNumber) => {
      const seed = `team2-council-stamp:${caseNumber}`;
      const place = wardTown(seed, states);
      states.add(place.stateJurisdictionKey!);
      const opened = openObserverWorld(observerSetup(seed, place.key));
      const unit = placeLocalGovernmentUnits(place).municipal[0]!;
      const town = opened.world.history.events.find(
        (row) =>
          row.type === "local.wards-drawn" &&
          row.tags.includes(`unit:${unit.id}`),
      )!.jurisdictionId!;
      let world = enactLawFixture(
        opened.world,
        town,
        unit,
        COUNCIL_TERM_LIMIT_QUESTION,
        "yes",
      );
      const oldDue = opened.world.history.futureDueItems.find(
        (row) =>
          row.transitionKey === LOCAL_ELECTION_FILING &&
          row.jurisdictionId === town,
      )!;
      const election = nextTownElectionDay(unit, makeIsoDate("2039-01-05"));
      const dueAt = addDays(
        election.electionDate,
        -(
          LOCAL_ELECTIONS_PROFILE.filingLeadDays +
          LOCAL_ELECTIONS_PROFILE.primaryLeadDays
        ),
      );
      const due = {
        ...oldDue,
        dueAt,
        stableKey: oldDue.stableKey.replace(
          /\d{4}-\d{2}-\d{2}:filing$/,
          `${election.electionDate}:filing`,
        ),
      };
      // An explicit later-date unit context, not thirteen simulated years.
      world = atFixtureDate(world, dueAt);
      const filed = writeWithWorldIntegrityOnce(
        world,
        () => localElectionFilingHandler(world, due).world,
      );
      const restrictions = filed.history.events.filter(
        (row) =>
          row.tags.includes("barred:term-limit") && row.jurisdictionId === town,
      );
      expect(restrictions.length).toBeGreaterThan(0);
      const question = Object.values(world.policyCatalog.propositions).find(
        (row) => row.stableKey === COUNCIL_TERM_LIMIT_QUESTION,
      )!;
      const law = lawInForce(world, town, question.id)!;
      for (const row of restrictions) {
        expect(
          row.involvedEntityIds.some((personId) =>
            Boolean(world.people[personId]),
          ),
        ).toBe(true);
        expect((row as LawEffectStampedRecord).lawEffectStamps).toEqual([
          expect.objectContaining({
            governingLawKey: law.measureId,
            questionKey: COUNCIL_TERM_LIMIT_QUESTION,
            appliedAt: dueAt,
          }),
        ]);
      }
      const named = restrictions[0]!;
      const personId = named.involvedEntityIds.find((id) => filed.people[id])!;
      console.log(
        JSON.stringify({
          seed,
          place: place.displayName,
          person: personName(filed.people[personId]!),
          eventId: named.id,
          summary: named.summary,
          stamps: named.lawEffectStamps,
        }),
      );
    },
  );
});

describe("the state legislative term-limit saved restriction", () => {
  const states = new Set<string>();
  it.each([0, 1, 2, 3, 4])(
    "stamps actual barred intents across the opened world %i",
    (caseNumber) => {
      const seed = `team2-state-term-stamp:${caseNumber}`;
      const place = wardTown(seed, states);
      states.add(place.stateJurisdictionKey!);
      const opened = openObserverWorld(observerSetup(seed, place.key));
      const jurisdiction = stateJurisdictionForKey(
        place.stateJurisdictionKey!,
      )!;
      // Odd-year regular session is an explicit legal fixture context.
      const filing = atFixtureDate(opened.world, makeIsoDate("2027-01-05"));
      let world = enactLawFixture(
        filing,
        jurisdiction.id,
        null,
        LEGISLATIVE_TERM_LIMIT_QUESTION,
        "yes",
      );
      // Existing service records are unchanged; this is a later-date unit context.
      world = atFixtureDate(world, makeIsoDate("2042-01-13"));
      const intakeSequence = world.history.nextSequence;
      world = writeWithWorldIntegrityOnce(world, () =>
        applyStateLegislatureTurnover(makeIsoDate("2042-01-05"), world),
      );
      const barred = world.history.events.filter(
        (row) =>
          row.type === "election.state-legislative-candidacy-intent" &&
          row.sequence >= intakeSequence &&
          row.tags.includes("barred:term-limit"),
      );
      expect(barred.length).toBeGreaterThan(0);
      expect(
        new Set(barred.map((row) => row.jurisdictionId)).size,
      ).toBeGreaterThanOrEqual(5);
      const question = Object.values(world.policyCatalog.propositions).find(
        (row) => row.stableKey === LEGISLATIVE_TERM_LIMIT_QUESTION,
      )!;
      for (const row of barred) {
        const law = lawInForce(
          world,
          row.jurisdictionId!,
          question.id,
          row.occurredAt,
        )!;
        expect((row as LawEffectStampedRecord).lawEffectStamps).toEqual([
          expect.objectContaining({
            governingLawKey: law.measureId,
            jurisdictionId: row.jurisdictionId,
            questionKey: LEGISLATIVE_TERM_LIMIT_QUESTION,
            appliedAt: row.occurredAt,
          }),
        ]);
      }
      const named = barred[0]!;
      const personId = named.involvedEntityIds.find((id) => world.people[id])!;
      console.log(
        JSON.stringify({
          seed,
          openingPlace: place.displayName,
          governingJurisdictions: new Set(
            barred.map((row) => row.jurisdictionId),
          ).size,
          person: personName(world.people[personId]!),
          eventId: named.id,
          summary: named.summary,
          stamps: named.lawEffectStamps,
        }),
      );
    },
  );
});
