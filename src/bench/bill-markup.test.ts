import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
import {
  authorityFor,
  draftBill,
  holdVote,
  type Provision,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { billStage } from "./bill-stage";
import { buildBenchWorld } from "./world";

// A bill's paper shows where it was referred and what its committee's markup added: a section traded for
// a holdout's vote or a pill from the member most against. A place drawn from all 56 on a seed nobody
// chose; the bills are policy questions the state may answer, sent to the state chamber.
const seed =
  process.env.MARKUP_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`the committee's markup on the paper (seed ${seed})`, () => {
  it("names the committee the bill went to and the sections markup added", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "markup");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const chamber = townSeats(api).find((s) =>
        s.office.kind.startsWith("legislature-"),
      );
      if (!chamber?.holder?.personId) {
        tried.push(`${where}: no state chamber`);
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
          sponsorId: chamber.holder.personId,
          provisions: [provision],
        });
        if (draft.status === "blocked") continue;
        holdVote(api, draft.id);
        const stage = billStage(core, draft.id, chamber.holder.personId);
        const marked = stage.committees.find((c) => c.markup.length > 0);
        if (marked) {
          expect(marked.committee.length, where).toBeGreaterThan(0);
          expect(marked.markup[0]!.inserted, where).toBeTruthy();
          console.log(
            `markup: ${where}, ${draft.id} referred to ${marked.committee}, ${marked.markup.map((m) => `${m.name} (${m.kind}): ${m.inserted}`).join("; ")}`,
          );
          return;
        }
      }
      tried.push(`${where}: no bill got a markup`);
    }
    throw new Error(
      `no drawn place's committee marked a bill up (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 1_500_000);
});
