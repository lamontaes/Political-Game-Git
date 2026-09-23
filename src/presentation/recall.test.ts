import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import { municipalGovernmentForLifePlace } from "../simulation/municipal-government";
import {
  installMunicipalGovernment,
  municipalGovernmentJurisdictionId,
  municipalSeats,
  seatMunicipalMember,
} from "../simulation/municipal-public-work";
import {
  RECALL_ELECTION,
  RECALL_PETITION_CLOSES,
  RECALL_PROFILE,
  canStartRecallPetition,
  municipalRecallRule,
  recallPetitionKey,
  recallPetitionQualifies,
  recallPetitions,
  recallYesShare,
  startRecallPetition,
} from "../simulation/recall";
import type { EntityId, IsoDate, World } from "../simulation/types";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
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
function ordinaryStart(placeKey: string, seed: string) {
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
  // The council member is a neighbor who lives in town; seating them is the
  // fixture, since an ordinary start does not fill the council.
  const member = world.personOrder.find(
    (id) =>
      id !== player &&
      world.people[id]!.homeJurisdictionId === townId &&
      world.people[id]!.lifeStatus !== "deceased",
  )!;
  world = seatMunicipalMember(world, {
    governmentKey: government.key,
    personId: member,
    startedAt: world.currentDate,
    role: "member",
    seatLabel: "Seat 1",
  });
  return { world, governmentKey: government.key, player, member, townId };
}

function daysUntil(world: World, date: IsoDate): number {
  return (Date.parse(date) - Date.parse(world.currentDate)) / 86_400_000 + 1;
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

describe("recalling a town official", () => {
  it(
    "circulates a petition on the ordinary clock and decides it when the window closes",
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

      const closed = passOrdinaryDays(started, 31);
      const [after] = recallPetitions(closed);
      expect(["failed-to-qualify", "awaiting-election"]).toContain(
        after!.phase,
      );
      if (after!.phase === "awaiting-election")
        expect(
          closed.history.futureDueItems.some(
            (due) =>
              due.transitionKey === RECALL_ELECTION &&
              due.dueAt === after!.electionAt,
          ),
        ).toBe(true);
      const saved = deserializeWorld(serializeWorld(closed));
      expect(recallPetitions(saved)).toEqual(recallPetitions(closed));
      expect(() => assertWorldIntegrity(saved)).not.toThrow();
    },
  );

  it("draws qualification and the vote from the placeholder profile", () => {
    let qualified = 0;
    const trials = 2_000;
    for (let i = 0; i < trials; i += 1) {
      const key = `probe:${i}`;
      if (recallPetitionQualifies("recall-A", key)) qualified += 1;
      const yes = recallYesShare("recall-A", key);
      expect(yes).toBeGreaterThanOrEqual(RECALL_PROFILE.removeYesShare[0]);
      expect(yes).toBeLessThan(RECALL_PROFILE.removeYesShare[1]);
    }
    // About 35% qualify under the placeholder.
    expect(qualified / trials).toBeGreaterThan(0.3);
    expect(qualified / trials).toBeLessThan(0.4);
  });

  it(
    "fails, keeps or removes, and a removal empties the seat",
    { timeout: 300_000 },
    () => {
      const { world, governmentKey, player, member, townId } = ordinaryStart(
        GRAND_ISLAND,
        "recall-A",
      );
      // Which resident a petition targets is what varies the keyed draws, so
      // pick one resident per outcome and petition against them.
      const outcomeFor = (target: EntityId) => {
        const key = recallPetitionKey(governmentKey, target, world.currentDate);
        if (!recallPetitionQualifies(world.seed, key))
          return "failed-to-qualify";
        return recallYesShare(world.seed, key) > 5_000 ? "removed" : "retained";
      };
      const residents = world.personOrder.filter(
        (id) =>
          id !== player &&
          id !== member &&
          world.people[id]!.homeJurisdictionId === townId &&
          world.people[id]!.lifeStatus !== "deceased",
      );
      for (const expected of [
        "failed-to-qualify",
        "retained",
        "removed",
      ] as const) {
        const target = residents.find((id) => outcomeFor(id) === expected)!;
        expect(target, expected).toBeDefined();
        let seated = seatMunicipalMember(world, {
          governmentKey,
          personId: target,
          startedAt: world.currentDate,
          role: "member",
          seatLabel: "Seat 2",
        });
        seated = petition(seated, governmentKey, player, target);
        const closeDue = seated.history.futureDueItems.find(
          (due) => due.transitionKey === RECALL_PETITION_CLOSES,
        )!;
        // Through the ordinary clock, past the day the window closes.
        const closed = passOrdinaryDays(
          seated,
          daysUntil(seated, closeDue.dueAt),
        );
        const afterClose = recallPetitions(closed)[0]!;
        if (expected === "failed-to-qualify") {
          expect(afterClose.phase).toBe("failed-to-qualify");
          expect(
            closed.history.futureDueItems.some(
              (due) => due.transitionKey === RECALL_ELECTION,
            ),
          ).toBe(false);
          continue;
        }
        expect(afterClose.phase).toBe("awaiting-election");
        const electionDue = closed.history.futureDueItems.find(
          (due) => due.transitionKey === RECALL_ELECTION,
        )!;
        expect(electionDue.dueAt).toBe(afterClose.electionAt);
        const decided = passOrdinaryDays(
          closed,
          daysUntil(closed, electionDue.dueAt),
        );
        const outcome = recallPetitions(decided)[0]!;
        expect(outcome.phase).toBe(expected);
        expect(outcome.yes! + outcome.no!).toBe(10_000);
        const sitting = municipalSeats(decided, governmentKey).map(
          (seat) => seat.personId,
        );
        if (expected === "retained") expect(sitting).toContain(target);
        else expect(sitting).not.toContain(target);
        // The other council member is untouched either way.
        expect(sitting).toContain(member);
      }
    },
  );

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
    let resigned = passOrdinaryDays(started, 7);
    const seat = municipalSeats(resigned, governmentKey)[0]!;
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
    const closed = passOrdinaryDays(
      resigned,
      daysUntil(resigned, closeDue.dueAt),
    );
    expect(recallPetitions(closed)[0]!.phase).toBe("lapsed");
  });

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
  });

  it("draws an unsettled state's rule from the national range, not a refusal", () => {
    // New Mexico's pack does not settle town recall, so its rule is drawn
    // from the states that do, the same for every New Mexico town and save.
    const town = ordinaryStart("3570500", "recall-B");
    const rule = municipalRecallRule(town.governmentKey);
    expect(rule).toMatchObject({
      available: true,
      stateUsps: "NM",
      doctrineBasis: "national-range-drawn",
      circulationBasis: "national-range-drawn",
      threshold: null,
    });
    expect(municipalRecallRule(town.governmentKey)).toEqual(rule);
    const started = petition(
      town.world,
      town.governmentKey,
      town.player,
      town.member,
    );
    expect(recallPetitions(started)[0]!.phase).toBe("circulating");
  });

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
  });

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
    expect(view.targets).toEqual([
      expect.objectContaining({
        personId: member,
        seatLabel: "Seat 1",
        refusal: null,
      }),
    ]);
    expect(view.petitions).toEqual([]);

    const started = startProjectedRecallPetition(
      world,
      governmentKey,
      player,
      member,
    );
    const after = projectRecall(started, governmentKey, player);
    expect(after.targets[0]!.refusal).toBe(
      "A recall petition against this official is already under way.",
    );
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
  });
});
