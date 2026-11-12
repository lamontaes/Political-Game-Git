/**
 * A campaign never silent (path 4; words-campaign-season-scenes-fill-the-months).
 * In a played world from a replay number (Murray, Nebraska's by default), the
 * player files for the soonest race they may enter, gathers their
 * signatures, and lives week by week to election day. Every 28 days from the
 * filing must hold a scene staged for them or a Journal line, each citing the
 * race's contest or filing record or the player. The test prints each window
 * with what filled it, by record id, so a silent stretch names its months.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { fileForOffice } from "../bench/government";
import { setBookkeeping } from "../core2/bookkeeping";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate, type IsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  ELECTIONS_MODULE_ID,
  playerContests,
} from "../core2/modules/elections";
import { NEWS_MODULE_ID } from "../core2/modules/news";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { composeJournal } from "./journal";

const seed = process.env.GOLDEN_PATH_SEED || "1d3f0e18ca4ba7e5";
const WINDOW = 28;
const STEP = 7;

/**
 * Checks the campaign months of the world drawn from this seed; a reason when
 * the world has no race the player could enter within two years.
 */
const run = (drawSeed: string): string | null => {
  setBookkeeping(false);
  const { core, director, playerId } = buildBenchWorld(
    drawSeed,
    gameStartDate(),
    {
      twoLevel: true,
    },
  );
  const api = coreAPI(core);
  const me = playerId! as PersonId;
  const town = String(core.people.get(me)!.placeId);
  const where = `${town}, seed ${drawSeed}`;
  const born = core.people.get(me)!.birthDate;
  const md = born.slice(5) === "02-29" ? "03-01" : born.slice(5);
  const eighteen = makeIsoDate(`${Number(born.slice(0, 4)) + 18}-${md}`);
  if (eighteen > core.date) advanceCore(core, eighteen);
  director!.watch(core, me);
  // Filing opens on a set day (elections-filing-window-opens): the weeks go
  // by until the soonest race the player may enter is open, and they file.
  const fileSoonest = () =>
    [...playerContests(api)]
      .sort(
        (a, b) =>
          a.electionDate.localeCompare(b.electionDate) ||
          a.id.localeCompare(b.id),
      )
      .find((contest) =>
        ["petitioning", "on-ballot"].includes(
          (
            fileForOffice(core, me, contest.id) as {
              filing?: { status?: string };
            }
          ).filing?.status ?? "",
        ),
      );
  let filed = fileSoonest();
  for (let week = 0; week < 104 && !filed; week += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
    filed = fileSoonest();
  }
  if (!filed) return `${where}: no race the player could enter in two years`;
  const filingId = `filing:${filed.id}:${me}`;
  const from = makeIsoDate(core.date);
  gatherSignatures(core, filingId);
  const status = (
    api.moduleState(ELECTIONS_MODULE_ID).table("filings").get(filingId) as
      { status?: string } | undefined
  )?.status;
  expect(status, `${where}: ${filingId}`).toBe("on-ballot");
  const through = makeIsoDate(filed!.electionDate);
  // Gathering signatures runs the days to the clerk's check; the season
  // after it is lived a week at a time.
  for (
    let day = addDays(makeIsoDate(core.date), STEP);
    day <= through;
    day = addDays(day, STEP)
  )
    advanceCore(core, day);
  if (through > core.date) advanceCore(core, through);

  // What the player met: scenes the director staged for them, and Journal
  // lines, each on a record of the race or of the player.
  const race = new Set([filed.id, filingId, me]);
  const aboutRace = (text: string) =>
    text.includes(filed.id) || text.includes(filingId);
  const scenes = (director!.ledger.people.get(me)?.schedule ?? [])
    .filter((row) => row.bindings.length > 0 && aboutRace(row.momentId))
    .map((row) => ({
      date: row.date,
      what: `scene ${row.bindings.map((b) => b.typeKey).join("+")} (${row.momentId})`,
    }));
  const lines = composeJournal(core, director!, me)
    .flatMap((chapter) => chapter.lines)
    .filter((line) =>
      line.sourceRecordIds.some((id) => race.has(id) || aboutRace(id)),
    )
    .map((line) => ({
      date: line.date,
      what: `journal "${line.text}" (${line.sourceRecordIds.slice(0, 2).join(", ")})`,
    }));
  // The paper's stories about the race, as the news reaches the town.
  const news = (
    api.moduleState(NEWS_MODULE_ID).table("stories").rows() as unknown as {
      date: IsoDate;
      kind: string;
      facts: Record<string, string>;
    }[]
  )
    .filter(
      (row) =>
        row.kind === "press.printed" &&
        aboutRace(String(row.facts.sourceRecordId ?? "")),
    )
    .map((row) => ({
      date: row.date,
      what: `news ${row.facts.sourceRecordId}`,
    }));
  const met = [...scenes, ...lines, ...news]
    .filter((row) => row.date >= from && row.date <= through)
    .sort((a, b) => a.date.localeCompare(b.date));

  const silent: string[] = [];
  const report: string[] = [];
  for (
    let start: IsoDate = from;
    start <= through;
    start = addDays(start, WINDOW)
  ) {
    const end = addDays(start, WINDOW - 1);
    const here = met.filter((row) => row.date >= start && row.date <= end);
    report.push(
      `${start} to ${end}: ${here.length ? here.map((row) => `${row.date} ${row.what}`).join(" | ") : "SILENT"}`,
    );
    if (!here.length) silent.push(`${start} to ${end}`);
  }
  process.stdout.write(
    `CAMPAIGN MONTHS ${where}: ${filed.id}, filed ${from}, election ${through}\n${report.join("\n")}\n`,
  );
  expect(silent, `${where}: silent stretches`).toEqual([]);
  // At least three kinds of scene about the race over the season.
  const kinds = new Set(
    (director!.ledger.people.get(me)?.schedule ?? [])
      .filter(
        (row) =>
          row.date >= from && row.date <= through && aboutRace(row.momentId),
      )
      .flatMap((row) => row.bindings.map((b) => b.typeKey)),
  );
  process.stdout.write(
    `CAMPAIGN SCENE KINDS ${where}: ${[...kinds].join(", ")}\n`,
  );
  expect(
    kinds.size,
    `${where}: ${[...kinds].join(", ")}`,
  ).toBeGreaterThanOrEqual(3);
  return null;
};

it(`every 28 days from filing to election day holds a scene or a Journal line about the race (seed ${seed})`, () => {
  // The seed's own world first (Murray, Nebraska by default, path 4's
  // town); a world with no race the player can enter draws the next.
  const passed: string[] = [];
  for (let draw = 0; draw < 3; draw += 1) {
    const skipped = run(draw ? `${seed}:${draw}` : seed);
    if (!skipped) return;
    passed.push(skipped);
  }
  throw new Error(`No drawn world had a race to enter: ${passed.join("; ")}`);
}, 3_600_000);
