/**
 * A hearing witness on a labor question who has lost their job (brief V,
 * stage 1): the meetings engine's `concerns` still counts them as touched,
 * since their work record is on the books, but they hold no job today, so
 * `witnessLife` says they hold a view ("believes"), never a job record that
 * is not there. Year 1 at White Island Shores, Massachusetts (seed
 * "bill-stages-speed") crashed on this before the fix. Pinned to that place
 * with the world seed the witness test uses; the job ends through the
 * business's own layoff (jobs.ts layOffWorker).
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { coreAPI } from "../state";
import { witnessLife } from "./interest-groups";
import { layOffWorker } from "./jobs";
import { concerns } from "./meetings";

const PLACE = {
  name: "White Island Shores, Massachusetts",
  key: "2579390",
  seed: "60a7412dd46a80c4966b1f47f3908d4fa4dbf72a73c25c7337b79edffac0365a",
};
const LABOR = "us-policy-positions:labor-workforce.paid-family-leave";

it(`a witness laid off before a labor hearing holds a view, not a job (${PLACE.name})`, () => {
  const where = `${PLACE.name} (${PLACE.key}), world seed ${PLACE.seed}`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(PLACE.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE.key,
  });
  const api = coreAPI(core);
  // A full person with one job, which their employer lets go.
  const worker = [...core.people.values()]
    .filter((person) => person.alive)
    .map((person) => ({
      person,
      jobs: [...(core.work.commitmentsByPerson.get(person.id) ?? [])]
        .map((id) => core.work.commitments.get(id)!)
        .filter((row) => row && row.endsAt === undefined),
    }))
    .filter((row) => row.jobs.length === 1)
    .sort((a, b) => a.person.id.localeCompare(b.person.id))
    .find((row) => {
      const done = layOffWorker(api, row.jobs[0]!.jobId);
      return done !== null && done !== "worked-today" && done !== "over";
    });
  expect(worker, `${where}: a worker the business let go`).toBeTruthy();
  const person = core.people.get(worker!.person.id)!;
  const open = [...(core.work.commitmentsByPerson.get(person.id) ?? [])]
    .map((id) => core.work.commitments.get(id))
    .filter((row) => row && row.endsAt === undefined);
  expect(open, `${where}: no job today`).toEqual([]);
  // The case: still counted as touched by the labor question.
  expect(concerns(api, person)(LABOR), where).toBe(true);
  const life = witnessLife(api, person.id, LABOR);
  expect(life.life, where).not.toBe("works");
  expect(life.life, where).toBe("believes");
}, 60_000);
