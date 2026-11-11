/**
 * What a letter from a relative elsewhere may say, from the record that
 * caused it (`family.contact`, kin-contact.ts) and the records around it: where
 * the writer lives (the person's place), what changed in their life since
 * their last letter (`life-news.ts`), whether they missed a birthday at the
 * player's table (`family.gathering-missed`) and whether their own birthday is
 * close (the person's birth date). Each fact is cited to the records it came
 * from; a letter with none of them still asks for a visit or an answer.
 */
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  FAMILY_CONTACT,
  FAMILY_GATHERING_MISSED,
} from "../core2/modules/people";
import { P } from "../core2/parameters";
import type { CoreState, PersonId } from "../core2/types";
import rulesFile from "./data/scene-talk-rules.json" with { type: "json" };
import { newsSince, recordsSince, type NewsFact } from "./life-news";

/** The situation type that reads these facts. */
export const LETTER_TYPE = "letter";

/** Days a missed birthday is still on the writer's mind; days ahead the writer's own birthday is near. */
const {
  missedBirthdayDays: MISSED_DAYS,
  birthdayNearDays: BIRTHDAY_NEAR_DAYS,
} = rulesFile.letterFacts;

/**
 * The facts a letter's cause record gives a scene between the writer
 * (`askerId`) and the reader (`askedId`). Empty for any other type.
 */
export function letterFacts(
  core: Readonly<CoreState>,
  typeKey: string,
  causeId: string,
  askerId: PersonId,
  askedId: PersonId,
  placeSaid: (placeId: string) => string | null,
): Record<string, NewsFact> {
  if (typeKey !== LETTER_TYPE) return {};
  const letter = core.durableLog.get(causeId);
  const writer = core.people.get(askerId);
  const reader = core.people.get(askedId);
  if (letter?.kind !== FAMILY_CONTACT || !writer || !reader) return {};
  const facts: Record<string, NewsFact> = {};
  const town = placeSaid(writer.placeId);
  if (town)
    facts.hometown = { text: town, sourceRecordIds: [writer.placeId, causeId] };

  // The writer's last letter before this one: what changed since is the news.
  const before = recordsSince(
    core,
    askerId,
    FAMILY_CONTACT,
    "0000-00-00",
    letter.date,
  ).find(
    (row) => row.date < letter.date && row.personIds.at(P.zero) === askedId,
  );
  if (before)
    for (const [key, fact] of Object.entries(
      newsSince(core, askerId, before.date, reader.householdId, letter.date),
    ))
      facts[key] = {
        text: fact.text,
        sourceRecordIds: [...fact.sourceRecordIds, causeId],
      };

  // A birthday at the reader's table the writer was missing from.
  const missed = recordsSince(
    core,
    askerId,
    FAMILY_GATHERING_MISSED,
    addDays(makeIsoDate(letter.date), -MISSED_DAYS.value),
    letter.date,
  ).find(
    (row) =>
      row.personIds.at(P.zero) === askedId && row.facts?.absentId === askerId,
  );
  if (missed)
    facts["missed-birthday"] = {
      text: "yes",
      sourceRecordIds: [missed.id, causeId],
    };

  // The writer's own birthday, close ahead.
  const [year] = letter.date.split("-");
  const [, month, day] = writer.birthDate.split("-");
  const mark = `${month}-${day}`;
  const next = [`${year}-${mark}`, `${Number(year) + P.one}-${mark}`].find(
    (day) => day >= letter.date,
  );
  if (
    next &&
    next !== `${year}-02-29` &&
    next <= addDays(makeIsoDate(letter.date), BIRTHDAY_NEAR_DAYS.value)
  )
    facts["birthday-near"] = {
      text: "yes",
      sourceRecordIds: [askerId, causeId],
    };
  return facts;
}
