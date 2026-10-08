/**
 * The journal as a story (owner, via CTO 2:14 p.m. Oct 8): chapters cover a
 * period of a life, not one event per line; facts are folded into sentences;
 * people are named by their relationship; what goes in is chosen by salience.
 *
 * Every clause is a part of the life-story bank, mined from how Americans
 * tell their own lives in federal oral histories and testimony, with its
 * particulars filled from this person's records. Nothing here words a clause;
 * the composer only chooses which records are worth telling and joins the
 * clauses into sentences. A part the owner graded down is not chosen.
 *
 * Salience, from the records alone:
 * - where the person was born, and whether they were raised there or moved
 *   while still a child, and how old they were then;
 * - what each parent did for a living, and whether they were an only child;
 * - the high school they finished;
 * - the first job they took after school (a job held while still in school is
 *   left out, unless it is the only one), and a later job they hold now;
 * - whom they married, and how old they were when they did.
 *
 * Pure: reads the world, never writes or advances time.
 */
import lifeStoryBank from "../../data/english/parts/life-story.json" with { type: "json" };
import {
  activePartnershipsAt,
  ageOnDate,
  educationEnrollmentHistoryForPerson,
  educationEnrollmentStateAt,
  kinshipRelationshipsAt,
  lifePlaceByJurisdictionId,
  organizationProfileAt,
  workRelationshipHistoryForPerson,
  type EntityId,
  type World,
} from "../simulation";
import { workRoleAt } from "../simulation/life-queries";
import { spelledCount } from "../simulation/press/story-voice";
import { composeFromBank, type EnglishBank } from "./bank-english";
import { PART_GRADES, type PartGradeLedger } from "./english-grades";
import { grammaticalWorkRolePhrase } from "./work-start-journal-english";

const BANK = lifeStoryBank as EnglishBank;

export interface StoryChapter {
  readonly key: string;
  /** The years the chapter covers, from the records ("1997–2015"). */
  readonly heading: string;
  readonly text: string;
  /** The bank parts the chapter was told with, for the owner's grades. */
  readonly parts: readonly string[];
  readonly sourceRecordIds: readonly EntityId[];
}

interface Clause {
  readonly text: string;
  readonly partKey: string;
}

function placeName(world: World, jurisdictionId: EntityId): string | null {
  return (
    lifePlaceByJurisdictionId(jurisdictionId)?.displayName ??
    world.jurisdictions[jurisdictionId]?.name ??
    null
  );
}

function capitalized(text: string): string {
  return text.charAt(0).toLocaleUpperCase("en-US") + text.slice(1);
}

/** A clause with its tail, when both are told: "we moved to Y when I was 12". */
function withTail(clause: Clause | null, tail: Clause | null): Clause | null {
  if (!clause || !tail) return clause;
  return {
    text: `${clause.text} ${tail.text}`,
    partKey: `${clause.partKey},${tail.partKey}`,
  };
}

/** One sentence from one or two clauses: "I was born in X, and we moved to Y." */
function sentence(...clauses: readonly (Clause | null)[]): Clause | null {
  const kept = clauses.filter((clause): clause is Clause => clause !== null);
  if (kept.length === 0) return null;
  return {
    text: `${capitalized(kept.map((clause) => clause.text).join(", and "))}.`,
    partKey: kept.map((clause) => clause.partKey).join(","),
  };
}

export function composeLifeStory(
  world: World,
  personId: EntityId,
  grades: PartGradeLedger = PART_GRADES,
): readonly StoryChapter[] {
  const person = world.people[personId];
  if (!person) return [];
  const say = (
    move: string,
    facts: Record<string, string>,
    pick: string,
    excludes?: RegExp,
  ): Clause | null =>
    composeFromBank(
      BANK,
      move,
      facts,
      `life-story:${personId}:${pick}`,
      excludes,
      grades,
    );
  const sources = new Set<EntityId>([personId]);
  // How old they were on a record's date, as a newspaper spells it.
  const when = (date: string, pick: string): Clause | null =>
    say(
      "when",
      { age: spelledCount(ageOnDate(person.birthDate, date), false) },
      pick,
    );
  const adultFrom = `${Number(person.birthDate.slice(0, 4)) + 18}${person.birthDate.slice(4)}`;

  // Where they were born, and where they moved as a child.
  const birthplace = person.establishedFacts.find(
    (fact) =>
      fact.kind === "birthplace" && fact.occurredAt <= world.currentDate,
  );
  const born =
    birthplace?.jurisdictionId != null
      ? placeName(world, birthplace.jurisdictionId)
      : null;
  if (birthplace) sources.add(birthplace.id);
  const childhoodMove = person.establishedFacts.find(
    (fact) =>
      fact.kind === "residence" &&
      fact.occurredAt < adultFrom &&
      fact.occurredAt <= world.currentDate &&
      fact.jurisdictionId !== birthplace?.jurisdictionId,
  );
  const movedTo =
    childhoodMove?.jurisdictionId != null
      ? placeName(world, childhoodMove.jurisdictionId)
      : null;
  if (childhoodMove && movedTo) sources.add(childhoodMove.id);
  // "Born and raised" only when the records keep them in their birthplace:
  // no move as a child, and they live there now.
  const livesNow = person.establishedFacts
    .filter(
      (fact) =>
        fact.kind === "residence" && fact.occurredAt <= world.currentDate,
    )
    .at(-1);
  const raisedThere =
    !movedTo &&
    birthplace?.jurisdictionId != null &&
    livesNow?.jurisdictionId === birthplace.jurisdictionId;

  const early: (Clause | null)[] = [];
  if (born)
    early.push(
      movedTo && movedTo !== born
        ? sentence(
            say("birth", { place: born }, "born", /raised/),
            withTail(
              say("move", { place: movedTo }, "moved", /lived/),
              when(childhoodMove!.occurredAt, "moved-when"),
            ),
          )
        : sentence(
            say(
              "birth",
              { place: born },
              "born",
              raisedThere ? undefined : /raised/,
            ),
          ),
    );

  // Who raised them: each parent's work, and whether they were an only child.
  // A parent-child record does not order its two people; the parent is the
  // one born first.
  // A brother or sister is a sibling record, or another child of a parent
  // (as `family-shape.ts` reads it).
  const siblings = new Set<EntityId>();
  const parents: EntityId[] = [];
  for (const kinship of kinshipRelationshipsAt(world, personId)) {
    const otherId = kinship.personIds.find((id) => id !== personId);
    if (otherId && kinship.kind.includes("sibling")) siblings.add(otherId);
    if (!kinship.kind.includes("parent-child")) continue;
    const parentId = otherId;
    const parent = parentId ? world.people[parentId] : undefined;
    if (!parentId || !parent || parent.birthDate >= person.birthDate) continue;
    parents.push(parentId);
    for (const row of kinshipRelationshipsAt(world, parentId)) {
      const childId = row.personIds.find((id) => id !== parentId);
      const child = childId ? world.people[childId] : undefined;
      if (
        row.kind.includes("parent-child") &&
        childId !== personId &&
        child &&
        child.birthDate > parent.birthDate
      )
        siblings.add(childId!);
    }
    const gender = parent?.identity?.gender;
    if (!parent || (gender !== "female" && gender !== "male")) continue;
    const work = workRelationshipHistoryForPerson(world, parentId).at(-1);
    const title = work ? workRoleAt(world, work.id)?.title : undefined;
    const occupation = title ? grammaticalWorkRolePhrase(title) : null;
    if (!work || !occupation) continue;
    sources.add(kinship.id);
    sources.add(work.id);
    early.push(
      sentence(
        say(
          "family",
          { occupation },
          `parent:${parentId}`,
          gender === "female"
            ? /\b(?:father|dad)\b|only child/
            : /\b(?:mother|mom)\b|only child/,
        ),
      ),
    );
  }
  if (parents.length > 0 && siblings.size === 0)
    early.push(sentence(say("family", {}, "only-child")));

  // The high school they finished.
  let schoolDone: string | null = null;
  for (const enrollment of educationEnrollmentHistoryForPerson(
    world,
    personId,
  )) {
    if (enrollment.programKind !== "schooling:secondary") continue;
    const state = educationEnrollmentStateAt(world, enrollment.id);
    if (state?.status !== "completed") continue;
    const school = organizationProfileAt(
      world,
      enrollment.organizationId,
    )?.name;
    schoolDone = state.effectiveAt;
    sources.add(enrollment.id);
    early.push(
      sentence(
        school
          ? say("school", { school }, "graduated", /high school$/)
          : say("school", {}, "graduated"),
      ),
    );
  }

  // The first job after school, and the job they hold now if it is another.
  const leftSchool = schoolDone ?? adultFrom;
  const jobs = workRelationshipHistoryForPerson(world, personId)
    .filter((work) => work.organizationId !== null)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const firstAdult =
    jobs.find((work) => work.startedAt >= leftSchool) ?? jobs.at(-1);
  const later: (Clause | null)[] = [];
  const employed = [firstAdult, jobs.at(-1)].filter(
    (work, index, list): work is NonNullable<typeof work> =>
      work !== undefined && list.indexOf(work) === index,
  );
  for (const work of employed) {
    const employer = organizationProfileAt(world, work.organizationId!)?.name;
    if (!employer) continue;
    sources.add(work.id);
    later.push(sentence(say("work", { employer }, `work:${work.id}`)));
  }

  // Whom they married. Only a marriage: the bank's speakers say "my wife" or "my husband", which
  // a partner they have not married is not.
  for (const partnership of activePartnershipsAt(world, personId)) {
    if (partnership.kind !== "legal:marriage") continue;
    const partnerId = partnership.personIds.find((id) => id !== personId);
    const gender = partnerId
      ? world.people[partnerId]?.identity?.gender
      : undefined;
    if (gender !== "female" && gender !== "male") continue;
    sources.add(partnership.id);
    later.push(
      sentence(
        say(
          "people",
          { relation: gender === "female" ? "wife" : "husband" },
          `met:${partnership.id}`,
          /married/,
        ),
        withTail(
          say("people", {}, `married:${partnership.id}`, /\{relation\}|met/),
          when(partnership.startedAt, `married-when:${partnership.id}`),
        ),
      ),
    );
  }

  const birthYear = person.birthDate.slice(0, 4);
  const schoolYear = (schoolDone ?? adultFrom).slice(0, 4);
  const nowYear = world.currentDate.slice(0, 4);
  const chapter = (
    key: string,
    heading: string,
    told: readonly (Clause | null)[],
  ): StoryChapter[] => {
    const kept = told.filter((clause): clause is Clause => clause !== null);
    if (kept.length === 0) return [];
    return [
      {
        key,
        heading,
        text: kept.map((clause) => clause.text).join(" "),
        parts: kept.flatMap((clause) =>
          clause.partKey.split(",").map((part) => `bank:${part}`),
        ),
        sourceRecordIds: [...sources],
      },
    ];
  };
  const grownUp = ageOnDate(person.birthDate, world.currentDate) >= 18;
  return [
    ...chapter(
      "story:early",
      grownUp ? `${birthYear}–${schoolYear}` : `${birthYear}–${nowYear}`,
      early,
    ),
    ...(grownUp
      ? chapter("story:adult", `${schoolYear}–${nowYear}`, later)
      : []),
  ];
}
