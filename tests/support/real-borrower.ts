/**
 * A town borrower who really misses a payment, found by drawing places and
 * playing their days (promises.test.ts, apology-variants.test.ts). The credit
 * engine lends to a household's oldest member whose cash is below a month of
 * costs; the player a New game creator's birthday picks rarely is one (no
 * played player has borrowed and missed in the ten places and six birthdays
 * tried on Nov 17, a gap for Blockers), but the town misses dozens of
 * payments a year, each through the credit engine. The promise engine is one
 * rule for every person (CTO, Nov 17), so a test reads it on whoever the
 * credit engine's own missed payment and the partnerships engine's own quarrel
 * name. `findTownBorrower` draws a place, watches the town's borrowing heads
 * from day one (the director keeps a person's felt records only while it
 * watches them), plays the player's days, and stops at the first money
 * quarrel; a place with none is named and passed over.
 */
import { randomBytes } from "node:crypto";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import {
  leaveMeeting,
  meetingInProgress,
} from "../../src/core2/modules/office-day";
import { advancePlayerV1, resumePlayerV1 } from "../../src/core2/player-v1";
import { coreAPI } from "../../src/core2/state";
import type { CoreEventInput, CoreState, PersonId } from "../../src/core2/types";

/** Days the player's clock may run in one place before it is passed over: the loan is written at a month's close and billed monthly. */
const QUARREL_DAYS = 400;
/** Places drawn before the search fails by name. */
const MAX_PLACES = 8;
/** The seed a run draws its places from; a failed run is replayed with `GOLDEN_PATH_SEED`. */
export const LOAN_SEED = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** A money quarrel the credit engine's missed payment started, in a drawn place, and the world it happened in. */
export interface TownBorrower {
  readonly core: CoreState;
  readonly director: ReturnType<typeof buildBenchWorld>["director"];
  /** The New game player, whose clock plays the days. */
  readonly playerId: PersonId;
  /** The place, the seed, and every place passed over before it. */
  readonly where: string;
  readonly passedOver: string[];
  /** The draw to resume from when this place is passed over. */
  readonly nextDraw: number;
  /** The `family.quarrel` over a missed payment, and who owes whom. */
  readonly quarrel: CoreEventInput;
  /** The credit engine's missed payment the quarrel is over (the log keeps a record only for people it follows, so it is held here). */
  readonly missed: CoreEventInput;
  readonly borrowerId: PersonId;
  readonly owedId: PersonId;
}

/**
 * Draws places from `LOAN_SEED` until the town has a money quarrel over a
 * missed payment (any borrower: the engines are one rule for every person),
 * playing the player's own days. Fails by name, listing every place passed
 * over, when none of the drawn places has one.
 */
export function findTownBorrower(
  from = 0,
  passedOver: string[] = [],
): TownBorrower {
  for (let n = from; n < MAX_PLACES; n += 1) {
    const place = drawPlace(LOAN_SEED, `loan:${n}`);
    const label = `${place.name} (${place.key}), seed ${LOAN_SEED} draw loan:${n}, world seed ${place.seed}`;
    const built = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = built.core;
    const playerId = built.playerId as PersonId;
    built.director.watch(core, playerId);
    // The director keeps a person's felt records only from the day it begins
    // to watch them, so it watches the town's borrowing heads (a household
    // with a grown housemate whose cash is under a month of costs, the
    // credit engine's own shortfall test) before any payment is billed.
    const at = core.people.get(playerId)!.placeId;
    for (const household of core.households.values()) {
      if (household.placeId !== at) continue;
      const members = household.memberIds.flatMap((id) => {
        const person = core.people.get(id);
        return person?.alive ? [person] : [];
      });
      const head = [...members].sort(
        (a, b) =>
          a.birthDate.localeCompare(b.birthDate) || a.id.localeCompare(b.id),
      )[0];
      if (!head || members.length < 2) continue;
      const cash = members.reduce((sum, row) => sum + row.liquidMinor, 0);
      const costs =
        members.reduce((sum, row) => sum + row.livingCostDailyMinor, 0) * 30;
      if (cash < costs) {
        built.director.watch(core, head.id as PersonId);
        // HAND-STAGED: the borrower and their housemates are followed as the
        // player's own household is (state.ts keeps the durable record of a
        // followed person's days), so the missed payment, the quarrel and the
        // promise are kept as records the talk can read.
        for (const member of members)
          (core.focusPersonIds as unknown as Set<PersonId>).add(
            member.id as PersonId,
          );
      }
    }
    const found: CoreEventInput[] = [];
    const missedBy = new Map<string, CoreEventInput>();
    coreAPI(core).subscribeEvents(
      "town-borrower-missed",
      ["credit.payment-missed"],
      (_, event) => {
        missedBy.set(event.id, event);
      },
    );
    coreAPI(core).subscribeEvents(
      "town-borrower",
      ["family.quarrel"],
      (_, event) => {
        if (event.facts?.missedId && event.facts.owes) found.push(event);
      },
    );
    const until = addDays(makeIsoDate(core.date), QUARREL_DAYS);
    while (!found.length && core.date < until) play(core, playerId, 15);
    const quarrel = found[0];
    if (!quarrel) {
      passedOver.push(`${label}: no money quarrel by ${core.date}`);
      continue;
    }
    const missed = missedBy.get(String(quarrel.facts!.missedId));
    if (!missed) {
      passedOver.push(
        `${label}: the quarrel ${quarrel.id} named a missed payment the credit engine did not emit`,
      );
      continue;
    }
    const borrowerId = String(quarrel.facts!.owes) as PersonId;
    const owedId = quarrel.personIds.find((id) => id !== borrowerId) as PersonId;
    return {
      core,
      director: built.director,
      playerId,
      where: label,
      nextDraw: n + 1,
      passedOver,
      quarrel,
      missed,
      borrowerId,
      owedId,
    };
  }
  throw new Error(
    `no drawn place had a money quarrel over a missed payment in ${QUARREL_DAYS} days (${passedOver.length} places passed over): ${passedOver.join("; ")}`,
  );
}

/** Plays the player's days with the clock, taking the first choice at each pause (meeting-scene.test.ts). */
export function play(
  core: CoreState,
  playerId: PersonId,
  days: number,
  /** Stop partway into the last day (the player still inside it); midnight by default. */
  minuteOfDay = 0,
) {
  let packet: ReturnType<typeof advancePlayerV1> | undefined = advancePlayerV1(
    core,
    {
      controlledPersonId: playerId,
      through: { date: addDays(makeIsoDate(core.date), days), minuteOfDay },
    },
  );
  while (packet && packet.kind !== "complete") {
    // A resident held at a meeting they marked sits through its public
    // comment and leaves (office-day's own act, which records that they came).
    const meeting =
      packet.kind === "stop" ? meetingInProgress(coreAPI(core)) : undefined;
    if (meeting?.audience === playerId) leaveMeeting(coreAPI(core), meeting.id);
    packet =
      packet.kind === "stop"
        ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
        : resumePlayerV1(core, {
            kind: "choice",
            pauseId: packet.pauseId,
            offerId: packet.offers[0]!.offerId,
          });
  }
}
