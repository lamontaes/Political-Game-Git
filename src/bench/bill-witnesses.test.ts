import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import { gameStartDate } from "../core2/game-start";
import {
  authorityFor,
  draftBill,
  holdVote,
  memberKey,
  members,
  type Provision,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { billStage } from "./bill-stage";
import { buildBenchWorld } from "./world";

// A hearing on a bill that is not a wage bill hears the residents the interest groups' records
// show on each side of its question, by name. Places drawn from all 56 on seeds nobody chose.
const seed =
  process.env.WITNESS_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`witnesses on a non-wage bill (seed ${seed})`, () => {
  it("hears people on a policy question at a state committee", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "witnesses");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(world.core);
      const chamber = townSeats(api).find((s) =>
        s.office.kind.startsWith("legislature-"),
      );
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      if (!chamber?.holder?.personId) {
        tried.push(`${where}: no chamber`);
        continue;
      }
      for (const question of PLATFORM_QUESTIONS) {
        const provision: Provision = {
          kind: "policy-question",
          question,
          value: 1,
        };
        if (!authorityFor(api, provision).allowed) continue;
        const draft = draftBill(api, {
          bodyOfficeId: chamber.office.id,
          sponsorId: memberKey(members(api, chamber.office.id)[0]!),
          provisions: [provision],
        });
        if (draft.status === "blocked") continue;
        holdVote(api, draft.id);
        const stage = billStage(world.core, draft.id);
        const heard = stage.committees.find(
          (c) => c.heard && c.witnesses.length,
        );
        if (!heard) continue;
        expect(
          heard.witnesses.every(
            (w) => w.name.length > 0 && /^(for|against)$/.test(w.stake),
          ),
          where,
        ).toBe(true);
        console.log(
          `witnesses: ${where}, ${question}: ${heard.witnesses.map((w) => `${w.name} ${w.stake}`).join(", ")}`,
        );
        return;
      }
      tried.push(`${where}: no hearing with witnesses`);
    }
    throw new Error(
      `no drawn place heard witnesses on a non-wage bill (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 900_000);
});
