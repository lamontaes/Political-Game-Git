import { buildBenchWorld } from "../bench/world";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { memberKey } from "./modules/legislature";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { coreAPI } from "./state";

// A holder the offices engine seats by identity alone (a vacancy's filler, a successor) is a
// person from the day they take the seat: their key is in the people table the same day, so a
// body reads their own views, not their party. A place drawn from all 56 on a seed nobody chose.
const seed =
  process.env.SEATED_LATER_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`a later-seated holder is a person at once (seed ${seed})`, () => {
  it("fills in a state legislator's successor the day they take the seat", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const draw = drawPlace(`${seed}:${attempt}`, "seated-later");
      const world = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(world.core);
      const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;
      const terms = api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .rows() as unknown as TermRow[];
      const offices = api
        .moduleState(OFFICES_MODULE_ID)
        .table("offices")
        .rows() as unknown as { id: string; kind: string }[];
      const kindOf = new Map(offices.map((o) => [o.id, o.kind]));
      const target = terms.find(
        (t) =>
          t.status === "serving" &&
          t.personId &&
          (kindOf.get(t.officeId) ?? "").startsWith("legislature-"),
      );
      if (!target) {
        tried.push(`${where}: no state legislator seated`);
        continue;
      }
      api.updatePerson(target.personId!, { alive: false });
      api.emit({
        id: `test-death:${target.personId}`,
        date: world.core.date,
        kind: "life.death",
        personIds: [target.personId!],
        placeId: world.core.people.get(target.personId!)!.placeId,
        source: { tag: "SOURCED", citation: "test", asOf: world.core.date },
      });
      const now = (
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .query("bySeatStatus", [
            target.seatId,
            "serving",
          ]) as unknown as TermRow[]
      )[0];
      if (!now || now.id === target.id) {
        tried.push(`${where}: seat not refilled the same day`);
        continue;
      }
      expect(
        world.core.people.has(memberKey(now)),
        `${where}: ${now.id} is a person the day they take the seat`,
      ).toBe(true);
      console.log(
        `seated-later: ${where}: ${target.seatId} refilled by ${now.id}, personId ${now.personId ?? "(by key " + memberKey(now) + ")"}`,
      );
      return;
    }
    throw new Error(
      `no drawn place refilled a seat the same day: ${tried.join("; ")}`,
    );
  }, 600_000);
});
