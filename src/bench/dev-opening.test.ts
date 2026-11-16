/**
 * Dev mode's "How this world opened" (dev-views/opening.ts): for the town, the player, their
 * household, a business and an office of a built world, each opening value with how the opening
 * made it, asked through the bench's own request handler as the page asks. Pinned: Ridgeville,
 * Alabama (0164656), the draw "8341-pin"/"p6" dev-views.test.ts names.
 */
import type { IncomingMessage } from "node:http";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { handleDev } from "./dev-api";
import type { OpeningView } from "./dev-views/opening";
import SOURCES from "./dev-views/opening-sources.json" with { type: "json" };
import { buildBenchWorld } from "./world";

const PINNED = { run: "8341-pin", purpose: "p6", key: "0164656" };

const request = { method: "GET" } as unknown as IncomingMessage;

it("every row of the opening list names a kind the view knows", () => {
  const kinds = new Set(Object.keys(SOURCES.kinds));
  for (const [key, row] of Object.entries(SOURCES.rows)) {
    expect(kinds.has(row.made), key).toBe(true);
    expect(row.by.length, key).toBeGreaterThan(0);
    // A draw or a fixed number says what replaces it.
    if (row.made === "ad-hoc-draw" || row.made === "constant")
      expect("replace" in row && row.replace, key).toBeTruthy();
  }
});

it("shows how the town, the player, their household, a business and an office opened (Ridgeville AL)", async () => {
  setBookkeeping(false);
  const place = drawPlace(PINNED.run, PINNED.purpose);
  const where = `${place.name} (${place.key}), world seed ${place.seed}`;
  expect(place.key, `${where}: the pinned place moved`).toBe(PINNED.key);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const ask = async (query: string): Promise<OpeningView> => {
    let answer: { status: number; value: unknown } | undefined;
    await handleDev(
      request,
      new URL(`http://bench/api/dev/opening?${query}`),
      (status, value) => (answer = { status, value }),
      () => ({
        core: world.core,
        director: world.director,
        placeId: world.placeId,
      }),
    );
    expect(answer?.status, `${where}: ${query}`).toBe(200);
    return answer!.value as OpeningView;
  };
  const kinds = new Set(Object.values(SOURCES.kinds));

  const town = await ask("subject=town");
  const population = town.rows.find((r) => r.label === "People in town");
  expect(population?.made, where).toBe(SOURCES.kinds["world-offset"]);
  expect(population?.value, where).toMatch(/published/);
  expect(population?.drawKey, where).toMatch(/^world-place-population:/);
  expect(
    town.rows.find((r) => r.label === "President's approval on day one")?.made,
  ).toBe(SOURCES.kinds.constant);
  expect(
    town.rows.some((r) => r.label.startsWith("Share of jobs: ")),
    where,
  ).toBe(true);

  const person = await ask("subject=person");
  expect(person.id, where).toBe(world.core.playerId);
  expect(
    person.rows.filter((r) => r.label.startsWith("Trait: ")).length,
    `${where}: the player's traits`,
  ).toBeGreaterThan(0);
  expect(person.rows.find((r) => r.label === "Name")?.recordId).toBe(
    world.core.playerId,
  );

  const household = await ask("subject=household");
  expect(household.rows[0]!.value, where).not.toBe("0");

  const business = await ask("subject=business");
  expect(business.rows.find((r) => r.label === "Cash on day one")?.made).toBe(
    SOURCES.kinds["ad-hoc-draw"],
  );

  const office = await ask("subject=office");
  expect(office.choices.office.length, `${where}: town seats`).toBeGreaterThan(
    0,
  );
  expect(office.rows.map((r) => r.label)).toContain(
    "Share of the vote last time",
  );

  // Another person from the choices opens by id, and every row's kind is one of the list's.
  const other = person.choices.person.find((c) => c.id !== person.id);
  if (other)
    expect((await ask(`subject=person&id=${other.id}`)).id).toBe(other.id);
  for (const view of [town, person, household, business, office])
    for (const row of view.rows)
      expect(kinds.has(row.made), row.label).toBe(true);
}, 120_000);
