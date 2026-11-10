/**
 * The life record's gaps (docs/design/life-record.md, step 3): a lost election, a job taken in play,
 * relatives who live elsewhere. One drawn world, played through its first election and then to day
 * 400, shared by the tests of this file. The place and seed are in every message; replay with
 * LIFE_SEED and LIFE_PLACE_KEY.
 */
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { knownCard } from "../bench/card";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { isDemoted } from "./counted-groups";
import { gameStartDate } from "./game-start";
import { addDays, daysBetweenText, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import { livesElsewhere } from "./modules/moves";
import { lifeOf } from "./modules/people";
import { coreAPI } from "./state";
import type { CoreEventInput, PersonId } from "./types";

/** The test's findings: printed, and kept in the file LIFE_NOTES names (the test reporter hides console output). */
const note = (line: string) => {
  console.log(line);
  if (process.env.LIFE_NOTES)
    appendFileSync(process.env.LIFE_NOTES, `${line}\n`);
};

const seed = process.env.LIFE_SEED ?? randomBytes(8).toString("hex");
const drawn = drawPlace(seed, "life-gaps");
const placeKey = process.env.LIFE_PLACE_KEY ?? drawn.key;

setBookkeeping(false);
const world = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
const { core } = world;
const api = coreAPI(core);
const where = `${world.place.displayName} (${placeKey}), seed ${seed}`;

/** Every event an engine emits, as the engines make them, for the survey. */
const emitted: Pick<
  CoreEventInput,
  "id" | "kind" | "date" | "personIds" | "facts"
>[] = [];
{
  const emit = api.emit.bind(api);
  api.emit = (event: CoreEventInput) => {
    emitted.push({
      id: event.id,
      kind: event.kind,
      date: event.date,
      personIds: [...event.personIds],
      facts: event.facts,
    });
    return emit(event);
  };
}

const started = Date.now();
const isFull = (id: string) => {
  const person = core.people.get(id);
  return Boolean(person?.alive && !isDemoted(person) && person.tier !== "husk");
};

describe(`the life record's gaps in ${where}`, () => {
  it("1: every candidate who lost an election remembers losing it, and the card says so", () => {
    const elections = api.moduleState(ELECTIONS_MODULE_ID);
    const contests = () =>
      elections.table("contests").rows() as unknown as ContestRow[];
    // The count of the next election day on which a race has two or more full people on its
    // ballot (the result record names every one of them).
    const races = () =>
      emitted.filter(
        (event) =>
          event.kind === "election-result" &&
          event.personIds.filter((id) => isFull(id)).length >= 2,
      );
    let day: string | undefined;
    for (let guard = 0; guard < 8 && !races().length; guard += 1) {
      day = contests()
        .map((row) => row.electionDate)
        .filter((date) => date > core.date)
        .sort()[0];
      if (!day) break;
      advanceCore(core, addDays(makeIsoDate(day), 1));
    }
    if (!races().length) {
      note(
        `life-gaps 1: ${where}: no election with two full candidates in the first ${guardDays()} days; skipped`,
      );
      return;
    }
    let losers = 0;
    for (const race of races()) {
      const winner = String(race.facts?.winnerId ?? "");
      if (!winner) continue;
      const contestId = String(race.facts?.contestId);
      const won = lifeOf(core, winner as PersonId).find(
        (event) => event.id === race.id,
      );
      expect(
        [won?.life, won?.what],
        `${where}: winner ${winner} of ${contestId}`,
      ).toEqual(["politics", "won"]);
      for (const person of race.personIds.filter(
        (id) => id !== winner && isFull(id),
      )) {
        losers += 1;
        const lost = lifeOf(core, person as PersonId).find(
          (event) => event.id === race.id,
        );
        expect(
          [lost?.life, lost?.what],
          `${where}: loser ${person} of ${contestId}`,
        ).toEqual(["politics", "lost"]);
        expect(lost!.facts?.contestId, where).toBe(contestId);
        expect(lost!.facts?.office, where).toBeTruthy();
        const card = knownCard(core, core.playerId!, person);
        const line = card.history.find((row) => row.recordId === race.id);
        expect(
          line?.text,
          `${where}: the card of loser ${person} tells the race`,
        ).toMatch(/lost the race/);
        note(
          `life-gaps 1: ${where}; ${person} lost ${contestId} on ${race.date} with ${lost!.facts?.votes ?? "?"} votes to ${lost!.facts?.winnerVotes ?? "?"}: "${line!.text}"; played ${guardDays()} days, ${Math.round((Date.now() - started) / 1000)} s`,
        );
      }
    }
    expect(
      losers,
      `${where}: at least one loser in ${races().length} races`,
    ).toBeGreaterThan(0);
  }, 1_800_000);

  it("3: a full person hired in play has the job once on their list, and the card tells it", () => {
    const jobs = api.moduleState("jobs");
    const hires = (
      jobs.table("changes").rows() as unknown as {
        id: string;
        date: string;
        kind: string;
        personId: string;
        organizationId: string;
        jobId: string;
        values?: Record<string, number>;
      }[]
    ).filter(
      (row) =>
        row.kind === "hire" &&
        !row.values?.regional &&
        row.date > gameStartDate() &&
        isFull(row.personId) &&
        core.organizations.get(row.organizationId)?.name,
    );
    expect(hires.length, `${where}: hires in play`).toBeGreaterThan(0);
    let shown = 0;
    for (const hire of hires.slice(0, 40)) {
      const life = lifeOf(core, hire.personId).filter(
        (event) =>
          event.life === "work" &&
          event.what === "job-started" &&
          event.facts?.jobId?.split(":counted:")[0] ===
            hire.jobId.split(":counted:")[0],
      );
      expect(life.length, `${where}: ${hire.personId} hired ${hire.date}`).toBe(
        1,
      );
      expect(life[0]!.date, where).toBe(hire.date);
      if (shown < 2) {
        const card = knownCard(core, core.playerId!, hire.personId);
        const line = card.history.find((row) =>
          row.records.includes(life[0]!.id),
        );
        const name = core.organizations.get(hire.organizationId)!.name;
        if (line) {
          expect(line.text, where).toContain(name);
          shown += 1;
          note(
            `life-gaps 3: ${where}; ${hire.personId} hired ${hire.date}: "${line.text}"`,
          );
        }
      }
    }
    note(
      `life-gaps 3: ${where}; ${hires.length} hires in play, ${hires.slice(0, 40).length} checked, ${shown} card lines shown`,
    );
  }, 600_000);

  it("3b: a job that ended in play by quitting, retiring or closing is told once", () => {
    const rows = (
      api.moduleState("jobs").table("changes").rows() as unknown as {
        id: string;
        date: string;
        kind: string;
        reasonKey: string;
        personId: string;
      }[]
    ).filter(
      (row) =>
        row.date > gameStartDate() &&
        (row.kind === "quit" ||
          row.kind === "closure" ||
          (row.kind === "left-work" && row.reasonKey !== "died")) &&
        isFull(row.personId),
    );
    if (!rows.length) {
      note(
        `life-gaps 3b: ${where}: no job ended in play in ${guardDays()} days; skipped`,
      );
      return;
    }
    for (const row of rows.slice(0, 40)) {
      const told = lifeOf(core, row.personId).filter(
        (event) => event.id === row.id,
      );
      expect(
        told.length,
        `${where}: ${row.personId} ${row.kind} ${row.date}`,
      ).toBe(1);
      expect(told[0]!.what, where).toBe("job-ended");
    }
    note(
      `life-gaps 3b: ${where}; ${rows.length} jobs ended in play (${[...new Set(rows.map((r) => `${r.kind}/${r.reasonKey}`))].join(", ")}), each told once`,
    );
  }, 600_000);

  it("4: no job is told twice for 30 full adults after 200+ days", () => {
    const adults = [...core.people.values()]
      .filter(
        (person) =>
          isFull(person.id) &&
          person.id !== core.playerId &&
          Number(core.date.slice(0, 4)) -
            Number(person.birthDate.slice(0, 4)) >=
            18,
      )
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, 30);
    expect(adults.length, where).toBeGreaterThan(0);
    for (const person of adults) {
      const seen = new Set<string>();
      for (const event of lifeOf(core, person.id)) {
        if (event.life !== "work" || event.what !== "job-started") continue;
        const keys = [
          event.facts?.jobId
            ? `job ${event.facts.jobId.split(":counted:")[0]}`
            : "",
          event.facts?.organizationId
            ? `${event.facts.organizationId} ${event.facts.startedAt ?? event.date}`
            : "",
        ].filter(Boolean);
        for (const key of keys)
          expect(
            seen.has(key),
            `${where}: ${person.id} tells ${key} twice`,
          ).toBe(false);
        for (const key of keys) seen.add(key);
      }
    }
    note(`life-gaps 4: ${where}; ${adults.length} adults, no job twice`);
  }, 600_000);

  it("5: relatives who live elsewhere: what the engines wrote about them by the end, and what their list says", () => {
    const town = (id: string) => {
      const person = core.people.get(id);
      return Boolean(
        person?.alive && person.tier !== "husk" && !isDemoted(person),
      );
    };
    const away = [...core.people.values()].filter(
      (person) =>
        livesElsewhere(core, person) &&
        [...person.familyIds].some((id) => town(id)),
    );
    const awayIds = new Set<PersonId>(away.map((person) => person.id));
    const byKind = new Map<string, number>();
    const named = new Map<PersonId, number>();
    for (const event of emitted) {
      const hit = event.personIds.filter((id) => awayIds.has(id as PersonId));
      if (!hit.length) continue;
      byKind.set(event.kind, (byKind.get(event.kind) ?? 0) + 1);
      for (const id of hit)
        named.set(id as PersonId, (named.get(id as PersonId) ?? 0) + 1);
    }
    note(
      `life-gaps 5: ${where}; ${away.length} people elsewhere with kin in town; events naming them by kind: ${JSON.stringify([...byKind.entries()].sort())}`,
    );
    const withRecord = away.filter((person) => named.has(person.id));
    if (!withRecord.length) {
      note(
        `life-gaps 5: ${where}: no relative elsewhere has a dated record in ${guardDays()} days; skipped`,
      );
      return;
    }
    const told = withRecord.filter(
      (person) => lifeOf(core, person.id).length > 1,
    );
    for (const person of withRecord.slice(0, 3))
      note(
        `life-gaps 5: ${where}; ${person.id} (${person.placeId}): ${named.get(person.id)} records, life ${JSON.stringify(lifeOf(core, person.id).map((event) => `${event.date} ${event.life}/${event.what} ${event.from}`))}`,
      );
    expect(
      told.length,
      `${where}: ${withRecord.length} relatives elsewhere with a record, ${told.length} tell more than their birth`,
    ).toBeGreaterThan(0);
  }, 600_000);
});

function guardDays(): number {
  return daysBetweenText(gameStartDate(), core.date);
}
