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
import { CRIME_EVENT } from "../core2/modules/crime";
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
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    // The ledger keeps moments for the people it watches: everyone in town.
    for (const person of core.people.values())
      if (person.alive && person.tier !== "husk")
        director.watch(core, person.id);
    const end = addDays(makeIsoDate(core.date), YEAR_DAYS);
    let found:
      | {
          victim: PersonId;
          listener: PersonId;
          causeId: string;
          momentId: string;
        }
      | undefined;
    while (!found && core.date < end) {
      const next = addDays(makeIsoDate(core.date), MONTH_DAYS);
      advanceCore(core, next < end ? next : end);
      for (const [personId, book] of director.ledger.people) {
        const moment = [...book.moments]
          .reverse()
          .find((row) => row.label === VICTIMIZED);
        if (!moment) continue;
        const victim = core.people.get(personId);
        if (!victim?.alive) continue;
        // A housemate the record also names holds the same moment: the talk's occasion.
        const housemate = [...core.people.values()].find(
          (other) =>
            other.id !== victim.id &&
            other.alive &&
            other.householdId === victim.householdId &&
            director.ledger.people
              .get(other.id)
              ?.moments.some((row) => row.causeId === moment.causeId),
        );
        if (!housemate) continue;
        const occasion = director.ledger.people
          .get(housemate.id)!
          .moments.find((row) => row.causeId === moment.causeId)!;
        found = {
          victim: victim.id,
          listener: housemate.id,
          causeId: moment.causeId,
          momentId: occasion.id,
        };
        break;
      }
    }
    if (!found) {
      tried.push(`${where}: no victimized household with two members watched`);
      continue;
    }
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
