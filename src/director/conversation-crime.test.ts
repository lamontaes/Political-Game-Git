/**
 * Pool item director-talk-lived-crime. The crime engine writes a
 * victimization record for a full household it victimizes, and the ledger
 * keeps it as a moment for each person it names; a talk with the victim
 * raises it as a victimization subject whose source is the crime record, the
 * kind of crime as its stage. Its raising lines play like every bank piece no
 * grade holds, so ordinary play says it. The lines are told in the first
 * person, so only someone the record names raises it: a housemate a robbery
 * or an assault did not happen to does not. One-year played worlds in places
 * drawn from all 56; set GOLDEN_PATH_SEED to reproduce the draws.
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
import crimeData from "../core2/data/crime/victimization.json" with { type: "json" };
import { lawChain } from "../core2/modules/laws";
import { countedHouseholdsByPlace } from "../core2/modules/residents";
import { coreAPI, fillInPerson } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import {
  CONVERSATION_DATA,
  openConversation,
  subjectsBetween,
} from "./conversation";

const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const VICTIMIZED = `feeling:event:${CRIME_EVENT}`;
/**
 * The kinds of crime a victim has a line to raise. The crime engine records
 * vandalism too, but no bank piece tells it yet, so the scan skips it.
 */
const TOLD = new Set(
  CONVERSATION_DATA.subjects.victimization?.raise?.flatMap(
    (piece) => piece.stages ?? [],
  ) ?? [],
);
const MONTH_DAYS = 30;
const YEAR_DAYS = 365;
/**
 * A town's own full households (the player's circle, officials) are a few
 * dozen, and a crime engine that owes each household its share sees a handful
 * of them victimized a year. The player meets this many of the town's
 * households at the opening (filling them in, as clicking on a neighbor
 * does), the first by id so the same world comes back for the same seed; it
 * changes no rate.
 */
const MET_HOUSEHOLDS = Number(process.env.CONVERSATION_CRIME_MET || 150);
/**
 * Places drawn at most. A small town sees a theft or two a year and a robbery
 * or an assault more rarely, so each kind is taken from the first draw that
 * has one in a full household of two.
 */
const DRAWS = Number(process.env.CONVERSATION_CRIME_DRAWS || 10);

type Place = ReturnType<typeof drawPlace>;
interface Crime {
  readonly eventId: string;
  readonly householdId: string;
  readonly date: string;
}
interface Draw {
  readonly place: Place;
  readonly where: string;
  readonly crime: Crime;
}

/** The draw's world, with the player having met the town's first households. */
function build(place: Place) {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core as CoreState;
  const town = lawChain(coreAPI(core)).townPlaceId;
  const met = [...(countedHouseholdsByPlace(core).get(town) ?? [])]
    .sort((a, b) => a.household.id.localeCompare(b.household.id))
    .slice(0, MET_HOUSEHOLDS);
  for (const record of met)
    if (record.people[0] && !core.people.has(record.people[0].id))
      fillInPerson(core, record.people[0].id);
  return world;
}

/**
 * A first pass plays the year without the director (watching a whole town is
 * slow) and finds the first crime of each kind against a full household with
 * two living members: one recorded against the household, which names every
 * member, and a robbery or an assault, which names the one person it happened
 * to. The same seed builds the same world, so a later pass watches that
 * household only, from the day before the crime to the year's end. The
 * pass stops once it has the kinds still wanted.
 */
function scan(
  place: Place,
  want: { household: boolean; person: boolean },
): { household?: Crime; person?: Crime } {
  const core = build(place).core as CoreState;
  const end = addDays(makeIsoDate(core.date), YEAR_DAYS);
  let household: Crime | undefined;
  let person: Crime | undefined;
  while (
    core.date < end &&
    ((want.household && !household) || (want.person && !person))
  ) {
    const next = addDays(makeIsoDate(core.date), MONTH_DAYS);
    advanceCore(core, next < end ? next : end);
    const months = coreAPI(core)
      .moduleState(CRIME_MODULE_ID)
      .table("months")
      .rows() as unknown as {
      date: string;
      victims: { type: string; eventId: string; householdId: string }[];
    }[];
    for (const month of [...months].sort((a, b) =>
      a.date.localeCompare(b.date),
    ))
      for (const victim of month.victims ?? []) {
        if (!TOLD.has(victim.type)) continue;
        const members =
          core.households.get(victim.householdId)?.memberIds ?? [];
        if (members.filter((id) => core.people.get(id)?.alive).length < 2)
          continue;
        const crime = {
          eventId: victim.eventId,
          householdId: victim.householdId,
          date: month.date,
        };
        if (
          (crimeData.types as Record<string, { unit: string }>)[victim.type]
            ?.unit === "household"
        )
          household ??= crime;
        else person ??= crime;
      }
  }
  return { household, person };
}

it(`a victim's talk raises the victimization from the crime record (base ${base})`, () => {
  const tried: string[] = [];
  let household: Draw | undefined;
  let person: Draw | undefined;
  for (let i = 0; i < DRAWS && !(household && person); i += 1) {
    const place = drawPlace(
      createHash("sha256").update(`${base}:${i}`).digest("hex"),
      "conversation-crime",
    );
    const where = `${place.name} (${place.key}), seed ${place.seed}, base ${base}`;
    const found = scan(place, { household: !household, person: !person });
    if (!household && found.household)
      household = { place, where, crime: found.household };
    if (!person && found.person) person = { place, where, crime: found.person };
    const missing = [
      ...(found.household || household ? [] : ["burglarized or stolen from"]),
      ...(found.person || person ? [] : ["robbed or assaulted"]),
    ];
    if (missing.length)
      tried.push(
        `${where}: no full household of two ${missing.join(" or ")} in a year`,
      );
  }
  if (!household || !person)
    throw new Error(
      `in ${DRAWS} drawn places no full household of two was ${household ? "robbed or assaulted" : "burglarized or stolen from"}: ${tried.join("; ")}`,
    );

  // A crime against the household: each member the record names keeps it as
  // a moment, and the victim raises it with a housemate on the housemate's
  // own moment of it. Watching changes how a person's days run, so the
  // household is watched only from the day before the crime.
  const victimized = household.crime;
  const { core, director } = build(household.place);
  const end = addDays(makeIsoDate(core.date), YEAR_DAYS);
  advanceCore(core, addDays(makeIsoDate(victimized.date), -1));
  for (const id of core.households.get(victimized.householdId)?.memberIds ?? [])
    if (core.people.get(id)?.alive) director.watch(core, id);
  advanceCore(core, addDays(makeIsoDate(victimized.date), 1));
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
      ?.moments.find((row) => row.causeId === victimized.eventId);
    if (!moment || moment.label !== VICTIMIZED) continue;
    // The housemate's own moment of the same crime is the talk's occasion.
    const heard = members
      .filter((other) => other !== id)
      .map((other) => ({
        other,
        moment: director.ledger.people
          .get(other)
          ?.moments.find((row) => row.causeId === victimized.eventId),
      }))
      .find((row) => row.moment);
    if (!heard) continue;
    found = {
      victim: id as PersonId,
      listener: heard.other as PersonId,
      causeId: moment.causeId,
      momentId: heard.moment!.id,
    };
    break;
  }
  const where = household.where;
  expect(
    found,
    `${where}: ${victimized.eventId} on ${victimized.date} is a moment for two members of ${victimized.householdId} (the second pass rebuilt the same world)`,
  ).toBeDefined();
  // The subject is the victim's, from the crime record.
  const subject = subjectsBetween(
    core,
    found!.victim,
    found!.listener,
    director,
  ).find((row) => row.kind === "victimization");
  expect(
    subject,
    `${where}: ${found!.victim}'s victimization subject`,
  ).toBeDefined();
  expect(subject!.aboutId, where).toBe(found!.causeId);
  expect(found!.causeId.startsWith(`${CRIME_EVENT}:`), where).toBe(true);
  expect(subject!.facts.victimized!.sourceRecordIds, where).toEqual([
    found!.causeId,
  ]);
  const type = found!.causeId.slice(CRIME_EVENT.length + 1).split(":")[0];
  expect(subject!.stage, where).toBe(type);
  // Play has lines to raise it with: no grade holds them.
  expect(
    CONVERSATION_DATA.subjects.victimization?.raise?.length ?? 0,
    where,
  ).toBeGreaterThan(0);
  // Ordinary play says it: the victim raises it, citing the record.
  const talk = openConversation(core, found!.listener, found!.victim, {
    director,
    occasionId: found!.momentId,
  });
  expect(
    talk.occasion?.id,
    `${where}: the talk's occasion is ${found!.listener}'s own moment of ${found!.causeId}`,
  ).toBe(found!.momentId);
  expect(talk.occasion?.causeId, where).toBe(found!.causeId);
  const raised = talk.lines.find(
    (line) =>
      line.speakerId === found!.victim &&
      line.subjectId === `${found!.victim}>victimization:${found!.causeId}`,
  );
  expect(
    raised,
    `${where}: ${found!.victim} raises ${found!.causeId} (lines: ${talk.lines.map((l) => l.subjectId).join(", ")})`,
  ).toBeDefined();
  expect(raised!.sourceRecordIds, where).toContain(found!.causeId);
  advanceCore(core, end);
  expect(core.date, `${where}: the watched year plays to its end`).toBe(end);

  // A robbery or an assault: the record names only the person it happened
  // to, so only they raise it; a housemate it did not happen to does not tell
  // it in the first person. Another pass watches that household from the day
  // before the crime to the year's end.
  const violent = person.crime;
  const there = person.where;
  const again = build(person.place);
  const againEnd = addDays(makeIsoDate(again.core.date), YEAR_DAYS);
  advanceCore(again.core, addDays(makeIsoDate(violent.date), -1));
  const home = (
    again.core.households.get(violent.householdId)?.memberIds ?? []
  ).filter((id) => again.core.people.get(id)?.alive) as PersonId[];
  for (const id of home) again.director.watch(again.core, id);
  advanceCore(again.core, addDays(makeIsoDate(violent.date), 1));
  const named = home.filter((id) =>
    again.director.ledger.people
      .get(id)
      ?.moments.some(
        (row) => row.causeId === violent.eventId && row.label === VICTIMIZED,
      ),
  );
  expect(
    named,
    `${there}: ${violent.eventId} is a moment for its victim only`,
  ).toHaveLength(1);
  const victim = named[0]!;
  const housemate = home.find((id) => id !== victim)!;
  const victimSubject = subjectsBetween(
    again.core,
    victim,
    housemate,
    again.director,
  ).find((row) => row.kind === "victimization");
  expect(victimSubject?.aboutId, `${there}: ${victim}'s subject`).toBe(
    violent.eventId,
  );
  expect(victimSubject?.facts.victimized?.sourceRecordIds, there).toEqual([
    violent.eventId,
  ]);
  expect(
    subjectsBetween(again.core, housemate, victim, again.director).filter(
      (row) => row.kind === "victimization" && row.aboutId === violent.eventId,
    ),
    `${there}: ${housemate}, whom ${violent.eventId} did not happen to, cannot raise that crime as their own with ${victim}`,
  ).toEqual([]);
  // Ordinary play: with the housemate as the one who speaks, no line of
  // theirs tells the victim's crime as their own.
  const reverse = openConversation(again.core, victim, housemate, {
    director: again.director,
  });
  expect(
    reverse.lines.filter(
      (line) =>
        line.speakerId === housemate &&
        line.subjectId?.includes(`victimization:${violent.eventId}`),
    ),
    `${there}: ${housemate}'s lines`,
  ).toEqual([]);
  advanceCore(again.core, againEnd);
  expect(again.core.date, `${there}: the third pass plays to its end`).toBe(
    againEnd,
  );
  process.stdout.write(
    `CRIME TALK ${where}: ${found!.victim} to housemate ${found!.listener} on their own moment ${found!.momentId}, subject ${subject!.id} (stage ${subject!.stage}), said "${raised!.text}" from ${found!.causeId}. ${there}: ${victim} raises ${violent.eventId} and housemate ${housemate} has no such subject${tried.length ? ` (draws without a crime: ${tried.join("; ")})` : ""}\n`,
  );
}, 3_600_000);
