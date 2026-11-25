/**
 * The outcome web carries its levels forward (pins family 7): a kept outcome is last
 * month's level moved by the month's change in its links' push, so what else moved it
 * stays in it. The town's own presidential election moves `voting.turnout-pct` to the
 * share of its eligible voters its count reached, and the months after carry on from
 * there. On main every month rebuilt the outcome from the published 2024 level times its
 * links, so the town's election never reached it. A place is drawn from all 56; a place
 * whose voters have no vote for President (a territory) is passed over and named. Set
 * WEB_CARRIES_SEED to replay a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { ELECTIONS_MODULE_ID } from "./modules/elections";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { VOTING_MODULE_ID } from "./voting-module-id";
import { federalOffices } from "./offices-state";
import { baseOf } from "./outcome-web-model";
import { placeStateKey } from "./place-map";
import { coreAPI } from "./state";

const seed = process.env.WEB_CARRIES_SEED ?? randomBytes(8).toString("hex");
const TURNOUT = "voting.turnout-pct";

it("carries the town's own presidential turnout in the web's level, and the months after carry on from it", () => {
  setBookkeeping(false);
  const startedAt = gameStartDate();
  const passed: string[] = [];
  let place = drawPlace(seed, "outcome-web-carries");
  const votesForPresident = (drawn: typeof place) =>
    federalOffices(drawn.state, drawn.key, startedAt).some(
      ({ office }) => office.kind === "president" && office.coversTown,
    );
  for (let n = 1; !votesForPresident(place); n += 1) {
    const skipped = `${place.name}, ${place.state} (${place.key}), world seed ${place.seed}`;
    passed.push(skipped);
    process.stdout.write(
      `PRESIDENTIAL TURNOUT passed over ${skipped} (no vote for President, replay ${seed})\n`,
    );
    place = drawPlace(`${seed}:${String(n)}`, "outcome-web-carries");
  }
  const where = `${place.name}, ${place.state} (${place.key}), world seed ${place.seed}, replay ${seed}${passed.length ? `; passed over (no vote for President): ${passed.join("; ")}` : ""}`;
  const { core } = buildBenchWorld(place.seed, startedAt, {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const town = core.people.get(core.playerId!)!.placeId;
  const web = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
  // Through the presidential election of November 2028.
  advanceCore(core, makeIsoDate("2028-12-05"));
  const contest = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as {
      id: string;
      officeId: string;
      electionDate: string;
    }[]
  ).find(
    (c) =>
      c.officeId === "office:US:president" && c.electionDate.startsWith("2028"),
  );
  expect(contest, `${where}: no presidential contest in 2028`).toBeDefined();
  const result = api
    .moduleState(VOTING_MODULE_ID)
    .table("results")
    .get(`result:${contest!.id}`) as unknown as
    | {
        id: string;
        namedTurnout: number;
        namedEligible: number;
        countedTurnout: number;
        countedEligible: number;
      }
    | undefined;
  expect(result, `${where}: the town's count of ${contest!.id}`).toBeDefined();
  const recorded =
    (100 * (result!.namedTurnout + result!.countedTurnout)) /
    (result!.namedEligible + result!.countedEligible);
  // Through the next month, so the month after the count is carried too.
  advanceCore(core, makeIsoDate("2029-01-05"));
  const rows = (web.rows() as unknown as WebMonth[])
    .filter((row) => row.placeId === town)
    .sort((a, b) => a.month.localeCompare(b.month));
  const at = rows.findIndex((row) => row.engineSources[TURNOUT] === result!.id);
  const published = baseOf(
    TURNOUT,
    placeStateKey(core.placeMetadata.placeKey) ?? "",
    core.seed,
  ).value;
  expect(
    at,
    `${where}: no month of the web stands on ${result!.id}`,
  ).toBeGreaterThan(0);
  const before = rows[at - 1]!;
  const counted = rows[at]!;
  const after = rows[at + 1];
  process.stderr.write(
    `${where}: the web's turnout in ${before.month} ${before.values[TURNOUT]!.toFixed(2)}; the town's count ${recorded.toFixed(2)} (${result!.id}); ${counted.month} ${counted.values[TURNOUT]!.toFixed(2)}; ${after?.month ?? "no month"} ${after?.values[TURNOUT]?.toFixed(2) ?? "-"}; the published level with this world's draw ${published.toFixed(2)}\n`,
  );
  // The first month after the election stands on the town's count.
  expect(counted.month >= "2028-11", where).toBe(true);
  expect(counted.values[TURNOUT], where).toBeCloseTo(recorded, 9);
  // Main rebuilt it from the published level: the month's push times that level.
  expect(
    Math.abs(counted.values[TURNOUT]! - published * counted.pushes![TURNOUT]!),
    `${where}: the web's turnout is still the published level times its links`,
  ).toBeGreaterThan(1e-6);
  // The next month carries on from the count, moved only by the change in its links.
  expect(after, `${where}: no month after ${counted.month}`).toBeDefined();
  expect(after!.engineSources[TURNOUT], where).not.toBe(result!.id);
  expect(after!.values[TURNOUT], where).toBeCloseTo(
    counted.values[TURNOUT]! *
      (after!.pushes![TURNOUT]! / counted.pushes![TURNOUT]!),
    9,
  );
  // The opening level is read once: every month's base is the first month's.
  expect(after!.bases[TURNOUT], where).toBe(rows[0]!.bases[TURNOUT]);
}, 2_400_000);
