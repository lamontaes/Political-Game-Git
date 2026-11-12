import { buildBenchWorld } from "./world";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
import { gameStartDate } from "../core2/game-start";
import {
  authorityFor,
  castMemberVote,
  draftBill,
  holdVote,
  memberKey,
  members,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreStateName } from "../core2/place-lookup";
import { coreAPI } from "../core2/state";
import { wordPrintedStory } from "./archive-words";

// A vote story names the state of the chamber that voted ("the Connecticut House of Representatives"),
// not only "the House of Representatives". A place drawn from all 56 on a seed nobody chose.
const seed =
  process.env.VOTE_STORY_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`a state chamber's vote story (seed ${seed})`, () => {
  it("names the state", () => {
    setBookkeeping(false);
    const tried: string[] = [];
    for (let i = 0; i < 16; i += 1) {
      const draw = drawPlace(`${seed}:${i}`, "vote-story-state");
      const world = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const chamber = townSeats(api).find((s) =>
        s.office.kind.startsWith("legislature-"),
      );
      if (!chamber) {
        tried.push(`${draw.name}: no state chamber`);
        continue;
      }
      const seated = members(api, chamber.office.id);
      const sponsor = seated[0];
      if (!sponsor) continue;
      for (const question of PLATFORM_QUESTIONS) {
        const provision = {
          kind: "policy-question" as const,
          question,
          value: 1,
        };
        if (!authorityFor(api, provision).allowed) continue;
        const draft = draftBill(api, {
          bodyOfficeId: chamber.office.id,
          sponsorId: memberKey(sponsor),
          provisions: [provision],
        });
        if (draft.status === "blocked") continue;
        for (const m of seated)
          castMemberVote(api, draft.id, memberKey(m), "yes");
        holdVote(api, draft.id);
        const vote = [...core.durableLog.values()].find(
          (row) =>
            row.kind === "legislative-vote" &&
            (row as { facts?: Record<string, string> }).facts?.chamber ===
              chamber.office.id,
        ) as unknown as
          | { id: string; date: string; facts: Record<string, string> }
          | undefined;
        if (!vote) continue;
        const worded = wordPrintedStory(core, {
          id: `printed:test:${vote.id}`,
          kind: "press.printed",
          date: vote.date,
          topic: question,
          facts: { ...vote.facts, sourceRecordId: vote.id },
        });
        const text = [
          worded?.headline,
          worded?.lede,
          ...(worded?.paragraphs ?? []),
        ].join(" ");
        const usps = chamber.office.jurisdiction.slice(3);
        if (!worded) continue;
        console.log(
          `vote-story: ${draw.name} (${draw.key}, seed ${draw.seed}) ${chamber.office.jurisdiction}: ${text}`,
        );
        expect(text, draw.name).toMatch(
          new RegExp(
            `${coreStateName(usps) ?? usps} (State |Territorial )?(House|Senate|Assembly|Legislature|General|Council|Delegates)`,
          ),
        );
        return;
      }
      tried.push(`${draw.name}: no vote story`);
    }
    throw new Error(
      `no drawn place worded a state vote (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 1_800_000);
});
