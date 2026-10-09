/**
 * TEMPORARY: fills the chapter packet from the records the journal already
 * reads, until the story director's build step 7 produces packets from moments
 * and threads (CTO 5:53 p.m. Oct 8: "P3 builds story-chapter-packet.ts with
 * the one temporary adapter, which step 7 deletes").
 *
 * Two chapters: growing up, from birth until the person finished high school
 * or turned 18, in their birthplace; and adult life since, where they live
 * now. The adapter has no moment salience or threads, so it reports no people
 * who matter, no causes between moments and no quiet stretches; those come
 * with step 7. A feeling is reported only where the records say it: a parent's
 * death was hard.
 *
 * Pure: reads the world, never writes or advances time.
 */
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
  type IsoDate,
  type World,
} from "../simulation";
import { workRoleAt } from "../simulation/life-queries";
import { deathOf } from "../simulation/people-continuation";
import { observedTraitLabels } from "../simulation/people-traits";
import type {
  StoryChapterPacket,
  StoryMoment,
  StoryRaiser,
} from "./story-chapter-packet";
import { grammaticalWorkRolePhrase } from "./work-start-journal-english";

function placeName(world: World, jurisdictionId: EntityId): string | null {
  return (
    lifePlaceByJurisdictionId(jurisdictionId)?.displayName ??
    world.jurisdictions[jurisdictionId]?.name ??
    null
  );
}

export function buildStoryChapterPackets(
  world: World,
  personId: EntityId,
): readonly StoryChapterPacket[] {
  const person = world.people[personId];
  if (!person) return [];
  const ageOn = (date: IsoDate) => ageOnDate(person.birthDate, date);
  const now = world.currentDate;
  const adultFrom =
    `${Number(person.birthDate.slice(0, 4)) + 18}${person.birthDate.slice(4)}` as IsoDate;
  const temperament = observedTraitLabels(world, personId);

  const birthplace = person.establishedFacts.find(
    (fact) => fact.kind === "birthplace" && fact.occurredAt <= now,
  );
  const residences = person.establishedFacts.filter(
    (fact) => fact.kind === "residence" && fact.occurredAt <= now,
  );
  const livesNow = residences.at(-1);
  const childhoodMove = residences.find(
    (fact) =>
      fact.occurredAt < adultFrom &&
      fact.jurisdictionId !== birthplace?.jurisdictionId,
  );

  // Parents, by birth order (a parent-child record does not say which is
  // which), their work while raising the person, and brothers and sisters.
  const raisedBy: StoryRaiser[] = [];
  const siblings = new Set<EntityId>();
  const parentIds: EntityId[] = [];
  const kinSources: EntityId[] = [];
  for (const kinship of kinshipRelationshipsAt(world, personId)) {
    const otherId = kinship.personIds.find((id) => id !== personId);
    if (!otherId) continue;
    if (kinship.kind.includes("sibling")) {
      siblings.add(otherId);
      kinSources.push(kinship.id);
    }
    if (!kinship.kind.includes("parent-child")) continue;
    const parent = world.people[otherId];
    if (!parent || parent.birthDate >= person.birthDate) continue;
    parentIds.push(otherId);
    kinSources.push(kinship.id);
    for (const row of kinshipRelationshipsAt(world, otherId)) {
      const childId = row.personIds.find((id) => id !== otherId);
      const child = childId ? world.people[childId] : undefined;
      if (
        row.kind.includes("parent-child") &&
        childId !== personId &&
        child &&
        child.birthDate > parent.birthDate
      ) {
        siblings.add(childId!);
        kinSources.push(row.id);
      }
    }
    const gender = parent.identity?.gender;
    if (gender !== "female" && gender !== "male") continue;
    // Only work begun before the person turned 18.
    const work = workRelationshipHistoryForPerson(world, otherId)
      .filter((job) => job.startedAt < adultFrom)
      .at(-1);
    const title = work ? workRoleAt(world, work.id)?.title : undefined;
    raisedBy.push({
      personId: otherId,
      relation: gender === "female" ? "mother" : "father",
      occupation: title ? grammaticalWorkRolePhrase(title) : null,
      sourceRecordIds: [kinship.id, ...(work && title ? [work.id] : [])],
    });
  }
  const genderCount = (gender: "female" | "male") =>
    [...siblings].filter((id) => world.people[id]?.identity?.gender === gender)
      .length;

  // A parent's death, in whichever chapter it falls.
  const losses: StoryMoment[] = raisedBy.flatMap((raiser) => {
    const death = deathOf(world, raiser.personId);
    if (!death || death.diedAt < person.birthDate) return [];
    return [
      {
        key: `loss:${death.id}`,
        kind: "loss" as const,
        date: death.diedAt,
        age: ageOn(death.diedAt),
        facts: { parent: raiser.relation },
        causeKey: null,
        feeling: "hard" as const,
        sourceRecordIds: [death.id, ...raiser.sourceRecordIds],
      },
    ];
  });

  // The high school they finished.
  const schools: StoryMoment[] = [];
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
    schools.push({
      key: `school:${enrollment.id}`,
      kind: "school-finished",
      date: state.effectiveAt,
      age: ageOn(state.effectiveAt),
      facts: school ? { school } : {},
      causeKey: null,
      feeling: null,
      sourceRecordIds: [enrollment.id],
    });
  }
  const leftSchool = schools.at(-1)?.date ?? adultFrom;

  // The first job after school, and the one they hold now if it is another.
  const jobs = workRelationshipHistoryForPerson(world, personId)
    .filter((work) => work.organizationId !== null)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const firstAdult =
    jobs.find((work) => work.startedAt >= leftSchool) ?? jobs.at(-1);
  const work: StoryMoment[] = [firstAdult, jobs.at(-1)]
    .filter(
      (job, index, list): job is NonNullable<typeof job> =>
        job !== undefined && list.indexOf(job) === index,
    )
    .flatMap((job) => {
      const employer = organizationProfileAt(world, job.organizationId!)?.name;
      if (!employer) return [];
      return [
        {
          key: `work:${job.id}`,
          kind: "work-started" as const,
          date: job.startedAt,
          age: ageOn(job.startedAt),
          facts: { employer },
          causeKey: null,
          feeling: null,
          sourceRecordIds: [job.id],
        },
      ];
    });

  // A marriage: the bank's speakers say "my wife" or "my husband".
  const marriages: StoryMoment[] = activePartnershipsAt(world, personId)
    .filter((partnership) => partnership.kind === "legal:marriage")
    .flatMap((partnership) => {
      const partnerId = partnership.personIds.find((id) => id !== personId);
      const gender = partnerId
        ? world.people[partnerId]?.identity?.gender
        : undefined;
      if (gender !== "female" && gender !== "male") return [];
      return [
        {
          key: `married:${partnership.id}`,
          kind: "married" as const,
          date: partnership.startedAt,
          age: ageOn(partnership.startedAt),
          facts: { relation: gender === "female" ? "wife" : "husband" },
          causeKey: null,
          feeling: null,
          sourceRecordIds: [partnership.id],
        },
      ];
    });

  const moved: StoryMoment[] =
    childhoodMove?.jurisdictionId != null
      ? (() => {
          const place = placeName(world, childhoodMove.jurisdictionId);
          return place
            ? [
                {
                  key: `moved:${childhoodMove.id}`,
                  kind: "moved" as const,
                  date: childhoodMove.occurredAt,
                  age: ageOn(childhoodMove.occurredAt),
                  facts: { place },
                  causeKey: null,
                  feeling: null,
                  sourceRecordIds: [childhoodMove.id],
                },
              ]
            : [];
        })()
      : [];

  const byDate = (moments: readonly StoryMoment[]) =>
    [...moments].sort((a, b) => a.date.localeCompare(b.date));
  const grownUp = ageOn(now) >= 18;
  const narratorAgeNow = ageOn(now);
  const packets: StoryChapterPacket[] = [];

  const born =
    birthplace?.jurisdictionId != null
      ? placeName(world, birthplace.jurisdictionId)
      : null;
  if (birthplace?.jurisdictionId != null && born) {
    const through = grownUp ? leftSchool : now;
    const moments = byDate([
      ...moved,
      ...losses.filter((loss) => loss.date < through),
      ...schools,
    ]);
    packets.push({
      key: "story:early",
      personId,
      place: { name: born, jurisdictionId: birthplace.jurisdictionId },
      bornHere: true,
      raisedHere:
        moved.length === 0 &&
        livesNow?.jurisdictionId === birthplace.jurisdictionId,
      from: person.birthDate,
      through,
      ageFrom: 0,
      ageThrough: ageOn(through),
      current: !grownUp,
      narratorAgeNow,
      quiet: moments.length === 0,
      raisedBy,
      siblings:
        parentIds.length > 0
          ? {
              brothers: genderCount("male"),
              sisters: genderCount("female"),
              total: siblings.size,
            }
          : null,
      people: [],
      moments,
      texture: { smallTown: null, temperament },
      sourceRecordIds: [
        personId,
        birthplace.id,
        ...kinSources,
        ...moments.flatMap((moment) => moment.sourceRecordIds),
      ],
    });
  }
  if (grownUp && livesNow?.jurisdictionId != null) {
    const place = placeName(world, livesNow.jurisdictionId);
    const moments = byDate([
      ...work,
      ...marriages,
      ...losses.filter((loss) => loss.date >= leftSchool),
    ]);
    if (place)
      packets.push({
        key: "story:adult",
        personId,
        place: { name: place, jurisdictionId: livesNow.jurisdictionId },
        bornHere: false,
        raisedHere: false,
        from: leftSchool,
        through: now,
        ageFrom: ageOn(leftSchool),
        ageThrough: narratorAgeNow,
        current: true,
        narratorAgeNow,
        quiet: moments.length === 0,
        raisedBy: [],
        siblings: null,
        people: [],
        moments,
        texture: { smallTown: null, temperament },
        sourceRecordIds: [
          personId,
          livesNow.id,
          ...moments.flatMap((moment) => moment.sourceRecordIds),
        ],
      });
  }
  return packets;
}
