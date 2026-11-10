import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { beginSeriousIllness } from "../core2/modules/health";
import { coreAPI, personOrFillIn } from "../core2/state";
import type { PersonId } from "../core2/types";
import { composeJournal } from "./journal";

// A school year's end and a death in the family are told as small stories
// (owner, batch 3), and a played year rarely holds either for the player: a
// graduation falls to someone in their last school year, a death to the kin of
// someone who has been ill. So the test draws its worlds to hold one.
//
// SCHOOL: the player is seventeen on the start day, in their last school year, and a year is played; the
// school engine's own graduation result for them is the record.
// DEATH: the oldest living relative falls seriously ill through the health
// engine's `beginSeriousIllness` (hand-staged onset), and the world runs on
// until the engine's own death for them; the death record, the kin tie and the
// journal's lines are the engines'.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 4;
const AWAIT_DAYS = 730;
const STEP_DAYS = 30;
const startYear = () => Number(gameStartDate().slice(0, 4));

it(`a school year's end is told as a small story from the school's records (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const place = drawPlace(seed, `journal-school:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, director, playerId } = buildBenchWorld(
        place.seed,
        gameStartDate(),
        {
          twoLevel: true,
          placeKey: place.key,
          playerBirthDate: `${startYear() - 18}-06-15`,
        },
      );
      const id = playerId as PersonId;
      core.focusPersonIds.add(id);
      director.watch(core, id);
      advanceCore(core, addDays(makeIsoDate(core.date), 365));
      const lines = composeJournal(core, director, id).flatMap(
        (chapter) => chapter.lines,
      );
      const told = lines.find((line) =>
        /I had been at .+ for |That ended .+ at /.test(line.text),
      );
      if (!told) {
        tried.push(
          `${where}: ${lines.filter((l) => /school|diploma|graduat/i.test(l.text)).length} school lines, none with the story`,
        );
        continue;
      }
      expect(told.text, where).not.toMatch(/\{|\}|undefined/);
      expect(told.sourceRecordIds.length, where).toBeGreaterThan(1);
      process.stdout.write(
        `JOURNAL SCHOOL ${where}: ${told.date} ${told.text} [${told.sourceRecordIds.join(", ")}]\n`,
      );
      return;
    }
    throw new Error(`no school story: ${tried.join("; ")} (seed ${seed})`);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);

it(`a death in the family is told as a small story from the death record (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const place = drawPlace(seed, `journal-death:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, director, playerId } = buildBenchWorld(
        place.seed,
        gameStartDate(),
        {
          twoLevel: true,
          placeKey: place.key,
          playerBirthDate: `${startYear() - 35}-06-15`,
        },
      );
      const id = playerId as PersonId;
      core.focusPersonIds.add(id);
      director.watch(core, id);
      const api = coreAPI(core);
      const player = core.people.get(id)!;
      // The oldest living relative: a husk (the wider population) is filled in
      // first, as the health engine does when a husk's illness falls due.
      const birthOf = (other: PersonId) =>
        core.people.get(other)?.birthDate ?? core.husks.get(other)?.birthDate;
      const oldest = [...player.familyIds]
        .filter(
          (other) =>
            other !== id &&
            (core.people.get(other)?.alive ??
              (core.husks.has(other) && !core.husks.get(other)!.diedOn)) &&
            birthOf(other),
        )
        .sort(
          (a, b) =>
            birthOf(a)!.localeCompare(birthOf(b)!) || a.localeCompare(b),
        )[0];
      const kin = oldest ? personOrFillIn(core, oldest) : undefined;
      if (!kin || !beginSeriousIllness(api, kin.id)) {
        tried.push(`${where}: no relative to fall ill`);
        continue;
      }
      for (
        let days = 0;
        days < AWAIT_DAYS && core.people.get(kin.id)?.alive;
        days += STEP_DAYS
      )
        advanceCore(core, addDays(makeIsoDate(core.date), STEP_DAYS));
      if (core.people.get(kin.id)?.alive) {
        tried.push(`${where}: ${kin.id} was alive after ${AWAIT_DAYS} days`);
        continue;
      }
      const lines = composeJournal(core, director, id).flatMap(
        (chapter) => chapter.lines,
      );
      const told = lines.find(
        (line) =>
          line.momentIds.some((momentId) => momentId.includes(kin.id)) &&
          /died|passed away/.test(line.text),
      );
      if (!told) {
        tried.push(`${where}: the death of ${kin.id} was not told`);
        continue;
      }
      const age = ageOnDate(makeIsoDate(kin.birthDate), makeIsoDate(told.date));
      expect(told.text, where).toMatch(new RegExp(`was ${age}\\b`));
      expect(told.text, where).not.toMatch(/\{|\}|undefined/);
      process.stdout.write(
        `JOURNAL DEATH ${where}: ${told.date} ${told.text} [${told.sourceRecordIds.join(", ")}]\n`,
      );
      return;
    }
    throw new Error(`no death story: ${tried.join("; ")} (seed ${seed})`);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
