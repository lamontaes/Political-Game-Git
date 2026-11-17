/**
 * Appointed to fill a vacancy (owner, Nov 16: "you can only be appointed to council, like the playable
 * offices"; CTO, Nov 17: the player can be considered on a record of service, campaign work or a party
 * committee; crew list #9747, item 3a). When a town seat the player could run for falls vacant and the
 * place's law fills it by appointment, the appointing body offers it to a player whose record brings them
 * to notice: a `seat-appointment-offered` record, and a yes in the scene seats them for the rest of the
 * term. A player with no such record is not offered the seat, and a resident is seated as before.
 *
 * The vacancy is staged through the game's own call (`vacateSeat`, as a death does); the record of
 * service is the player's own filing. Drawn places (skill drawn-place-tests), named with their seeds;
 * a place whose rule elects instead of appointing, or with no open race for the player, is passed over.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { advanceToFilingOpen } from "./gov-test-clock";
import { applyCoreEvent, coreAPI } from "./state";
import type { CoreState } from "./types";
import {
  SEAT_OFFERED_EVENT,
  fileCandidacy,
  openContests,
  playerFilingBar,
} from "./modules/elections";
import {
  OFFICES_MODULE_ID,
  vacateSeat,
  type TermRow,
  type VacancyRow,
} from "./modules/offices";

/** Places drawn before the test says no case was found. Engineering value. */
const PLACES = 5;
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256")
    .update(`vacancy-offered-to-player:${Date.now()}`)
    .digest("hex");

function world(salt: string) {
  setBookkeeping(false);
  const place = drawPlace(runSeed, salt);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  return {
    core,
    where: `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`,
  };
}

/** A serving town seat the player could run for, filled by appointment when vacant, not the player's own district elsewhere. */
function appointedSeat(core: CoreState): TermRow | null {
  const api = coreAPI(core);
  const offices = api.moduleState(OFFICES_MODULE_ID);
  for (const contest of openContests(api)) {
    if (playerFilingBar(api, contest.id) !== null) continue;
    const office = offices
      .table("offices")
      .get(contest.officeId) as unknown as {
      vacancyRule?: { method: string };
    };
    if (office?.vacancyRule?.method !== "appointment") continue;
    const term = (
      offices
        .table("terms")
        .query("byOfficeStatus", [
          contest.officeId,
          "serving",
        ]) as unknown as TermRow[]
    ).find((t) => t.seatId === contest.seatId && t.personId !== core.playerId);
    if (term) return term;
  }
  return null;
}

const offersFor = (core: CoreState) =>
  [...core.durableLog.values()].filter(
    (e) => e.kind === SEAT_OFFERED_EVENT && e.facts?.askedId === core.playerId,
  );

describe("a vacant seat filled by appointment", () => {
  it("is offered to the player whose record brings them to notice, and a yes seats them", () => {
    const passedOver: string[] = [];
    for (let n = 0; n < PLACES; n += 1) {
      const { core, where } = world(`vacancy-offer:yes:${n}`);
      const api = coreAPI(core);
      advanceToFilingOpen(core);
      const seat = appointedSeat(core);
      const own = openContests(api).find(
        (c) => playerFilingBar(api, c.id) === null,
      );
      const filed = own
        ? fileCandidacy(api, {
            personId: core.playerId!,
            contestId: own.id,
            platform: [],
          })
        : null;
      if (!seat || !filed || filed.status === "refused") {
        passedOver.push(
          `${where}: ${!seat ? "no appointed playable seat" : "the player could not file"}`,
        );
        continue;
      }
      const vacancy = vacateSeat(api, seat.seatId, "death") as VacancyRow;
      expect(vacancy.status, where).toBe("offered");
      const offers = offersFor(core);
      expect(offers, where).toHaveLength(1);
      expect(offers[0]!.facts?.broughtUpBy, where).toBe(filed.filing.id);
      applyCoreEvent(core, {
        id: `scene-reply:test:${offers[0]!.id}`,
        date: core.date,
        kind: "scene.reply",
        personIds: [core.playerId!],
        placeId: core.people.get(core.playerId!)!.placeId,
        facts: {
          typeKey: "seat-appointment-offer",
          causeId: offers[0]!.id,
          move: "agree",
        },
        source: { tag: "SOURCED", citation: "test", asOf: core.date },
      });
      const now = api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("byOfficeStatus", [
          seat.officeId,
          "serving",
        ]) as unknown as TermRow[];
      const mine = now.find((t) => t.seatId === seat.seatId);
      expect(mine?.personId, where).toBe(core.playerId);
      console.log(
        `vacancy offered: ${where}: ${seat.seatId}; passed over: ${passedOver.join(" | ") || "none"}`,
      );
      return;
    }
    throw new Error(
      `No case in ${PLACES} drawn places: ${passedOver.join(" | ")}`,
    );
  }, 900_000);

  it("is not offered to a player with no record, and a resident is seated", () => {
    const passedOver: string[] = [];
    for (let n = 0; n < PLACES; n += 1) {
      const { core, where } = world(`vacancy-offer:no:${n}`);
      const api = coreAPI(core);
      advanceToFilingOpen(core);
      const seat = appointedSeat(core);
      if (!seat) {
        passedOver.push(`${where}: no appointed playable seat`);
        continue;
      }
      const vacancy = vacateSeat(api, seat.seatId, "death") as VacancyRow;
      expect(offersFor(core), where).toHaveLength(0);
      expect(vacancy.status, where).toBe("filled");
      console.log(`vacancy, no record: ${where}: ${seat.seatId}`);
      return;
    }
    throw new Error(
      `No case in ${PLACES} drawn places: ${passedOver.join(" | ")}`,
    );
  }, 900_000);
});
