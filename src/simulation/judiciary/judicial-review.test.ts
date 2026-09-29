import { beforeAll, describe, expect, it } from "vitest";
import {
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "../../presentation/observer-world";
import { addDays, makeIsoDate, simulationMomentOnLocalDate } from "../dates";
import { judicialRulingKey, lawInForce } from "../governing/law-in-force";
import { recordByStableKey } from "../history-index";
import { createStableId } from "../ids";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import { stateJurisdictionForKey } from "../life-places";
import { SeededRng } from "../rng";
import { STATES } from "../state-reference";
import { recordWorldEvent, withWorldIntegrityDeferred } from "../world";
import type {
  EntityId,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import {
  applyJudicialReview,
  justiceVotes,
  LAW_STRUCK,
  REVIEWED_QUESTIONS,
  reviewingCourt,
} from "./judicial-review";

/**
 * Court review on an opened world with its judiciary seated. The state whose
 * law is challenged is drawn from all 56 places with the seed named here, and
 * the place the world opens in is drawn too; neither is fixed.
 */
const SEED = "judicial-review-watch-1";
const PLACES = Object.keys(STATES);
const lawState = new SeededRng(SEED).fork("law-state").pick(PLACES);

let opened: World | null = null;
function openedWorld(): World {
  if (opened) return opened;
  // The world opens where "Watch the world" opens it for this seed.
  opened = openObserverWorld(observerSetup(SEED)).world;
  return opened;
}

/** The world moved to a day, its clock with it, and nothing else. */
function on(world: World, date: IsoDate): World {
  return {
    ...world,
    currentDate: date,
    currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
  };
}

/**
 * The clock's call, with the writers' checks deferred as a clock advance
 * defers them: the law here is written by hand, without the chamber votes
 * the whole-world check asks a real enactment to carry.
 */
function review(before: IsoDate, world: World): World {
  return withWorldIntegrityDeferred(() => applyJudicialReview(before, world));
}

const GAS = "us-policy-positions:environment-energy.ban-new-gas-hookups";
const PERMIT =
  "us-policy-positions:justice-public-safety.permit-to-carry-concealed";

function propositionId(world: World, key: string): EntityId {
  return Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === key,
  )!.id;
}

/** A state law answering one question, enacted today, in force in 90 days. */
function withLaw(
  world: World,
  usps: string,
  questionKey: string,
): { world: World; enactmentId: EntityId; propositionId: EntityId } {
  const state = stateJurisdictionForKey(`US-${usps}`)!;
  const id = createStableId("legislative-measure", `test:review:${usps}`);
  const pid = propositionId(world, questionKey);
  // The enactment's own outcome event, as the legislature records it.
  const signedKey = `test:review:${usps}:signed`;
  world = recordWorldEvent(world, {
    stableKey: signedKey,
    type: "legislation.enacted",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: state.id,
    involvedEntityIds: [state.id],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [],
    summary: "SB 7 became law.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const outcomeEventId = recordByStableKey(world.history.events, signedKey)!.id;
  const measure = {
    id,
    stableKey: `test:review:${usps}`,
    sequence: world.history.nextSequence,
    jurisdictionId: state.id,
    rulePackId: legislativePackForJurisdiction(state.id)!.packId,
    designation: "SB 7",
    shortTitle: "A law under review",
    summary: "A law under review.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "senate",
    sponsorPersonId: null,
    introducedAt: world.currentDate,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [pid],
    propositionAnswers: [{ propositionId: pid, answer: "yes" }],
  } as unknown as LegislativeMeasureRecord;
  const enactment = {
    id: createStableId("legislative-enactment", `test:review:${usps}`),
    stableKey: `test:review:${usps}:enactment`,
    sequence: world.history.nextSequence + 1,
    measureId: id,
    resolvedAt: world.currentDate,
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: addDays(world.currentDate, 90),
    outcomeEventId,
  } as unknown as LegislativeEnactmentRecord;
  return {
    world: {
      ...world,
      history: {
        ...world.history,
        nextSequence: world.history.nextSequence + 2,
        legislativeMeasures: [
          ...(world.history.legislativeMeasures ?? []),
          measure,
        ],
        legislativeEnactments: [
          ...(world.history.legislativeEnactments ?? []),
          enactment,
        ],
      },
    },
    enactmentId: enactment.id,
    propositionId: pid,
  };
}

describe(`court review (seed ${SEED}, opened in ${observerPlace(SEED).key}, law in US-${lawState})`, () => {
  // Opening a world with every court seated takes seconds on a slow
  // machine; it is opened once, outside any one test's time limit.
  beforeAll(() => {
    openedWorld();
  }, 120_000);

  it("names a seated highest court for every one of the 56 places", () => {
    const world = openedWorld();
    for (const usps of PLACES) {
      const court = reviewingCourt(
        world,
        stateJurisdictionForKey(`US-${usps}`)!.id,
      );
      expect(court?.level, usps).toBe("local-highest");
      expect(court!.courtId, usps).not.toMatch(/criminal/);
    }
  });

  it("rules the day before the law takes effect, each justice for their own reasons", () => {
    const base = openedWorld();
    const {
      world,
      enactmentId,
      propositionId: pid,
    } = withLaw(base, lawState, GAS);
    const eve = addDays(base.currentDate, 89);
    // Nothing is decided before the day comes.
    const early = review(base.currentDate, {
      ...world,
      currentDate: addDays(eve, -1),
    });
    expect(
      recordByStableKey(
        early.history.events,
        judicialRulingKey(enactmentId, pid),
      ),
    ).toBeUndefined();
    const ruled = review(addDays(eve, -1), on(world, eve));
    const ruling = recordByStableKey(
      ruled.history.events,
      judicialRulingKey(enactmentId, pid),
    )!;
    expect(ruling.occurredAt).toBe(eve);
    const court = reviewingCourt(
      ruled,
      world.history.legislativeMeasures!.at(-1)!.jurisdictionId,
    )!;
    expect(ruling.tags).toContain(`court:${court.courtId}`);
    expect(ruling.participants.length).toBeGreaterThan(0);
    for (const participant of ruling.participants) {
      const [option, reason] = participant.detail!.split("|");
      expect(["law:stands", "law:struck"]).toContain(option);
      expect(reason!.length).toBeGreaterThan(0);
    }
    const struck = ruling.participants.filter((row) =>
      row.detail!.startsWith(LAW_STRUCK),
    ).length;
    expect(ruling.tags).toContain(
      struck * 2 > ruling.participants.length
        ? "outcome:struck"
        : "outcome:upheld",
    );
    // The same world rules the same way: no roll.
    const again = review(addDays(eve, -1), on(world, eve));
    expect(
      recordByStableKey(again.history.events, ruling.stableKey)!.tags,
    ).toEqual(ruling.tags);
    // Ruling twice writes nothing more.
    expect(review(addDays(eve, -1), ruled)).toBe(ruled);
    // A struck law governs nothing once it would have taken effect; an
    // upheld one governs from its own day.
    const state = stateJurisdictionForKey(`US-${lawState}`)!.id;
    const read = lawInForce(ruled, state, pid, addDays(eve, 2), "enacted-only");
    if (ruling.tags.includes("outcome:struck")) expect(read).toBeNull();
    else expect(read?.answer).toBe("yes");
  });

  it("strikes a law when the justices' own principles and the rulings run against it, and upholds it when they run for it", () => {
    const base = openedWorld();
    const { world, propositionId: pid } = withLaw(base, lawState, GAS);
    const gas = REVIEWED_QUESTIONS.find((row) => row.question === GAS)!;
    const court = reviewingCourt(
      world,
      stateJurisdictionForKey(`US-${lawState}`)!.id,
    )!;
    const justices = Object.values(world.judiciary!.seatTenures)
      .filter((tenure) => tenure.endedAt === null)
      .map((tenure) => tenure.personId)
      .filter((id) => world.people[id]);
    expect(justices.length).toBeGreaterThan(0);
    // With the rulings split, the rulings alone leave a justice with no
    // principle on the question to the presumption: the law stands.
    const votes = justiceVotes(world, {
      stableKey: "test:gas",
      justiceIds: [justices[0]!],
      reviewed: { ...gas, rulings: gas.rulings },
      propositionId: pid,
      ruledAt: world.currentDate,
    });
    expect(votes).toHaveLength(1);
    // Only strike rulings: struck. Only uphold rulings: stands.
    const onlyStrike = justiceVotes(world, {
      stableKey: "test:gas:strike",
      justiceIds: [justices[0]!],
      reviewed: {
        ...gas,
        rulings: gas.rulings.map((row) => ({
          ...row,
          holding: "strike" as const,
          weight: "decisive" as const,
        })),
      },
      propositionId: pid,
      ruledAt: world.currentDate,
    });
    expect(onlyStrike[0]!.optionKey).toBe(LAW_STRUCK);
    const onlyUphold = justiceVotes(world, {
      stableKey: "test:gas:uphold",
      justiceIds: [justices[0]!],
      reviewed: {
        ...gas,
        rulings: gas.rulings.map((row) => ({
          ...row,
          holding: "uphold" as const,
          weight: "decisive" as const,
        })),
      },
      propositionId: pid,
      ruledAt: world.currentDate,
    });
    expect(onlyUphold[0]!.optionKey).toBe("law:stands");
    expect(court).not.toBeNull();
  });

  it("upholds a law the U.S. Supreme Court has held valid", () => {
    const base = openedWorld();
    const {
      world,
      enactmentId,
      propositionId: pid,
    } = withLaw(base, lawState, PERMIT);
    const eve = addDays(base.currentDate, 89);
    const ruled = review(addDays(eve, -1), on(world, eve));
    const ruling = recordByStableKey(
      ruled.history.events,
      judicialRulingKey(enactmentId, pid),
    );
    // Bruen's footnote 9 (strong) and the presumption outweigh any one
    // justice's principles short of decisive.
    expect(ruling?.tags).toContain("outcome:upheld");
    expect(makeIsoDate(ruling!.occurredAt)).toBe(eve);
  });
});
