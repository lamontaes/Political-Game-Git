// One model, two tiers: a job change keeps the people it stood for when it
// happened. A counted worker filled in later stands for one person from then
// on, but the hire or quit on record still counts their household's weight,
// so a month's turnover never changes after the fact. Merger 0's case on
// #5876: Niceville, Florida at three times the counts, where filling a worker
// in turned a three-person change into one.
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { countedHeadsOf } from "./residents-economy";
import { coreAPI, fillInPerson } from "./state";

const PLACE = {
  seed: "118d0e8a347d62a772645a1341bcffcd88ba3e3e064306cc90a3bacbb8590f7a",
  key: "1248750",
  name: "Niceville, Florida",
};

it("a job change keeps its people when the worker is filled in afterward", () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(PLACE.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE.key,
    countScale: 3,
  });
  const api = coreAPI(core);
  const changes = () =>
    api.moduleState("jobs").table("changes").rows() as unknown as {
      id: string;
      personId: string;
      heads?: number;
    }[];
  let change: { id: string; personId: string; heads?: number } | undefined;
  for (let day = 0; day < 120 && !change; day += 5) {
    advanceCore(core, addDays(makeIsoDate(core.date), 5));
    change = changes().find(
      (row) => (row.heads ?? 0) > 1 && !core.people.has(row.personId as never),
    );
  }
  const where = `${PLACE.name} (${PLACE.key}) seed ${PLACE.seed}`;
  expect(
    change,
    `${where}: no counted change of more than one person`,
  ).toBeDefined();
  // Every change on record kept its count.
  for (const row of changes())
    expect(row.heads, `${where}: ${row.id}`).toBeGreaterThan(0);
  const before = change!.heads!;
  fillInPerson(core, change!.personId as never);
  expect(countedHeadsOf(core, change!.personId)).toBeLessThan(before);
  const after = changes().find((row) => row.id === change!.id)!;
  expect(after.heads, `${where}: ${change!.id}`).toBe(before);
}, 900_000);
