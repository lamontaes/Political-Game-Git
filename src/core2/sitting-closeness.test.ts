/**
 * Members of a body know each other from the sittings they share
 * (sitting-closeness.ts). At a named place and seed: on day one, council
 * members who have sat together since before the world opened are tied by
 * those sittings, and the longer they have sat together the closer they are;
 * through two months of played meetings the ties grow; and crediting a
 * pair's shared sittings at once (as for a member filled in later) gives the
 * same closeness as crediting them sitting by sitting.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { closenessBetween } from "./closeness";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { bodyOf, memberKey, members } from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { catchUpSittings } from "./sitting-closeness";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

const PLACE = { key: "4846968", seed: "8647-mason" };

it("council members who sit together know each other, from day one and as they keep sitting", () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(PLACE.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE.key,
  });
  const api = coreAPI(core);
  const seat = townSeats(api).find(
    (row) =>
      row.office.level === "city" &&
      bodyOf(api, row.office.id) &&
      members(api, row.office.id).length >= 3,
  );
  expect(seat, `${PLACE.key} seed ${PLACE.seed}`).toBeTruthy();
  const terms = members(api, seat!.office.id)
    .filter((t) => t.personId && core.people.get(t.personId as PersonId))
    .map((t) => ({
      id: memberKey(t) as PersonId,
      since: t.serviceStart ?? t.startDate,
    }))
    .sort((a, b) => a.since.localeCompare(b.since) || a.id.localeCompare(b.id));
  const [first, second] = terms;
  const last = terms[terms.length - 1]!;
  // The two longest-serving members have sat together longer than either has
  // with the newest; all of them are tied on day one.
  expect(first!.since < last.since, "members with different starts").toBe(true);
  const long = closenessBetween(core, first!.id, second!.id);
  const short = closenessBetween(core, first!.id, last.id);
  process.stdout.write(
    `SITTINGS ${PLACE.key} seed ${PLACE.seed} ${seat!.office.id}: ${first!.id} (${first!.since}) and ${second!.id} (${second!.since}) ${long.toFixed(4)}; with ${last.id} (${last.since}) ${short.toFixed(4)}\n`,
  );
  expect(short).toBeGreaterThan(0);
  if (second!.since < last.since) expect(long).toBeGreaterThan(short);
  // Two months of meetings (among their other contacts): the newest
  // member's tie grows.
  advanceCore(core, addDays(makeIsoDate(core.date), 60));
  const grown = closenessBetween(core, first!.id, last.id);
  expect(grown).toBeGreaterThan(short);
  // The same sittings credited at once, as for a member filled in today,
  // give the same tie as crediting them one by one. Read on the state's
  // upper chamber, whose members (unlike the town's) share nothing else
  // here: the first pair the sittings tie on day one.
  const chamber = townSeats(api).find(
    (row) =>
      row.office.level === "state" &&
      bodyOf(api, row.office.id) &&
      members(api, row.office.id).length >= 3,
  )!.office.id;
  const ids = members(api, chamber)
    .map(memberKey)
    .filter((id) => core.people.get(id as PersonId)?.alive)
    .sort() as PersonId[];
  const pair = ids
    .flatMap((a, i) => ids.slice(i + 1).map((b) => [a, b] as const))
    .find(([a, b]) => closenessBetween(core, a, b) > 0)!;
  const [a, b] = pair;
  const key = `${a}:${b}`;
  const before = closenessBetween(core, a, b);
  core.relationships.delete(key);
  core.people.get(a)!.knownIds.delete(b);
  core.people.get(b)!.knownIds.delete(a);
  catchUpSittings(api, new Set([b]));
  const atOnce = closenessBetween(core, a, b);
  process.stdout.write(
    `  newest member after 60 days ${grown.toFixed(4)}; ${chamber} ${a} and ${b} sitting by sitting ${before.toFixed(5)}, at once ${atOnce.toFixed(5)}\n`,
  );
  // Equal but for temperament: the writer weighs each sitting's hours by the
  // pair's traits as they stood that day, and traits move a little in two
  // months, so the two agree to within one percent, not to the last digit.
  expect(Math.abs(atOnce - before) / before).toBeLessThan(0.01);
}, 75_000);
