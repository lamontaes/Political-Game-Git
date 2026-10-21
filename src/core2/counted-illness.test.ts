import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { SERIOUS_EPISODE_REMAINING_DAYS } from "./death-causes";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { healthReport } from "./modules/health";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { coreAPI, fillInPerson } from "./state";
import type { CountedIllnessRow } from "./counted-illness";

// A counted person's death follows a serious illness, from the same rule as
// a full person's (owner, Oct 16): the group's illnesses in a month come from
// its members' life-table shares, the one who dies was ill first, and a
// counted person filled in while ill is ill in their health record.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "counted-illness");

interface CountsRow {
  id: string;
  month: string;
  startPeople: number;
  deaths: string[];
  fellIll: string[];
  openingIll: string[];
  ill: number;
}

it(`counted deaths follow an illness, and a filled-in ill person keeps it, in ${place.name}, seed ${seed}`, () => {
  // The monthly counted record read below is kept only under bookkeeping.
  setBookkeeping(true);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const where = JSON.stringify({ seed, place: place.name });
  const api = coreAPI(core);
  const renewal = api.moduleState(RENEWAL_MODULE_ID);
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const rows = renewal.table("counts").rows() as unknown as CountsRow[];
  expect(rows.length, where).toBeGreaterThan(0);

  // Illnesses appear as group counts by month, and every death follows one.
  const fell = rows.flatMap((row) => row.fellIll);
  const ill = new Set([...fell, ...rows.flatMap((row) => row.openingIll)]);
  const deaths = rows.flatMap((row) => row.deaths);
  expect(fell.length, where).toBeGreaterThan(0);
  expect(deaths.length, where).toBeGreaterThan(0);
  for (const id of deaths) expect(ill.has(id), `${where}: ${id}`).toBe(true);

  // The share ill at a time is the yearly death rate times the course of an
  // illness (30 to 300 days): never more than the longest course allows, and
  // not none.
  const people = rows.reduce((n, row) => n + row.startPeople, 0) / rows.length;
  const perMonth = new Map<string, { ill: number; people: number }>();
  for (const row of rows) {
    const total = perMonth.get(row.month) ?? { ill: 0, people: 0 };
    total.ill += row.ill;
    total.people += row.startPeople;
    perMonth.set(row.month, total);
  }
  const shares = [...perMonth.values()].map((m) => m.ill / m.people);
  const share = shares.reduce((a, b) => a + b, 0) / shares.length;
  const yearly = deaths.length / people;
  expect(share, where).toBeGreaterThan(0);
  expect(share, where).toBeLessThanOrEqual(
    (yearly * SERIOUS_EPISODE_REMAINING_DAYS.longest * 1.5) / 365,
  );

  // A counted person who is ill when filled in is ill in their record, with
  // the group's own onset date, and dies when the group set.
  const sick = (
    renewal.table("countedIllness").rows() as unknown as CountedIllnessRow[]
  ).filter((row) => row.dueDate > addDays(makeIsoDate(core.date), 1));
  expect(sick.length, where).toBeGreaterThan(0);
  const booked = sick[0]!;
  fillInPerson(core, booked.id);
  const found = healthReport(core).cases.find((c) => c.personId === booked.id);
  expect(found?.onsetDate, `${where}: ${booked.id}`).toBe(booked.onsetDate);
  expect(found?.onsetEventId, `${where}: ${booked.id}`).toBeTruthy();
  expect(found?.deathDate, `${where}: ${booked.id}`).toBe(booked.dueDate);
  expect(renewal.table("countedIllness").get(booked.id), where).toBeUndefined();
  advanceCore(core, addDays(booked.dueDate, 1));
  expect(core.people.get(booked.id)?.alive, `${where}: ${booked.id}`).toBe(
    false,
  );
}, 900_000);
