import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import { gameStartDate } from "../core2/game-start";
import { lawInForce } from "../core2/modules/laws";
import {
  FEDERAL_HOUSE,
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

// The bill paper's stage at every level: a bill drafted in the state's two chambers and in
// Congress's House (which sends it on to the Senate) is voted by the engine, and the stage
// view names each chamber's committee, floor result in words and every member by name.
// Two places drawn from all 56 on seeds nobody chose.
const seed =
  process.env.BILL_LEVELS_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`a bill at every level (seed ${seed})`, () => {
  for (const turn of [0, 1])
    it(`the state's chambers and Congress, place ${turn}`, () => {
      const lines: string[] = [];
      let levels = 0;
      let sawCongress = false;
      for (let attempt = 0; attempt < 6 && !sawCongress; attempt += 1) {
        const draw = drawPlace(`${seed}:${turn}:${attempt}`, "bill-levels");
        const world = buildBenchWorld(draw.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: draw.key,
        });
        const api = coreAPI(world.core);
        const seats = townSeats(api);
        const floor = lawInForce(api, "minimum-wage").value ?? 0;
        const candidates: Provision[] = [
          {
            kind: "law-amount",
            series: "minimum-wage",
            value: floor + 100,
            unit: "minor/hour",
          },
          ...PLATFORM_QUESTIONS.map((question): Provision => ({
            kind: "policy-question",
            question,
            value: 1,
          })),
        ];
        const bodies = [
          seats.find((s) => s.office.kind === "legislature-lower")?.office.id,
          seats.find((s) => s.office.kind === "legislature-upper")?.office.id,
          FEDERAL_HOUSE,
        ].filter((id): id is string => Boolean(id));
        for (const body of bodies) {
          const sponsor = members(api, body)[0];
          if (!sponsor) continue;
          for (const provision of candidates.filter(
            (p) => authorityFor(api, p).allowed,
          )) {
            const draft = draftBill(api, {
              bodyOfficeId: body,
              sponsorId: memberKey(sponsor),
              provisions: [provision],
            });
            if (draft.status === "blocked") continue;
            holdVote(api, draft.id);
            const stage = billStage(world.core, draft.id, memberKey(sponsor));
            if (!stage.floor.length) continue;
            for (const chamber of stage.floor) {
              expect(chamber.result, draft.id).toMatch(
                /^(Adopted|Passed|Defeated), \d+ to \d+\.$/,
              );
              expect(
                chamber.yes.length + chamber.no.length,
                draft.id,
              ).toBeGreaterThan(0);
              for (const v of [...chamber.yes, ...chamber.no])
                expect(v.name.length, v.memberId).toBeGreaterThan(0);
            }
            levels += 1;
            if (body === FEDERAL_HOUSE) sawCongress = true;
            lines.push(
              `${draw.name} (${draw.key}, seed ${draw.seed}) ${body.startsWith("federal") ? "Congress" : body}: ${stage.floor
                .map((c) => `${c.chamber} ${c.result}`)
                .join(
                  " / ",
                )}; committees ${stage.committees.length}; ${stage.stage}`,
            );
            break;
          }
        }
      }
      console.log(lines.join("\n"));
      expect(levels, "a bill voted at the state or Congress").toBeGreaterThan(
        0,
      );
      expect(sawCongress, "a bill voted in both chambers of Congress").toBe(
        true,
      );
    }, 600_000);
});
