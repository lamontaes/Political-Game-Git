/**
 * Dev mode's "why they lean" (voter-lean.ts), asked through the bench's own
 * request handler in a played world: the lean every race reads is the views
 * engine's own row scaled, the stances list the records that moved them, and
 * each race on the next election day shows each candidate's appeal by the
 * ballot's rule with the one it puts first. Pinned: Ridgeville, Alabama
 * (0164656), the draw "8341-pin"/"p6" dev-views.test.ts names, played to
 * Jul 20, 2025, after the Aug 26, 2025 town races' filing closed.
 */
import type { IncomingMessage } from "node:http";
import { expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../../core2/bookkeeping";
import { gameStartDate } from "../../core2/game-start";
import { advanceCore } from "../../core2/life";
import { handleDev } from "../dev-api";
import { buildBenchWorld } from "../world";
import { VIEWS_DATA } from "../../core2/modules/views";
import type { voterLeanWhy } from "./voter-lean";

const PINNED = { run: "8341-pin", purpose: "p6", key: "0164656" };
const PLAYED_TO = "2025-07-20";

type Why = ReturnType<typeof voterLeanWhy>;

function request(method: string): IncomingMessage {
  return {
    method,
    async *[Symbol.asyncIterator]() {},
  } as unknown as IncomingMessage;
}

it("dev mode says why a voter leans: the views row races read, the records that moved them, each race's appeal (Ridgeville AL)", async () => {
  setBookkeeping(false);
  const place = drawPlace(PINNED.run, PINNED.purpose);
  const where = `${place.name} (${place.key}), world seed ${place.seed}`;
  expect(place.key, `${where}: the pinned place moved`).toBe(PINNED.key);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  advanceCore(world.core, PLAYED_TO);
  const ask = async (path: string) => {
    let answer: { status: number; value: unknown } | undefined;
    const handled = await handleDev(
      request("GET"),
      new URL(`http://bench/api/dev/${path}`),
      (status, value) => (answer = { status, value }),
      () => ({
        core: world.core,
        director: world.director,
        placeId: world.placeId,
      }),
    );
    expect(handled, `${path} was not handled`).toBe(true);
    return answer!;
  };

  // The page lists the view's part for the person card's slot.
  expect((await ask("views")).value).toContainEqual({
    name: "voter-lean",
    client: "voter-lean.mjs",
    labels: { title: "Why they lean", trace: "Trace" },
  });

  // Every adult in town with a view, asked as a tester's click asks.
  const adults = [...world.core.people.values()]
    .filter((p) => p.alive && p.birthDate <= "2007-07-20")
    .sort((a, b) => a.id.localeCompare(b.id));
  const answers: Why[] = [];
  for (const person of adults) {
    const got = await ask(`voter-lean?id=${person.id}`);
    expect(got.status, `${where}: ${person.id}`).toBe(200);
    answers.push(got.value as Why);
  }
  const leanMax = VIEWS_DATA.parameters.leanMax!.value;
  for (const why of answers) {
    // The lean races read is the views engine's row, scaled: no second copy.
    expect(why.leanFrom, `${where}: ${why.personId}`).toBe("views.people");
    expect(why.leanRacesRead).toBeCloseTo(why.view!.lean / leanMax, 12);
    expect(why.view!.basis, `${where}: ${why.personId}`).toMatch(/^ces-/);
  }
  // Someone's stance names the campaign message or speech that moved it.
  const moved = answers.flatMap((why) =>
    why.stances.flatMap((s) => s.causes.map((c) => c.eventId)),
  );
  expect(moved.length, `${where}: no stance moved by Jul 20`).toBeGreaterThan(
    0,
  );
  // The next election day's races, each candidate's appeal and the first choice it gives.
  const races = answers.flatMap((why) => why.nextElection);
  expect(new Set(races.map((r) => r.electionDate))).toEqual(
    new Set(["2025-08-26"]),
  );
  const decided = races.filter((r) => r.appeal);
  expect(decided.length, `${where}: no race with a ballot`).toBeGreaterThan(0);
  for (const race of decided) {
    const totals = Object.entries(race.appeal!).map(
      ([id, a]) => [id, a.total] as const,
    );
    expect(totals.map(([id]) => id).sort()).toEqual(
      [...race.onTheBallot].sort(),
    );
    for (const [, parts] of Object.entries(race.appeal!))
      expect(Object.keys(parts)).toEqual(
        expect.arrayContaining(["party", "standing", "incumbent", "total"]),
      );
    const top = Math.max(...totals.map(([, t]) => t));
    if (race.firstChoice)
      expect(race.appeal![race.firstChoice]!.total).toBe(top);
  }
  process.stdout.write(
    `voter-lean ${where}: ${answers.length} adults, ${moved.length} stance causes, ${decided.length} race appeals\n`,
  );
}, 120_000);
