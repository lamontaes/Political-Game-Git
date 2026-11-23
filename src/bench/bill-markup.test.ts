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
// Pinned (Nov 16, trial batch). Before, the seed came at run time from
// process.env MARKUP_SEED, GOLDEN_PATH_SEED or randomBytes, so the places it
// drew changed every run. The fixed seed below draws Robbins, California
// (0662168) first for "markup", and the test passes over a place whose
// committees mark up nothing, naming it.
// Limit: the slowest case took 23 s, run two files at a time (Nov 16,
// Train 6d12556a). On Nov 19 (train 3c41e9f8) the history from 1925 left
// Robbins, Santel (Texas) and Woodworth (North Dakota) with no bill marked
// up, and the fourth draw, Rhodell (West Virginia), had one: 73 s alone, each
// new world seed costing the century's opening. The limit is about twice
// that, 150 s, until Speed's cut of the per-seed cost.
const seed = "pin-bill-markup";

it("draws its pinned place from the fixed seed", () => {
  expect(drawPlace(`${seed}:0`, "markup")).toMatchObject({
    key: "0662168",
    name: "Robbins, California",
  });
});

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
  }, 150_000);
});
