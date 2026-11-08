import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { gameStartDate } from "../core2/game-start";
import { federalAidFor, townDisasters } from "../core2/modules/disasters";
import {
  emergencyPower,
  EXECUTIVE_MODULE_ID,
} from "../core2/modules/executive";
import { townSeats } from "../core2/modules/offices";
import { advanceCore } from "../core2/life";
import { memberKey } from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import { ordersDecide, ordersView } from "./office";
import { buildBenchWorld } from "./world";

// A governor the player plays is offered a state of emergency when a federally declared disaster is
// recorded in the state: the engine never declares for them, the offer is theirs to take or let pass.
// A place drawn from all 56 on a seed nobody chose.
const seed =
  process.env.EMERGENCY_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`a state of emergency the player decides (seed ${seed})`, () => {
  it("offers the declaration to the player governor and declares it when they say so", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "player-emergency");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const governor = townSeats(api).find(
        (s) => s.office.kind === "governor",
      )?.holder;
      // A real FEMA disaster of this state with aid on the record (the game's own `townDisasters`).
      const disaster = townDisasters(api).find(
        (row) => federalAidFor(api, row.number) > 0,
      );
      if (!governor || !disaster || !emergencyPower(api)) {
        tried.push(
          `${where}: governor ${!!governor} disasters ${townDisasters(api).length} withAid ${townDisasters(api).filter((r) => federalAidFor(api, r.number) > 0).length} power ${!!emergencyPower(api)}`,
        );
        continue;
      }
      // The governor is the player: the engine names the player by the world's own player id.
      (core as { playerId?: string }).playerId = memberKey(governor);
      // The disaster is recorded the way the disasters engine records one when it begins:
      // a `hazard.disaster` record with the FEMA number, which the executive engine answers.
      api.emit({
        id: `disaster:${disaster.number}:forced-for-test`,
        date: core.date,
        kind: "hazard.disaster",
        personIds: [],
        placeId: core.people.get(core.playerId ?? "")?.placeId ?? world.placeId,
        publicRecord: true,
        news: true,
        facts: {
          disasterNumber: String(disaster.number),
          title: disaster.title,
          incidentType: disaster.type,
          statewide: String(disaster.statewide),
        },
        source: {
          tag: "SOURCED",
          citation: `FEMA disaster ${disaster.number}`,
          asOf: core.date,
        },
      });
      const stop = addDays(makeIsoDate(core.date), 12);
      for (let day = 0; day < 14 && core.date <= stop; day++) {
        const offer = ordersView(core).find((row) => row.kind === "emergency");
        if (offer) {
          ordersDecide(core, offer.entryId, "issue");
          const declared = api
            .moduleState(EXECUTIVE_MODULE_ID)
            .table("emergencies")
            .rows() as unknown as { executiveId: string }[];
          expect(declared.length, where).toBe(1);
          expect(declared[0]!.executiveId, where).toBe(memberKey(governor));
          console.log(
            `emergency: ${where}, declared by the player after disaster ${disaster.number}`,
          );
          return;
        }
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      }
      tried.push(`${where}: no offer by ${stop}`);
    }
    throw new Error(
      `no drawn place offered the player governor an emergency (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 1_800_000);
});
