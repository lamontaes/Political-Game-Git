import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { relationPhrase } from "../english/journal-words";
import { composeJournal } from "./journal";

// Someone else's swearing-in is told as theirs (words-journal-kin-took-office-as-i).
// The took-office record names only the winner, and a relative's journal
// told it in the first person ("I took office as Council member.") because
// the row had no line for someone else's moment. In a drawn town, every
// candidate in its next election who is a full person is watched with the
// people they live with; when a watched winner takes office, each housemate's
// journal opens on the winner, by name or by relation ("My partner took
// office as Council member."), names the office and cites the record, while
// the winner's own journal still says "I".
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const capital = (text: string) => text[0]!.toUpperCase() + text.slice(1);

it(`a housemate's swearing-in is told as theirs, seed ${seed}`, () => {
  setBookkeeping(false);
  const told: string[] = [];
  const tried: string[] = [];
  try {
    for (let attempt = 0; attempt < 4 && !told.length; attempt += 1) {
      const place = drawPlace(seed, `journal-kin-office:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const elections = api.moduleState(ELECTIONS_MODULE_ID);
      const contests = () =>
        elections.table("contests").rows() as unknown as ContestRow[];
      const sworn: { id: string; winnerId: string; office: string }[] = [];
      api.subscribeEvents(
        "journal-kin-office-test",
        ["took-office"],
        (_, event) => {
          const facts = event.facts as Record<string, string>;
          if (facts.winnerId)
            sworn.push({
              id: event.id,
              winnerId: facts.winnerId,
              office: facts.office ?? "",
            });
        },
      );
      // The town's next election day with candidates who are full people and
      // live with someone.
      let day: string | undefined;
      const housemates = new Map<string, PersonId[]>();
      for (let guard = 0; guard < 8 && !housemates.size; guard += 1) {
        day = contests()
          .map((row) => row.electionDate)
          .filter((date) => date > core.date)
          .sort()[0];
        if (!day) break;
        advanceCore(core, addDays(makeIsoDate(day), -1));
        const ids = new Set(
          contests()
            .filter((row) => row.electionDate === day)
            .map((row) => row.id),
        );
        for (const filing of elections
          .table("filings")
          .rows() as unknown as FilingRow[]) {
          const person = core.people.get(filing.personId);
          if (!ids.has(filing.contestId) || !person?.alive) continue;
          const home = [...core.people.values()]
            .filter(
              (row) =>
                row.alive &&
                row.id !== person.id &&
                row.householdId === person.householdId,
            )
            .map((row) => row.id as PersonId);
          if (home.length) housemates.set(person.id, home);
        }
        if (!housemates.size) advanceCore(core, day);
      }
      if (!day || !housemates.size) {
        tried.push(`${where}: no candidate on record who lives with someone`);
        continue;
      }
      for (const [candidateId, home] of housemates) {
        director.watch(core, candidateId as PersonId);
        for (const id of home) director.watch(core, id);
      }
      // Through the count and the start of the terms it decides.
      const until = addDays(makeIsoDate(day), 120);
      let checked = 0;
      while (core.date < until && !told.length) {
        advanceCore(core, addDays(makeIsoDate(core.date), 7));
        for (; checked < sworn.length; checked += 1) {
          const record = sworn[checked]!;
          const home = housemates.get(record.winnerId);
          if (!home) continue;
          const winner = core.people.get(record.winnerId as PersonId)!;
          const said = `${where}: ${record.id}`;
          const lineFor = (personId: PersonId) =>
            composeJournal(core, director, personId)
              .flatMap((chapter) => chapter.lines)
              .find((line) => line.sourceRecordIds.includes(record.id));
          // The winner's own journal says it in the first person.
          const own = lineFor(winner.id as PersonId);
          if (own) expect(own.text, said).toMatch(/^I\b/);
          for (const id of home) {
            const line = lineFor(id);
            if (!line) continue;
            // How this housemate names the winner: by relation when the
            // family records give one, else by name.
            const family = core.people
              .get(id)
              ?.pastFacts?.find(
                (fact) =>
                  fact.kind.startsWith("family:") &&
                  fact.facts?.otherPersonId === winner.id,
              );
            const relation = family
              ? relationPhrase(
                  family.kind.slice("family:".length),
                  winner.looks?.gender ?? "other",
                  "journal",
                )
              : undefined;
            const names = [winner.givenName, relation]
              .filter((name): name is string => !!name)
              .map(capital);
            const inJournal = `${said} in ${id}'s journal`;
            expect(line.text, inJournal).not.toMatch(/^(I|We)\b/);
            expect(
              names.some((name) => line.text.startsWith(name)),
              `${inJournal}: "${line.text}" opens on none of ${names.join(", ")}`,
            ).toBe(true);
            expect(line.text, inJournal).toContain(record.office);
            told.push(
              `${said}: ${id}: "${line.text}"; ${winner.id}: "${own?.text ?? "(no line)"}"`,
            );
          }
        }
      }
      if (!told.length)
        tried.push(
          `${where}: ${sworn.filter((row) => housemates.has(row.winnerId)).length} watched winners took office, none told in a housemate's journal`,
        );
    }
    expect(told.length, tried.join("; ")).toBeGreaterThan(0);
    console.log(`KIN TOOK OFFICE\n${told.join("\n")}`);
  } finally {
    setBookkeeping(true);
  }
}, 1_800_000);
