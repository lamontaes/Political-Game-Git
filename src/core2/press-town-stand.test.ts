/**
 * Where the town stands on a question, which a candidate shades an answer
 * toward (`townStand`), is the mean of the town's electorate's own stances in
 * both tiers, by the one reader of where the town stands (`electorateSides`,
 * which a candidate's platform weighs too): each named adult once, at the
 * view the ballot reads them by, and each counted record by the people it
 * stands for. Counted here apart from the engine by the ballot's agreement
 * readers (campaign-platform-test-kit.ts). A place drawn from all 56 on a
 * fresh seed (PRESS_STAND_SEED replays one), built two-level as the game
 * builds it.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../tests/golden-path/place";
import { sidesByAgreement } from "./campaign-platform-test-kit";
import { PLATFORM_QUESTIONS, questionAxis } from "./campaign-views";
import { countedResidents } from "./electorate";
import { gameStartDate } from "./game-start";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { lawChain } from "./modules/laws";
import { townStand } from "./modules/press";
import {
  agreementWith,
  countedLean,
  countedStanceProfile,
  viewOf,
} from "./modules/views";
import { electorateRoll, voterLean } from "./modules/voting";
import { coreAPI, fillInPerson } from "./state";
import type { CoreState } from "./types";

const seed = process.env.PRESS_STAND_SEED ?? randomBytes(8).toString("hex");

it("counted residents move where the town stands by the people they stand for, and one filled in keeps their lean", () => {
  const question = PLATFORM_QUESTIONS.find((q) => questionAxis(q) !== 0)!;
  const passed: string[] = [];
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "press-town-stand");
    const core = buildBenchWorld(`${seed}:${draw}`, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    }).core as CoreState;
    const api = coreAPI(core);
    const town = lawChain(api).townPlaceId;
    const adult = (birthDate: string) =>
      ageOnDate(makeIsoDate(birthDate), core.date) >= 18;
    const roll = electorateRoll(api);
    const named = roll.filter((row) => row.target === "person");
    const counted = countedResidents(core).filter(
      (v) => v.placeId === town && adult(v.birthDate),
    );
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    if (!named.length || !counted.length) {
      passed.push(`${where}: ${named.length} named, ${counted.length} counted`);
      continue;
    }
    // Both tiers, and the named voters alone, by the ballot's readers.
    const both = sidesByAgreement(api, question, {
      agreementWith,
      countedStanceProfile,
    });
    const namedOnly =
      named.reduce(
        (t, row) =>
          t +
          agreementWith(api, row.id, voterLean(api, core.people.get(row.id)!), [
            { question, position: 1 },
          ]),
        0,
      ) / named.length;
    const stand = townStand(api, question);
    console.log(
      `${where}: ${named.length} named voters, ${roll.length - named.length} counted records for ${(both.people - named.length).toFixed(0)} voters; stand ${stand.toFixed(4)}, named voters alone ${namedOnly.toFixed(4)}`,
    );
    expect(stand, where).toBeCloseTo(both.mean, 10);
    expect(Math.abs(stand - namedOnly), where).toBeGreaterThan(1e-6);
    // A counted adult filled in keeps the lean they were counted with; the
    // people their record stood for go to their group, so the stand barely moves.
    const voter = counted[0]!;
    const before = countedLean(api, voter);
    fillInPerson(core, voter.id);
    expect(viewOf(api, voter.id)!.lean, where).toBe(before);
    const after = townStand(api, question);
    console.log(
      `${where}: after filling in ${voter.id}, stand ${after.toFixed(4)}`,
    );
    expect(Math.abs(after - stand), where).toBeLessThan(0.02);
    return;
  }
  throw new Error(
    `No drawn place had voters in both tiers: ${passed.join("; ")}`,
  );
}, 900_000);
