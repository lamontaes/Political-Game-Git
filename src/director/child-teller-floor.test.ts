/**
 * A child under the news teller's age is never cast to tell news of
 * politics, money, law or work (Fable A, Nov 13, rule 28; Playtester P1,
 * Commack NY: a 4-year-old son cast to tell his mother who filed for town
 * board). The floor is read where every circumstance draws its cast
 * (`circumstancePicks`), from the age on the person's birth record; a row
 * whose news a child can know (`childMayTell`, the player's diploma) may still
 * cast them. Places are drawn from all 56 (seed from GOLDEN_PATH_SEED, random
 * when unset) until the player lives with a child under the floor and an
 * adult; the records are set by hand, since the check is of the cast alone,
 * and the child is made the one the player is closest to, so a cast without
 * the floor would be theirs.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import type { PersonId } from "../core2/types";
import {
  circumstancePicks,
  type CastWeights,
  type QueuedRecord,
} from "./circumstance";
import directorJson from "./data/director.json" with { type: "json" };

const seed = process.env.GOLDEN_PATH_SEED || randomBytes(10).toString("hex");
const DRAWS = 12;
const floor = (
  directorJson as unknown as {
    parameters: Record<string, { value: number }>;
  }
).parameters.directorCircumstanceNewsTellerMinAge!.value;

it(`no child under ${floor} is cast to tell news of money or law; a child's own news may be theirs (seed ${seed})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "child-teller-floor");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const player = playerId as PersonId;
    const today = makeIsoDate(core.date);
    const home = (
      core.households.get(core.people.get(player)!.householdId)?.memberIds ?? []
    ).filter((id) => id !== player && core.people.get(id)?.alive);
    const ageOf = (id: PersonId) =>
      ageOnDate(makeIsoDate(core.people.get(id)!.birthDate), today);
    const child = home.find((id) => ageOf(id) < floor);
    const adult = home.find((id) => ageOf(id) >= 18);
    if (!child || !adult) {
      passed.push(`${where}: no child under ${floor} and adult at home`);
      continue;
    }
    director.watch(core, player);
    const book = director.ledger.people.get(player)!;
    const weights = (newsTellerMinAge: number): CastWeights => ({
      named: 1,
      witnessed: 0.5,
      tie: 1,
      sociability: 0,
      traitScale: 1,
      newsTellerMinAge,
    });
    const options = {
      importance: (id: PersonId) => (id === child ? 100 : 0),
      staged: new Set<string>(),
      due: () => true,
    };
    const household = [player, ...home];
    // Money and law: the landlord's notice, which the household talks over.
    const notice: QueuedRecord = {
      id: "proof:housing.notice-served",
      kind: "housing.notice-served",
      personIds: household,
      witnessIds: [],
      facts: {},
      direct: true,
    };
    // The child's own news to tell: the player's diploma, the day after.
    const diploma: QueuedRecord = {
      id: "proof:school.finished",
      kind: "school.finished",
      personIds: household,
      witnessIds: [],
      facts: { passed: "true" },
      direct: true,
      later: true,
    };
    const cast = (queue: QueuedRecord[], min: number, rowId: string) =>
      circumstancePicks(core, book, queue, weights(min), options).find(
        (pick) => pick.row.id === rowId,
      )?.castId;
    const withFloor = cast([notice], floor, "notice-home");
    const withoutFloor = cast([notice], 0, "notice-home");
    const diplomaCast = cast([diploma], floor, "graduation-home");
    process.stderr.write(
      `child teller floor in ${where}: child ${child} aged ${ageOf(child)}; notice told by ${withFloor} (aged ${withFloor ? ageOf(withFloor) : "-"}); without the floor by ${withoutFloor}; the diploma by ${diplomaCast}; passed over: ${passed.join("; ") || "none"}\n`,
    );
    // Without the floor the child, the closest, is cast: the check bites.
    expect(withoutFloor, where).toBe(child);
    expect(withFloor, where).toBeDefined();
    expect(ageOf(withFloor!), where).toBeGreaterThanOrEqual(floor);
    expect(diplomaCast, where).toBe(child);
    return;
  }
  throw new Error(
    `no drawn place from seed ${seed} had a child under ${floor} at home: ${passed.join("; ")}`,
  );
}, 900_000);
