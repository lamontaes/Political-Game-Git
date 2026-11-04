import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { familyFactsOf } from "../core2/modules/people";
import type { PersonId } from "../core2/types";

/**
 * A separation is a scene (the plan of Oct 28, line 6: the ten missing
 * producers). The people engine records `family.separated` when a couple
 * parts; the breakup type now reads it, so a watched person who separates
 * has the scene staged for them, cast with their former partner. Drawn
 * places, a fresh seed, place and seed in every message.
 */
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 4;
const DAYS = 365;
const WATCHED = 160;

const run = (drawSeed: string): string | null => {
  const place = drawPlace(drawSeed, "breakup-separated");
  const where = `${place.name} (${place.key}), seed ${drawSeed}`;
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  // Partnered residents, watched, their private records kept as the
  // player's are (a separation is private).
  const partnered = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        [...familyFactsOf(p).values()].some((fact) =>
          /partner|spouse|husband|wife/.test(fact.relation),
        ),
    )
    .map((p) => p.id as PersonId)
    .sort()
    .slice(0, WATCHED);
  if (!partnered.length) return `${where}: no partnered residents`;
  for (const id of partnered) {
    director.watch(core, id);
    core.focusPersonIds.add(id);
  }
  const watched = new Set<string>(partnered);
  const separated = () =>
    [...core.durableLog.values()].filter(
      (row) =>
        row.kind === "family.separated" &&
        row.personIds.some((id) => watched.has(id)),
    );
  for (let day = 0; day < DAYS && !separated().length; day += 7)
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  const events = separated();
  if (!events.length)
    return `${where}: no watched couple separated in ${DAYS} days`;
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  for (const event of events) {
    for (const personId of event.personIds.filter((id) => watched.has(id))) {
      const book = director.ledger.people.get(personId as PersonId)!;
      const moment = book.moments.find((row) => row.causeId === event.id);
      if (!moment) continue;
      const entry = book.schedule.find((row) => row.momentId === moment.id);
      const binding = entry?.bindings.find((row) => row.typeKey === "breakup");
      expect(
        binding,
        `${where}: ${personId} separated (${event.id}, label ${moment.label}), bindings ${entry?.bindings.map((row) => row.typeKey).join(", ") ?? "none"}`,
      ).toBeTruthy();
      const other = event.personIds.find((id) => id !== personId);
      expect(
        binding!.roles.find((row) => row.role === "partner")?.personIds,
        where,
      ).toContain(other);
      process.stdout.write(
        `BREAKUP ${where}: ${personId} and ${other}, ${event.id}, label ${moment.label}, outcome ${entry!.outcome}\n`,
      );
      return null;
    }
  }
  return `${where}: ${events.length} separations, none became a moment`;
};

it(`a watched person who separates has the breakup scene (seed ${seed})`, () => {
  const notes: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const note = run(`${seed}:${attempt}`);
    if (!note) return;
    notes.push(note);
  }
  throw new Error(`No drawn place staged a breakup: ${notes.join("; ")}`);
}, 3_600_000);
