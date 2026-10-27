/**
 * Where the town stands on a question, which a candidate shades an answer
 * toward (`townStand`), is read from the town's adults in both tiers: each
 * full person once and each counted record by the people it stands for. A
 * place drawn from all 56 on a fresh seed (PRESS_STAND_SEED replays one),
 * built two-level as the game builds it.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../tests/golden-path/place";
import { PLATFORM_QUESTIONS, questionAxis } from "./campaign-views";
import { countedResidents } from "./electorate";
import { gameStartDate } from "./game-start";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { lawChain } from "./modules/laws";
import { townStand } from "./modules/press";
import { countedLean, viewOf } from "./modules/views";
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
    const full = [...(core.peopleByPlace.get(town) ?? [])]
      .map((id) => core.people.get(id)!)
      .filter((p) => p.alive && adult(p.birthDate));
    const counted = countedResidents(core).filter(
      (v) => v.placeId === town && adult(v.birthDate),
    );
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    if (!full.length || !counted.length) {
      passed.push(`${where}: ${full.length} full, ${counted.length} counted`);
      continue;
    }
    // Each tier read alone, on the views scale halved as the press reads it.
    const axis = questionAxis(question);
    const fullSum = full.reduce((s, p) => s + viewOf(api, p.id)!.lean / 2, 0);
    const countedSum = counted.reduce(
      (s, v) => s + (countedLean(api, v) / 2) * v.weight,
      0,
    );
    const countedWeight = counted.reduce((s, v) => s + v.weight, 0);
    const both =
      ((fullSum + countedSum) / (full.length + countedWeight)) * axis;
    const fullOnly = (fullSum / full.length) * axis;
    const stand = townStand(api, question);
    console.log(
      `${where}: ${full.length} full adults, ${counted.length} counted records for ${countedWeight.toFixed(0)} adults; stand ${stand.toFixed(4)}, full people alone ${fullOnly.toFixed(4)}`,
    );
    expect(stand, where).toBeCloseTo(both, 10);
    expect(Math.abs(stand - fullOnly), where).toBeGreaterThan(1e-6);
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
    `No drawn place had adults in both tiers: ${passed.join("; ")}`,
  );
}, 900_000);
