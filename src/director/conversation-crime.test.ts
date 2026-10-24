/**
 * Pool item director-talk-lived-crime. The crime engine writes a
 * victimization record for a full household it victimizes, and the ledger
 * keeps it as a moment for each person it names; a talk with the victim
 * raises it as a victimization subject whose source is the crime record, the
 * kind of crime as its stage. Its raising lines are authored and held until
 * graded, so play leaves the subject unsaid; the grading route
 * (`includeHeld`) says it. A one-year played world in a place drawn from all
 * 56; set GOLDEN_PATH_SEED to reproduce the draw.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { CRIME_EVENT, CRIME_MODULE_ID } from "../core2/modules/crime";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/kernel/brands";
import {
  CONVERSATION_DATA,
  openConversation,
  subjectsBetween,
} from "./conversation";
import { conversationDataFromBank } from "./mined/conversation-bank";

const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const VICTIMIZED = `feeling:event:${CRIME_EVENT}`;
const MONTH_DAYS = 30;
const YEAR_DAYS = 365;

it(`a victim's talk raises the victimization from the crime record (base ${base})`, () => {
  const tried: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const place = drawPlace(
      createHash("sha256").update(`${base}:${i}`).digest("hex"),
      "conversation-crime",
    );
    const where = `${place.name} (${place.key}), seed ${place.seed}, base ${base}`;
    // A first pass finds the first full household the crime engine
    // victimizes that has two living members, without the director: watching
    // a whole town is slow. The same seed builds the same world, so a second
    // pass watches that household only and plays to just after the crime.
    const build = () => {
      setBookkeeping(false);
      return buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
    };
    const first = build().core;
    const end = addDays(makeIsoDate(first.date), YEAR_DAYS);
    let victimized:
      { eventId: string; householdId: string; date: string } | undefined;
    while (!victimized && first.date < end) {
      const next = addDays(makeIsoDate(first.date), MONTH_DAYS);
      advanceCore(first, next < end ? next : end);
      const months = coreAPI(first)
        .moduleState(CRIME_MODULE_ID)
        .table("months")
        .rows() as unknown as {
        date: string;
        victims: { eventId: string; householdId: string }[];
      }[];
      for (const month of [...months].sort((a, b) =>
        a.date.localeCompare(b.date),
      ))
        for (const victim of month.victims ?? []) {
          const members =
            first.households.get(victim.householdId)?.memberIds ?? [];
          if (members.filter((id) => first.people.get(id)?.alive).length < 2)
            continue;
          victimized ??= { ...victim, date: month.date };
        }
    }
    if (!victimized) {
      tried.push(`${where}: no full household of two victimized in a year`);
      continue;
    }
    // Watching changes how a person's days run, so the household is watched
    // only from the day before the crime.
    const { core, director } = build();
    advanceCore(core, addDays(makeIsoDate(victimized.date), -1));
    for (const id of core.households.get(victimized.householdId)?.memberIds ??
      [])
      if (core.people.get(id)?.alive) director.watch(core, id);
    advanceCore(core, addDays(makeIsoDate(victimized.date), 1));
    // The person the crime record names keeps it as a moment, and raises it
    // with a housemate (a break-in names the household; an assault, the one
    // attacked).
    let found:
      | {
          victim: PersonId;
          listener: PersonId;
          causeId: string;
          momentId: string;
        }
      | undefined;
    const members = (
      core.households.get(victimized.householdId)?.memberIds ?? []
    ).filter((id) => core.people.get(id)?.alive);
    for (const id of members) {
      const moment = director.ledger.people
        .get(id)
        ?.moments.find((row) => row.causeId === victimized!.eventId);
      if (!moment || moment.label !== VICTIMIZED) continue;
      const housemate = members.find((other) => other !== id);
      if (!housemate) continue;
      found = {
        victim: id as PersonId,
        listener: housemate as PersonId,
        causeId: moment.causeId,
        momentId: moment.id,
      };
      break;
    }
    expect(
      found,
      `${where}: ${victimized.eventId} on ${victimized.date} is a moment for a member of ${victimized.householdId} who lives with someone (the second pass rebuilt the same world)`,
    ).toBeDefined();
    if (!found) continue;
    // The subject is the victim's, from the crime record.
    const subject = subjectsBetween(
      core,
      found.victim,
      found.listener,
      director,
    ).find((row) => row.kind === "victimization");
    expect(
      subject,
      `${where}: ${found.victim}'s victimization subject`,
    ).toBeDefined();
    expect(subject!.aboutId, where).toBe(found.causeId);
    expect(found.causeId.startsWith(`${CRIME_EVENT}:`), where).toBe(true);
    expect(subject!.facts.victimized!.sourceRecordIds, where).toEqual([
      found.causeId,
    ]);
    const type = found.causeId.slice(CRIME_EVENT.length + 1).split(":")[0];
    expect(subject!.stage, where).toBe(type);
    // Held: play has no graded line to raise it with.
    expect(
      CONVERSATION_DATA.subjects.victimization?.raise ?? [],
      where,
    ).toEqual([]);
    // The grading route says it: the victim raises it, citing the record.
    const talk = openConversation(core, found.listener, found.victim, {
      director,
      occasionId: found.momentId,
      data: conversationDataFromBank(undefined, true),
    });
    const raised = talk.lines.find(
      (line) =>
        line.speakerId === found!.victim &&
        line.subjectId === `${found!.victim}>victimization:${found!.causeId}`,
    );
    expect(
      raised,
      `${where}: ${found.victim} raises ${found.causeId} (lines: ${talk.lines.map((l) => l.subjectId).join(", ")})`,
    ).toBeDefined();
    expect(raised!.sourceRecordIds, where).toContain(found.causeId);
    process.stdout.write(
      `CRIME TALK ${where}: ${found.victim} to housemate ${found.listener}, subject ${subject!.id} (stage ${subject!.stage}), said "${raised!.text}" from ${found.causeId}\n`,
    );
    return;
  }
  throw new Error(
    `no victimized full household in six drawn places: ${tried.join("; ")}`,
  );
}, 1_800_000);
