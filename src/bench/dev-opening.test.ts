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
import { buildBenchWorld, OPENING_WARMUP_DAYS } from "./world";
import { coreAPI } from "../core2/state";
import {
  type ApprovalRow,
  NATIONAL_OPINION_MODULE_ID,
  presidentElection,
} from "../core2/modules/national-opinion";

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
  // New Game's options, its warm-up month included, so the month's engines have run once.
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    warmUpDays: OPENING_WARMUP_DAYS,
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
  // The president's approval opens at the share of the vote their 2024 race recorded, kept on
  // their term; the game opens on Inauguration Day, so no month of the term moved it before.
  const api = coreAPI(world.core);
  const election = presidentElection(api);
  expect(
    election,
    `${where}: the race that seated the president`,
  ).toBeDefined();
  expect(election!.date, where).toBe("2024-11-05");
  const approval = town.rows.find(
    (r) => r.label === "President's approval on day one",
  );
  expect(approval?.made, where).toBe(SOURCES.kinds.decision);
  expect(approval?.recordId, where).toBe(election!.termId);
  expect(approval?.drawKey, where).toBeUndefined();
  const opened = election!.share * api.parameter("macroHundred");
  expect(Number.parseFloat(approval?.value ?? ""), where).toBeCloseTo(
    opened,
    2,
  );
  // The engine starts there: its first row is dated on Inauguration Day's month, cites the term,
  // and none was written for the warm-up's weeks before the term began.
  const rows = [
    ...(api
      .moduleState(NATIONAL_OPINION_MODULE_ID)
      .table("approval")
      .rows() as unknown as ApprovalRow[]),
  ].sort((a, b) => a.month.localeCompare(b.month));
  expect(rows[0]?.month, `${where}: the first approval month`).toBe("2025-01");
  expect(rows[0]!.basePct, where).toBeCloseTo(opened, 9);
  expect(rows[0]!.economyPull, where).toBeCloseTo(0, 12);
  expect(rows[0]!.sourceRecordIds[0], where).toBe(election!.termId);
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
  // The player's age when the life began, and how the opening set it (no birthday chosen here).
  const age = person.rows.find((r) => r.label === "Age when the life began");
  expect(age?.made, where).toBe(SOURCES.kinds.generation);
  expect(Number(age?.value), where).toBeGreaterThanOrEqual(18);
  expect(age?.drawKey, where).toMatch(
    /^opening-player:\S+: 0\.\d{3}, one of [\d,]+ adults in id order$/,
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
  // The town's U.S. House seat. Its 2024 race was uncontested (Clerk of the House, AL-03:
  // no two-party share), so the research holds no share for it and the last share is still
  // drawn inside the House band; offices-past-results.test.ts pins a contested seat, read as
  // the real result moved by the world's drift.
  const houseSeat = office.choices.office.find((c) =>
    c.id.includes(":us-house:"),
  );
  expect(houseSeat?.id, `${where}: the town's House seat`).toBe(
    "seat:US-AL:us-house:03",
  );
  const house = await ask(`subject=office&id=${houseSeat!.id}`);
  const houseShare = house.rows.find(
    (r) => r.label === "Share of the vote last time",
  );
  expect(houseShare?.made, where).toBe(SOURCES.kinds["ad-hoc-draw"]);
  expect(houseShare?.value, where).toMatch(/ in 2024$/);

  // Another person from the choices opens by id, and every row's kind is one of the list's.
  const other = person.choices.person.find((c) => c.id !== person.id);
  if (other)
    expect((await ask(`subject=person&id=${other.id}`)).id).toBe(other.id);
  for (const view of [town, person, household, business, office])
    for (const row of view.rows)
      expect(kinds.has(row.made), row.label).toBe(true);
}, 25_000);
