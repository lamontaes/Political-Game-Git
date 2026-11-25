import { afterAll, describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
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
import { billStage, followedBills } from "./bill-stage";
import { buildBenchWorld } from "./world";

// The bill paper's stage at every level: a bill drafted in the state's two chambers and in
// Congress's House (which sends it on to the Senate) is voted by the engine, and the stage
// view names each chamber's committee, floor result in words and every member by name.
// Two places drawn from all 56 on seeds nobody chose.
// Pinned (Nov 16, trial batch). Before, the seed came at run time from
// process.env BILL_LEVELS_SEED, GOLDEN_PATH_SEED or randomBytes, so the places
// it drew changed every run. The fixed seed below draws Harding-Birch Lakes,
// Alaska (0231765) first for "bill-levels".
// Limit (Nov 19, the hosted full run's red): a case draws up to ATTEMPTS
// places until a bill is voted in Congress, and a place where no House bill
// is allowed (no provision's authority passes there) is passed over. Which
// places allow one follows each world's laws, which the opening history sets,
// so the same pinned draws needed one attempt on main (Chester, South Dakota,
// 7 allowed) and three on the train (Chester and East Poultney, Vermont, 0
// allowed; Williston, North Dakota, 7). An attempt took 37 s here and 52 s on
// the hosted runner (place 1: 110 s and 157 s for three attempts), against 6 s
// on main; the old limit, twice the slowest single-attempt case (27 s), fired
// before the search's own bound. A case's limit is its search's bound: every
// attempt at twice the slower measured, 105 s.
const ATTEMPTS = 6;
const ATTEMPT_BUDGET_MS = 105_000;
const seed = "pin-bill-levels";

let congressSeen = false;

it("draws its pinned place from the fixed seed", () => {
  expect(drawPlace(`${seed}:0:0`, "bill-levels")).toMatchObject({
    key: "0231765",
    name: "Harding-Birch Lakes, Alaska",
  });
});

describe(`a bill at every level (seed ${seed})`, () => {
  afterAll(() => {
    expect(congressSeen, "a bill voted in Congress in one of the places").toBe(
      true,
    );
  });
  for (const turn of [0, 1])
    it(
      `the state's chambers and Congress, place ${turn}`,
      () => {
        const lines: string[] = [];
        let levels = 0;
        let sawCongress = false;
        for (
          let attempt = 0;
          attempt < ATTEMPTS && !sawCongress;
          attempt += 1
        ) {
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
              // Followed from home: this bill is on the list with where it stands and how the
              // place's own members voted on it.
              const followed = followedBills(world.core).find(
                (row) => row.id === draft.id,
              );
              expect(followed, `${draft.id} is followed`).toBeTruthy();
              expect(followed!.floor.length).toBe(stage.floor.length);
              lines.push(
                `followed: ${followed!.number} ${followed!.stage}, your members voted ${followed!.mine.map((m) => `${m.name} ${m.vote}`).join(", ") || "none on the floor"}; reaches your place: ${followed!.reachesYou}`,
              );
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
        congressSeen ||= sawCongress;
      },
      ATTEMPTS * ATTEMPT_BUDGET_MS,
    );
});
