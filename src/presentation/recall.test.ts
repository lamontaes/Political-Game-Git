import { resolveRequiredSignatures } from "../simulation/municipal-election-rules";
import { randomInt, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  deserializeWorld,
  lifePlaceStateIdentities,
  searchLifePlaces,
  serializeWorld,
} from "../simulation";
import { municipalGovernmentForLifePlace } from "../simulation/municipal-government";
import {
  installMunicipalGovernment,
  municipalGovernmentJurisdictionId,
  municipalSeats,
} from "../simulation/municipal-public-work";
import {
  RECALL_ELECTION,
  RECALL_PETITION_CLOSES,
  RECALL_PETITION_CLOSED,
  RECALL_VERSION,
  recallElectionHandler,
  recallResidentViews,
  canStartRecallPetition,
  municipalRecallRule,
  recallPetitions,
  startRecallPetition,
} from "../simulation/recall";
import type { EntityId, World } from "../simulation/types";
import { isPersonAliveAt } from "../simulation/vitality-integrity";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";
import { addDays, ageOnDate } from "../simulation/dates";
import {
  createFormationContext,
  recordPrivateBelief,
} from "../simulation/politics";
import { recordWorldEvent } from "../simulation/world";
import { scheduleFutureDueItem } from "../simulation/future-transitions";
import { resolveDueThrough } from "../../tests/fixtures/due-item-clock";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { projectRecall, startProjectedRecallPetition } from "./recall";
import { recordOrganizationParticipationState } from "../simulation/life";
import { organizationParticipationStateHistory } from "../simulation/life-queries";

/**
 * A resident petitioning to recall a member of their town's council, on an
 * ordinary start in a state whose researched pack allows town recall.
 * Grand Island, Nebraska: a keep-or-remove recall vote and a thirty-day
 * circulation window.
 */
const GRAND_ISLAND = "3119595";

type OrdinaryStart = {
  readonly world: World;
  readonly governmentKey: string;
  readonly player: EntityId;
  readonly member: EntityId;
  readonly townId: EntityId;
};
const starts = new Map<string, OrdinaryStart>();
// Release the shared openings when this file is done, so a worker that runs
// the next file does not keep them.
afterAll(() => {
  starts.clear();
});

/**
 * One opened town per place and seed, shared by the cases that ask for it: a
 * World is an immutable value, so each case advances its own copy. Only the
 * two most recent are kept, so the worker's memory stays bounded.
 */
function ordinaryStart(placeKey: string, seed: string): OrdinaryStart {
  const key = `${placeKey}:${seed}`;
  const known = starts.get(key);
  if (known) {
    // Most recently used last, so the place still in use is the one kept.
    starts.delete(key);
    starts.set(key, known);
    return known;
  }
  const opened = openStart(placeKey, seed);
  starts.set(key, opened);
  while (starts.size > 2) starts.delete(starts.keys().next().value!);
  return opened;
}

function openStart(placeKey: string, seed: string): OrdinaryStart {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 40,
      depth: "summarize-earlier-life",
      questionnaire: "skipped",
      placeKey,
    }),
  ).game!;
  let world = openOrdinaryLife(game.world, game.playerPersonId);
  const place = resolvePlayerCapabilities(world).homePlace!;
  const government = municipalGovernmentForLifePlace(place)!;
  world = installMunicipalGovernment(world, {
    governmentKey: government.key,
    jurisdictionId: municipalGovernmentJurisdictionId(world, government.key),
    formedAt: world.currentDate,
  });
  const townId = municipalGovernmentJurisdictionId(world, government.key)!;
  const player = game.playerPersonId;
  // The council member is a neighbor who lives in town: an ordinary start
  // seats the council from the town's own residents.
  const member = municipalSeats(world, government.key).find(
    (seat) =>
      seat.role === "member" &&
      seat.personId !== player &&
      world.people[seat.personId]!.homeJurisdictionId === townId &&
      isPersonAliveAt(world, seat.personId, {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      }),
  )!.personId;
  return { world, governmentKey: government.key, player, member, townId };
}

function petition(
  world: World,
  governmentKey: string,
  player: EntityId,
  member: EntityId,
) {
  return startRecallPetition(world, {
    petitionerPersonId: player,
    governmentKey,
    targetPersonId: member,
  });
}

/** Explicit historical qualified snapshot; no signature producer is asserted. */
function qualifiedSnapshot(town: OrdinaryStart) {
  let world = petition(
    town.world,
    town.governmentKey,
    town.player,
    town.member,
  );
  const open = recallPetitions(world)[0]!;
  const electionAt = addDays(open.closesAt, 75);
  world = recordWorldEvent(world, {
    stableKey: `${open.stableKey}:closed`,
    type: RECALL_PETITION_CLOSED,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: town.townId,
    involvedEntityIds: [town.member],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      RECALL_VERSION,
      `petition:${open.stableKey}`,
      "outcome:qualified",
      `election:${electionAt}`,
    ],
    summary:
      "Supplied historical qualified recall snapshot; signature production is outside this fixture.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  world = scheduleFutureDueItem(world, {
    stableKey: `${open.stableKey}:election`,
    dueAt: electionAt,
    transitionKey: RECALL_ELECTION,
    entityIds: [town.townId],
    jurisdictionId: town.townId,
    provenance: {
      kind: "authored",
      note: "Supplied historical election date, not a legal scheduling producer.",
    },
  });
  return { world, due: world.history.futureDueItems.at(-1)!, open };
}

function withViews(
  world: World,
  target: EntityId,
  personIds: readonly EntityId[],
  positions: readonly ("support" | "oppose" | "conflicted")[],
) {
  let next = world;
  for (let index = 0; index < personIds.length; index += 1) {
    const personId = personIds[index]!;
    const prior = next.history.privateBeliefs
      .filter(
        (row) =>
          row.personId === personId &&
          row.subject?.kind === "official" &&
          row.subject.personId === target,
      )
      .at(-1);
    next = recordPrivateBelief(next, {
      stableKey: `recall-view:${target}:${personId}:${next.history.nextSequence}`,
      personId,
      propositionId: null,
      subject: { kind: "official", personId: target },
      formedAt: next.currentDate,
      position: positions[index]!,
      conviction: "strong",
      salience: "high",
      flexibility: "firm",
      rationale: "Explicit resident view supplied for the recall reader test.",
      formation: createFormationContext("reflection:initial"),
      supersedesBeliefId: prior?.id ?? null,
    });
  }
  return next;
}

function adultResidents(town: OrdinaryStart) {
  return town.world.personOrder.filter(
    (id) =>
      id !== town.member &&
      town.world.people[id]!.homeJurisdictionId === town.townId &&
      ageOnDate(town.world.people[id]!.birthDate, town.world.currentDate) >=
        18 &&
      isPersonAliveAt(town.world, id, {
        asOfDate: town.world.currentDate,
        historySequenceExclusive: town.world.history.nextSequence,
      }),
  );
}

describe("recalling a town official", () => {
  it("opens one new game at a randomly selected sourced locality before recall reads", () => {
    const states = lifePlaceStateIdentities();
    const state = states[randomInt(states.length)]!;
    const localities = searchLifePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    });
    expect(localities.length).toBeGreaterThan(0);
    const place = localities[randomInt(localities.length)]!;
    const seed = randomUUID();
    console.info(
      `A88 RANDOM OPENING place=${place.displayName} key=${place.key} state=${state.jurisdictionKey} seed=${seed}`,
    );
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: place.key,
      seed,
      depth: "summarize-earlier-life",
      questionnaire: "skipped",
    });
    expect(resolvePlayerCapabilities(game.world).homePlace?.key).toBe(
      place.key,
    );
    expect(game.world.control).toMatchObject({
      kind: "person",
      personId: game.playerPersonId,
    });
    const before = serializeWorld(game.world);
    expect(recallPetitions(game.world)).toEqual([]);
    expect(serializeWorld(game.world)).toBe(before);
    assertWorldIntegrity(game.world);
    if (process.env.OCD_RECALL_OPENING_RECEIPT) {
      writeFileSync(
        process.env.OCD_RECALL_OPENING_RECEIPT,
        JSON.stringify(
          {
            place: place.displayName,
            placeKey: place.key,
            state: state.jurisdictionKey,
            seed,
            worldId: game.world.id,
            personId: game.playerPersonId,
            opening: "passed",
            integrity: "passed",
            recallReadOnly: "passed",
          },
          null,
          2,
        ) + "\n",
      );
    }
  });

  it(
    "circulates on the ordinary clock and fails without recorded supporters",
    { timeout: 300_000 },
    () => {
      const { world, governmentKey, player, member } = ordinaryStart(
        GRAND_ISLAND,
        "recall-A",
      );
      const rule = municipalRecallRule(governmentKey);
      expect(rule).toMatchObject({
        available: true,
        stateUsps: "NE",
        doctrine: "yes-no-retention",
        circulationDays: 30,
        doctrineBasis: "state-law-unverified",
        circulationBasis: "state-law-unverified",
      });
      expect(
        canStartRecallPetition(world, {
          petitionerPersonId: player,
          governmentKey,
          targetPersonId: member,
        }),
      ).toMatchObject({ allowed: true });

      const started = petition(world, governmentKey, player, member);
      const [open] = recallPetitions(started);
      expect(open).toMatchObject({
        phase: "circulating",
        petitionerPersonId: player,
        targetPersonId: member,
      });
      expect(
        started.history.futureDueItems.some(
          (due) =>
            due.transitionKey === RECALL_PETITION_CLOSES &&
            due.dueAt === open!.closesAt,
        ),
      ).toBe(true);
      // One petition at a time against the same official.
      expect(
        canStartRecallPetition(started, {
          petitionerPersonId: player,
          governmentKey,
          targetPersonId: member,
        }),
      ).toMatchObject({ allowed: false });

      const closed = resolveDueThrough(
        started,
        addDays(started.currentDate, 31),
      );
      const [after] = recallPetitions(closed);
      expect(after!.phase).toBe("failed-to-qualify");
      expect(
        closed.history.futureDueItems.some(
          (due) => due.transitionKey === RECALL_ELECTION,
        ),
      ).toBe(false);
      const saved = deserializeWorld(serializeWorld(closed));
      expect(recallPetitions(saved)).toEqual(recallPetitions(closed));
      expect(() => assertWorldIntegrity(saved)).not.toThrow();
    },
  );

  it(
    "qualifies exactly at the sourced threshold using recorded supporters and registered residents",
    { timeout: 120_000 },
    () => {
      const town = ordinaryStart(GRAND_ISLAND, "recall-A");
      const rule = municipalRecallRule(town.governmentKey, town.world);
      if (!rule.available || !rule.threshold)
        throw new Error("Expected sourced recall threshold");
      const base = recallResidentViews(town.world, {
        jurisdictionId: municipalGovernmentJurisdictionId(
          town.world,
          town.governmentKey,
        )!,
        targetPersonId: town.member,
      }).registeredVoters;
      const required = resolveRequiredSignatures(rule.threshold, base);
      expect(required).toBeGreaterThan(0);
      const residents = adultResidents(town).slice(0, required);
      expect(residents).toHaveLength(required);
      for (const signatures of [required - 1, required]) {
        const supporters = residents.slice(0, signatures);
        const started = petition(
          withViews(
            town.world,
            town.member,
            supporters,
            supporters.map(() => "oppose"),
          ),
          town.governmentKey,
          town.player,
          town.member,
        );
        const due = started.history.futureDueItems.find(
          (row) => row.transitionKey === RECALL_PETITION_CLOSES,
        )!;
        const result = { world: resolveDueThrough(started, due.dueAt) };
        expect(recallPetitions(result.world)[0]!.phase).toBe(
          signatures === required ? "awaiting-election" : "failed-to-qualify",
        );
        const closed = result.world.history.events.find(
          (row) => row.type === RECALL_PETITION_CLOSED,
        )!;
        expect(closed.tags).toEqual(
          expect.arrayContaining([
            `signatures:${signatures}`,
            `registered-voters:${base}`,
            `required-signatures:${required}`,
            `threshold-base:${rule.threshold.base}`,
          ]),
        );
        expect(municipalRecallRule(town.governmentKey, result.world)).toEqual(
          rule,
        );
        expect(() =>
          assertWorldIntegrity(deserializeWorld(serializeWorld(result.world))),
        ).not.toThrow();
        if (signatures === required) {
          const election = result.world.history.futureDueItems.find(
            (row) => row.transitionKey === RECALL_ELECTION,
          )!;
          expect(election).toBeDefined();
          const voted = {
            world: resolveDueThrough(result.world, election.dueAt),
          };
          expect(recallPetitions(voted.world)[0]).toMatchObject({
            phase: "removed",
            yes: required,
            no: 0,
          });
        }
      }
    },
  );

  it.each(["retained", "removed"] as const)(
    "counts recorded resident views and %s leaves the other seats intact",
    (expected) => {
      const town = ordinaryStart(GRAND_ISLAND, "recall-A");
      const snapshot = qualifiedSnapshot(town);
      const residents = adultResidents(town).slice(0, 3);
      expect(residents).toHaveLength(3);
      const positions =
        expected === "removed"
          ? (["oppose", "oppose", "support"] as const)
          : (["support", "support", "oppose"] as const);
      const world = withViews(
        snapshot.world,
        town.member,
        residents,
        positions,
      );
      const result = recallElectionHandler(world, snapshot.due);
      expect(result.status).toBe("resolved");
      const outcome = recallPetitions(result.world)[0]!;
      expect(outcome.phase).toBe(expected);
      expect(outcome.yes! + outcome.no!).toBe(3);
      expect(outcome.yes).toBe(expected === "removed" ? 2 : 1);
      expect(outcome.no).toBe(expected === "removed" ? 1 : 2);
      const sitting = municipalSeats(result.world, town.governmentKey).map(
        (seat) => seat.personId,
      );
      if (expected === "retained") expect(sitting).toContain(town.member);
      else expect(sitting).not.toContain(town.member);
      const otherSeats = municipalSeats(town.world, town.governmentKey)
        .filter((seat) => seat.personId !== town.member)
        .map((seat) => seat.personId);
      expect(sitting).toEqual(expect.arrayContaining(otherSeats));
      expect(
        recallPetitions(deserializeWorld(serializeWorld(result.world))),
      ).toEqual(recallPetitions(result.world));
      expect(() => assertWorldIntegrity(result.world)).not.toThrow();
    },
    60_000,
  );

  it("keeps zero counts exact and does not extrapolate a turnout when views are absent", () => {
    const town = ordinaryStart(GRAND_ISLAND, "recall-A");
    const snapshot = qualifiedSnapshot(town);
    const missing = recallElectionHandler(snapshot.world, snapshot.due);
    expect(missing).toMatchObject({
      world: snapshot.world,
      status: "blocked",
      reasonKey: "recall:no-recorded-resident-views",
    });
    const resident = adultResidents(town)[0]!;
    const world = withViews(
      snapshot.world,
      town.member,
      [resident],
      ["support"],
    );
    const result = recallElectionHandler(world, snapshot.due);
    expect(recallPetitions(result.world)[0]).toMatchObject({
      phase: "retained",
      yes: 0,
      no: 1,
    });
    expect(recallResidentViews(world, snapshot.open)).toMatchObject({
      yes: 0,
      no: 1,
    });
  });

  it("uses the latest view once, ignores outsiders and conflicted residents, and preserves source IDs", () => {
    const town = ordinaryStart(GRAND_ISLAND, "recall-A");
    const snapshot = qualifiedSnapshot(town);
    const residents = adultResidents(town).slice(0, 2);
    let world = withViews(snapshot.world, town.member, residents, [
      "oppose",
      "conflicted",
    ]);
    world = withViews(world, town.member, [residents[0]!], ["support"]);
    const outsider = world.personOrder.find(
      (id) => world.people[id]!.homeJurisdictionId !== town.townId,
    )!;
    expect(outsider).toBeDefined();
    world = withViews(world, town.member, [outsider], ["oppose"]);
    const latest = world.history.privateBeliefs
      .filter((row) => row.personId === residents[0]!)
      .at(-1)!;
    const count = recallResidentViews(world, snapshot.open);
    expect(count).toMatchObject({
      yes: 0,
      no: 1,
      sourceRecordIds: [latest.id],
    });
    expect(count.registeredVoters).toBeGreaterThan(0);
    const result = recallElectionHandler(world, snapshot.due);
    expect(result.world.history.events.at(-1)!.tags).toContain(
      `view-source:${latest.id}`,
    );
  });

  it("lapses when the official leaves before the window closes", () => {
    const { world, governmentKey, player, member } = ordinaryStart(
      GRAND_ISLAND,
      "recall-A",
    );
    const started = petition(world, governmentKey, player, member);
    const closeDue = started.history.futureDueItems.find(
      (due) => due.transitionKey === RECALL_PETITION_CLOSES,
    )!;
    // The member resigns a week in: their seat ends on the record.
    let resigned = resolveDueThrough(started, addDays(started.currentDate, 7));
    const seat = municipalSeats(resigned, governmentKey).find(
      (row) => row.personId === member,
    )!;
    const prior = organizationParticipationStateHistory(
      resigned,
      seat.participationId,
    ).at(-1)!;
    resigned = recordOrganizationParticipationState(resigned, {
      stableKey: "fixture:resigned",
      participationId: seat.participationId,
      effectiveAt: resigned.currentDate,
      status: "ended",
      roleKind: prior.roleKind,
      context: "Resigned.",
      provenance: { kind: "authored", note: "Resignation fixture." },
      supersedesStateId: prior.id,
    });
    const closed = resolveDueThrough(resigned, closeDue.dueAt);
    expect(recallPetitions(closed)[0]!.phase).toBe("lapsed");
  }, 60_000);

  it("refuses a petitioner from out of town and a target with no seat", () => {
    const { world, governmentKey, player, member, townId } = ordinaryStart(
      GRAND_ISLAND,
      "recall-A",
    );
    const outsider = world.personOrder.find(
      (id) => world.people[id]!.homeJurisdictionId !== townId,
    );
    if (outsider)
      expect(
        canStartRecallPetition(world, {
          petitionerPersonId: outsider,
          governmentKey,
          targetPersonId: member,
        }),
      ).toMatchObject({ allowed: false });
    expect(
      canStartRecallPetition(world, {
        petitionerPersonId: member,
        governmentKey,
        targetPersonId: player,
      }),
    ).toMatchObject({
      allowed: false,
      reason: "That person does not sit on the town's governing body.",
    });
    expect(
      canStartRecallPetition(world, {
        petitionerPersonId: member,
        governmentKey,
        targetPersonId: member,
      }),
    ).toMatchObject({ allowed: false });
  }, 60_000);

  it("shows the resident whom they can petition against, then the petition", () => {
    const { world, governmentKey, player, member } = ordinaryStart(
      GRAND_ISLAND,
      "recall-A",
    );
    const before = serializeWorld(world);
    const view = projectRecall(world, governmentKey, player);
    // Reading the panel writes nothing.
    expect(serializeWorld(world)).toBe(before);
    expect(view.unavailable).toBeNull();
    expect(view.rule).toBe("A petition circulates for 30 days.");
    // Every seated official of the town can be petitioned against.
    const seats = municipalSeats(world, governmentKey);
    expect(view.targets).toHaveLength(seats.length);
    expect(view.targets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          personId: member,
          seatLabel: seats.find((seat) => seat.personId === member)!.seatLabel,
          refusal: null,
        }),
      ]),
    );
    expect(view.petitions).toEqual([]);

    const started = startProjectedRecallPetition(
      world,
      governmentKey,
      player,
      member,
    );
    const after = projectRecall(started, governmentKey, player);
    expect(
      after.targets.find((target) => target.personId === member)!.refusal,
    ).toBe("A recall petition against this official is already under way.");
    expect(after.petitions).toHaveLength(1);
    expect(after.petitions[0]).toMatch(
      /: a recall petition is circulating until [A-Z][a-z]+ \d+, \d{4}\.$/,
    );

    const indiana = ordinaryStart("1805860", "recall-B");
    expect(
      projectRecall(indiana.world, indiana.governmentKey, indiana.player),
    ).toEqual({
      unavailable: "Towns in Indiana cannot recall their officials.",
      rule: null,
      targets: [],
      petitions: [],
    });
  }, 60_000);

  it("refuses where the law gives no recall", () => {
    const reason = "Towns in Indiana cannot recall their officials.";
    const town = ordinaryStart("1805860", "recall-B");
    expect(municipalRecallRule(town.governmentKey)).toEqual({
      available: false,
      reason,
    });
    expect(
      canStartRecallPetition(town.world, {
        petitionerPersonId: town.player,
        governmentKey: town.governmentKey,
        targetPersonId: town.member,
      }),
    ).toEqual({ allowed: false, reason });
    expect(() =>
      petition(town.world, town.governmentKey, town.player, town.member),
    ).toThrow(reason);
  }, 60_000);

  it("gives an unsettled state the national modal rule, chosen by no hash (A118)", () => {
    // New Mexico's pack does not settle town recall, so its rule is the one
    // the most state packs name: towns may not recall (17 of the 41 packs
    // that settle it), ESTIMATED FROM AVERAGE, the same for every unread
    // place and save. A recall law enacted in play still replaces it.
    const town = ordinaryStart("3570500", "recall-B");
    const rule = municipalRecallRule(town.governmentKey);
    expect(rule).toEqual({
      available: false,
      reason: "Towns in New Mexico cannot recall their officials.",
    });
    expect(municipalRecallRule(town.governmentKey)).toEqual(rule);
  }, 60_000);
});
