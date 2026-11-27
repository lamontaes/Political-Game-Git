/**
 * Filling a person in, and recording one known only by name, the people
 * engine's part of the world (core audit K7): a counted resident becomes a
 * full person, a husk or a recorded identity is built into one, and a new
 * townsperson is tied to the classmates and coworkers the records name. They
 * were in the state file; the state keeps thin calls that reach them through
 * the people module's `fillIn` hook (the plug), so the core imports none of
 * the engines this builds a person from.
 */
import {
  promoteHusk as promoteHuskOfficial,
  unbuiltHolderOf,
} from "./husk-promoters";
import { refreshOfficeStaff } from "./civic-inputs";
import { CLOSENESS, openingClosenessHours } from "./closeness";
import { meetAtWork } from "./encounters";
import { workgroupOf } from "./shared-history";
import { derivePersonAppearance } from "./appearance";
import {
  countedJob,
  releaseResidentHousehold,
  residentFacts,
  residentPerson,
  takeResidentHousehold,
} from "./modules/residents";
import { openingTemperaments } from "./opening-personality";
import { giveHealthRecord } from "./modules/health";
import { pastForLater } from "./pre-start";
import { isDemoted } from "./counted-groups";
import { financeIndex } from "./finance-state";
import { makeIsoDate } from "./kernel/dates";
import { openingTiesOf } from "./opening-ties";
import { nativityFact } from "./nativity";
import type {
  CoreAPI,
  CoreState,
  PersonId,
  PersonInput,
  PersonState,
} from "./types";
import { pairKey } from "./kernel/ids";
import {
  OPENING_FAMILY_CAUSE,
  initialNameProvenance,
  admitPerson,
  recordEntry,
  coreAPI,
  type RecordedIdentity,
} from "./state";
import type { CoreModule } from "./types";

/**
 * Opening peer ties: a person meets the coworkers of their workgroup at their
 * employer (the jobs engine's staff, `workgroupOf`), as a new hire does
 * (`meetAtWork`), at the closeness the hours of a casual friendship leave.
 * Full people and counted ones filled in later are read the same way. A world
 * built to play (createLifeCore) opens these for every resident; people filled
 * in or promoted later open theirs as they join. Classmates meet in the school
 * engine's records once a school year is attended, not before.
 */
const SCHOOLMATES_STOPGAP = "SG-WIRE-PEOPLE-SCHOOLMATES";

export function openOpeningPeerTies(
  core: CoreState,
  api: CoreAPI,
  actor: PersonState,
): void {
  // No schooling before the start is simulated yet (engine map line 7), so
  // nobody opens knowing a schoolmate (SG-WIRE-PEOPLE-SCHOOLMATES).
  api.stopgap(SCHOOLMATES_STOPGAP);
  const job = actor.jobId ? core.jobs.get(actor.jobId) : undefined;
  if (!job || job.endsAt) return;
  meetAtWork(
    api,
    actor.id,
    job.organizationId,
    workgroupOf(core, actor.id),
    api.parameter(CLOSENESS.peerTies.hoursParameter),
    job.id,
  );
}

/** Explicit click-time admission checks every retained identity and family constraint. */
/**
 * Fill in a person from the wider population (two-level population): their
 * whole household leaves the counts and becomes full people, with the same
 * records the counts held: names, birth dates, past, traits and the job the
 * employer's books count. Their share of the residents' cash moves to them,
 * their jobs become scheduled work on the employer's pay cadence, and their
 * household purchases become their own contracts, and retirees are paid
 * their own award; the merged flows shrink by the same amounts. Returns the
 * person.
 */
/**
 * The person behind an id the player clicked or met: a full person as is, or
 * someone in the counts (a husk relative included) filled in now. Undefined
 * only for an id no record holds.
 */
export function personOrFillIn(
  core: CoreState,
  personId: PersonId,
): PersonState | undefined {
  const full = core.people.get(personId);
  // A husk, or another place's holder nobody has opened, is built by the
  // engine that keeps them.
  if (
    !full &&
    (core.husks.has(personId) || unbuiltHolderOf(core, personId) !== undefined)
  ) {
    const promoted = promoteHuskOfficial(core, personId);
    if (promoted) return promoted;
  }
  // Someone returned to the counts comes back as the same person.
  if (full && !isDemoted(full)) return full;
  if (!residentFacts(core, personId)) return full;
  return fillInPerson(core, personId);
}

/** How many counted people each world has made full people, so a caller can tell a read that filled someone in. */
const fillIns = new WeakMap<CoreState, number>();

/** The number of people filled in from the counts in this world so far. */
export function fillInCount(core: CoreState): number {
  return fillIns.get(core) ?? 0;
}

export function fillInPerson(core: CoreState, personId: PersonId): PersonState {
  const existing = core.people.get(personId);
  if (existing && !isDemoted(existing)) return existing;
  // A household returned to the counts comes back with its own records.
  const returning = existing !== undefined;
  const taken = takeResidentHousehold(core, personId);
  if (!taken) throw new Error(`Not in the wider population: ${personId}`);
  fillIns.set(core, fillInCount(core) + 1);
  // Their past exists only from now: the engines' pre-start passes give the
  // household its years before the start when it is filled in (each
  // module's onFillIn), read against the same records as the opening's.
  const record = taken;
  const api = coreAPI(core);
  const home = record.household;
  if (returning) {
    // A member born or married into the household while it was in the counts has no full record yet: they are admitted below, as in a first fill-in.
    const back = record.people.filter((row) => core.people.has(row.id));
    for (const row of back) api.updatePerson(row.id, { tier: row.tier });
    // A member still on file in the counted place whom the counted record no
    // longer holds comes back with the household too, so it moves whole.
    const unrecorded = (core.households.get(home.id)?.memberIds ?? []).filter(
      (id) => {
        const kept = core.people.get(id);
        return (
          kept !== undefined &&
          kept.alive &&
          isDemoted(kept) &&
          !back.some((row) => row.id === id)
        );
      },
    );
    api.relocatePeopleV1({
      personIds: [...back.map((row) => row.id), ...unrecorded],
      placeId: home.placeId,
      ...(record.people[0]?.countyId
        ? { countyId: record.people[0].countyId }
        : {}),
      householdId: home.id,
      source: home.source,
    });
  } else {
    if (core.households.has(home.id))
      throw new Error(`Household already present: ${home.id}`);
    core.households.set(home.id, { ...home, memberIds: [...home.memberIds] });
  }
  const jobs = new Map(record.jobs.map((row) => [row.id, row]));
  // Ties to people still counted become husks, met and filled in later.
  const husk = (id: PersonId) => {
    if (core.people.has(id) || core.husks.has(id)) return;
    const other =
      record.people.find((row) => row.id === id) ?? residentPerson(core, id);
    if (!other) return;
    core.husks.set(id, {
      id,
      givenName: other.givenName,
      familyName: other.familyName,
      placeId: other.placeId,
      ...(other.countyId ? { countyId: other.countyId } : {}),
      looks: { ...(other.looks ?? {}) },
      said: [...(other.said ?? [])],
      birthDate: other.birthDate,
      familyIds: [...other.familyIds],
      source: other.source,
    });
  };
  const admitted: PersonState[] = [];
  for (const row of record.people) {
    core.husks.delete(row.id);
    if (returning && core.people.has(row.id)) {
      // Their counted job, if any, is theirs again.
      const job = record.jobs.find(
        (j) => j.personId === row.id && countedJob(core, j.id) !== undefined,
      );
      if (job) {
        core.jobs.set(job.id, { ...(countedJob(core, job.id) ?? job) });
        financeIndex(
          core.finance.jobsByOrganization,
          job.organizationId,
          job.id,
        );
        api.updatePerson(row.id, { jobId: job.id });
        refreshOfficeStaff(core, job.organizationId);
      }
      admitted.push(core.people.get(row.id)!);
      continue;
    }
    const recorded = row.jobId ? jobs.get(row.jobId) : undefined;
    // The counted job as it stands today (pay may have changed since the opening).
    const job = recorded
      ? (countedJob(core, recorded.id) ?? recorded)
      : undefined;
    const active = recorded
      ? countedJob(core, recorded.id) !== undefined
      : false;
    // Neighbors and county coworkers they know from their years in place.
    const ties = openingTiesOf(core, row, home);
    admitted.push(
      admitPerson(core, {
        ...row,
        liquidMinor: 0,
        ...(ties.length
          ? { knownIds: [...new Set([...row.knownIds, ...ties])] }
          : {}),
        ...(active ? {} : { jobId: undefined }),
      }),
    );
    if (returning) {
      const household = core.households.get(home.id)!;
      core.households.set(home.id, {
        ...household,
        memberIds: [...household.memberIds, row.id],
      });
    }
    if (job && active) {
      core.jobs.set(job.id, { ...job });
      financeIndex(core.finance.jobsByOrganization, job.organizationId, job.id);
      refreshOfficeStaff(core, job.organizationId);
    }
  }
  // Their economic life moves from the merged flows to their own records.
  const released = releaseResidentHousehold(core, record);
  if (released.accountId) {
    const accounts = api.accounts(),
      from = accounts.main(released.accountId),
      pool = accounts.balance(from),
      household = record.people.reduce((n, row) => n + row.liquidMinor, 0);
    for (const row of record.people) {
      const amount =
        household > 0
          ? Math.floor(
              (pool * released.cashShare * row.liquidMinor) / household,
            )
          : 0;
      if (amount > 0)
        accounts.transfer({
          id: `fill-in:${row.id}:${released.sequence}:cash`,
          from,
          to: accounts.main(row.id),
          amountMinor: amount,
          reasonKey: "residents.fill-in.cash",
          source: row.source,
        });
    }
  }
  for (const commitment of record.workCommitments) {
    const job = core.jobs.get(commitment.jobId);
    const original = commitment.payrollCalendarId
      ? released.calendars.get(commitment.payrollCalendarId)
      : undefined;
    if (!job || job.endsAt !== undefined || !original) continue;
    const calendarId = `${original.id}:filled:${commitment.id}`;
    api.addWorkCommitment({
      ...commitment,
      // Work and pay run from today; the job has been theirs since the
      // counted record's own start.
      heldSince: commitment.heldSince ?? commitment.startsAt,
      startsAt: makeIsoDate(core.date),
      hourlyMinor: job.hourlyMinor ?? commitment.hourlyMinor,
      payrollCalendarId: calendarId,
    });
    api.addWorkPayrollCalendar({
      ...original,
      id: calendarId,
      workCommitmentIds: [commitment.id],
      basisRecordIds: [job.organizationId, job.id, commitment.id],
      effectiveFrom: makeIsoDate(core.date),
    });
  }
  for (const contract of record.contracts) {
    if (contract.recipientIncome) continue; // paid by the residents engine's own flow
    const day = Number(contract.dueAt.slice(8, 10));
    let dueAt = makeIsoDate(contract.dueAt);
    while (dueAt <= core.date) {
      const next = new Date(`${dueAt}T00:00:00.000Z`);
      next.setUTCDate(1);
      next.setUTCMonth(next.getUTCMonth() + contract.periodMonths);
      const last = new Date(
        Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
      ).getUTCDate();
      next.setUTCDate(Math.min(day, last));
      dueAt = makeIsoDate(next.toISOString().slice(0, 10));
    }
    api.addFinanceContract({
      ...contract,
      dueAt,
    });
  }
  // Full people who already name a newcomer as family (it was their husk).
  const newcomers = new Set(admitted.map((actor) => actor.id));
  for (const other of core.people.values())
    if (!newcomers.has(other.id))
      for (const id of other.familyIds)
        if (newcomers.has(id)) {
          core.people.get(id)!.familyIds.add(other.id);
          const relationshipId = pairKey(other.id, id);
          if (!core.relationships.has(relationshipId))
            api.relationship(
              other.id,
              id,
              "family",
              openingClosenessHours(core, other.id, id),
              undefined,
              { cause: OPENING_FAMILY_CAUSE },
            );
        }
  for (const actor of admitted) {
    // Counted all along; now followed in full, with a record of it.
    recordEntry(core, {
      id: actor.id,
      kind: "person",
      reason: returning ? "returned" : "filled-in",
      placeId: actor.placeId,
    });
    for (const id of [...actor.familyIds, ...actor.knownIds]) husk(id);
    for (const id of actor.familyIds)
      if (core.people.has(id)) {
        const relationshipId = pairKey(actor.id, id);
        if (!core.relationships.has(relationshipId))
          api.relationship(
            actor.id,
            id,
            "family",
            openingClosenessHours(core, actor.id, id),
            undefined,
            { cause: OPENING_FAMILY_CAUSE },
          );
      }
    openOpeningPeerTies(core, api, actor);
    for (const id of actor.knownIds) {
      const other = core.people.get(id) ?? core.husks.get(id);
      if (!other) continue;
      api.observe(actor.id, {
        key: `person:${id}:name`,
        value: `${other.givenName} ${other.familyName}`,
        ...initialNameProvenance(core, actor, id),
        access: "perceived",
      });
    }
    const job = actor.jobId ? core.jobs.get(actor.jobId) : undefined;
    if (job) {
      api.observe(actor.id, {
        key: `job:${job.id}:pay`,
        value: String(job.wageDailyMinor),
        learnedAt: core.date,
        sourceId: job.id,
        access: "self",
      });
      api.observe(actor.id, {
        key: `organization:${job.organizationId}:public`,
        value: job.organizationId,
        learnedAt: core.date,
        sourceId: job.id,
        access: "perceived",
      });
    }
  }
  // Their health comes from the health engine's model, seeded by the world
  // and the person, as the opening's people's did.
  for (const actor of admitted) giveHealthRecord(api, actor.id);
  for (const module of core.modules.values())
    module.onFillIn?.(api, {
      householdId: home.id,
      memberIds: record.people.map((row) => row.id),
    });
  return core.people.get(personId)!;
}

/**
 * Fill in a named person who exists only as a recorded identity (state and
 * federal officials): a full person in their own household at their place,
 * with their identity, party and seat as past facts. Traits stay neutral until
 * PEOPLE's builder supplies them (stopgap SG-CORE-identity-fill-in-traits).
 * Returns the existing person if already full.
 */
/** A stored look for someone filled in, under the recipe of the people already here. */
function lookOf(
  core: CoreState,
  personId: string,
): { appearanceSeed: string; recipeVersion: string } {
  let recipe: string | undefined;
  for (const person of core.people.values())
    if ((recipe = person.looks?.recipeVersion)) break;
  const look = derivePersonAppearance(personId, recipe);
  return { appearanceSeed: look.seed, recipeVersion: look.recipeVersion };
}

export function fillInIdentity(
  core: CoreState,
  identity: RecordedIdentity,
): PersonState {
  const existing = core.people.get(identity.id);
  if (existing) return existing;
  if (takeResidentHousehold(core, identity.id))
    throw new Error("A counted resident is filled in with fillInPerson.");
  makeIsoDate(identity.birthDate);
  // Seeded by the world and the person, matched to real norms by age and sex,
  // as the opening gives everyone theirs: the same person every time.
  const traits =
    openingTemperaments(
      [
        {
          id: identity.id,
          birthDate: makeIsoDate(identity.birthDate),
          ...(identity.gender ? { gender: identity.gender } : {}),
          parents: [],
        },
      ],
      { seed: core.seed, startedAt: makeIsoDate(core.startedAt) },
    ).get(identity.id) ?? {};
  const householdId = `household:${identity.id}`;
  if (core.households.has(householdId))
    throw new Error(`Identity household already present: ${householdId}`);
  core.households.set(householdId, {
    id: householdId,
    placeId: identity.placeId,
    memberIds: [identity.id],
    source: identity.source,
  });
  core.husks.delete(identity.id);
  const facts: NonNullable<PersonInput["pastFacts"]>[number][] = [
    ...(identity.party
      ? [
          {
            id: `${identity.id}:party`,
            date: core.date,
            kind: "identity:party",
            summary: identity.party,
            source: identity.source,
            facts: { party: identity.party },
          },
        ]
      : []),
    ...(identity.seatKey
      ? [
          {
            id: `${identity.id}:seat`,
            date: core.date,
            kind: "identity:seat",
            summary: identity.seatKey,
            source: identity.source,
            facts: { seatKey: identity.seatKey },
          },
        ]
      : []),
    ...(identity.work
      ? [
          {
            id: `${identity.id}:work`,
            date: core.date,
            kind: "identity:work",
            summary: identity.work.title,
            source: identity.source,
            facts: {
              workplace: identity.work.workplace,
              title: identity.work.title,
              occupation: identity.work.occupation,
              weeklyHours: String(identity.work.weeklyHours),
              ...(identity.work.hourlyMinor === null
                ? {}
                : { hourlyMinor: String(identity.work.hourlyMinor) }),
            },
          },
        ]
      : []),
    // An official's birth: native-born or not, which the line of succession reads.
    ...(identity.seatKey
      ? [
          nativityFact({
            seed: core.seed,
            personId: identity.id,
            placeId: identity.placeId,
            birthDate: identity.birthDate,
            date: core.date,
            qualified:
              identity.eligibleForPresidency === true ||
              identity.seatKey === "seat:US:president" ||
              identity.seatKey === "seat:US:vice-president",
            source: identity.source,
          }),
        ]
      : []),
  ];
  const openingCash = identity.openingLiquidMinor ?? 0;
  if (openingCash > 0 && core.date !== core.startedAt)
    throw new Error(
      `Opening cash for ${identity.id} is only admitted on the opening day.`,
    );
  const input: PersonInput = {
    id: identity.id,
    givenName: identity.givenName,
    familyName: identity.familyName,
    birthDate: identity.birthDate,
    placeId: identity.placeId,
    ...(identity.countyId ? { countyId: identity.countyId } : {}),
    householdId,
    tier: identity.tier ?? "monthly",
    traits: identity.traits ? { ...identity.traits } : traits,
    liquidMinor: openingCash,
    livingCostDailyMinor: 0,
    source: identity.source,
    familyIds: [],
    knownIds: [],
    // Their look is stored once, from the one writer residents' looks come
    // from, under the recipe the world's people already carry.
    looks: {
      ...(identity.gender ? { gender: identity.gender } : {}),
      ...lookOf(core, identity.id),
    },
    pastFacts: facts,
  };
  const person = admitPerson(core, input);
  // A named person filled in after the run gets the years before the start
  // the engines' runs give everyone (the school years, by the school
  // engine's own rule).
  pastForLater(core, [person]);
  recordEntry(core, {
    id: person.id,
    kind: "person",
    reason: identity.seatKey ? "seated-official" : "named-person",
    placeId: person.placeId,
  });
  return person;
}

export function promoteHusk(core: CoreState, input: PersonInput): PersonState {
  const husk = core.husks.get(input.id);
  if (!husk) throw new Error("Promotion requires a recorded husk.");
  for (const field of [
    "givenName",
    "familyName",
    "placeId",
    "countyId",
  ] as const)
    if (husk[field] !== input[field])
      throw new Error(`Promotion contradicts ${field}.`);
  if (husk.birthDate && husk.birthDate !== input.birthDate)
    throw new Error("Promotion contradicts birth date.");
  if (husk.familyIds?.some((id) => !input.familyIds.includes(id)))
    throw new Error("Promotion removes established family.");
  if (!core.households.get(input.householdId)?.memberIds.includes(input.id))
    throw new Error("Promotion requires a consistent household.");
  if (input.familyIds.some((id) => id === input.id || !core.people.has(id)))
    throw new Error("Promotion requires existing family members.");
  if (input.knownIds.some((id) => !core.people.has(id) && !core.husks.has(id)))
    throw new Error("Promotion requires recorded contacts.");
  const job = input.jobId ? core.jobs.get(input.jobId) : undefined;
  if (
    input.jobId &&
    (!job ||
      job.personId !== input.id ||
      job.endsAt !== undefined ||
      core.finance.businesses.get(job.organizationId)?.closedAt !== undefined)
  )
    throw new Error("Promotion requires an owned job.");
  const actor = admitPerson(core, {
    ...input,
    said: husk.said,
    looks: husk.looks,
  });
  recordEntry(core, {
    id: actor.id,
    kind: "person",
    reason: "promoted",
    placeId: actor.placeId,
  });
  const api = coreAPI(core);
  for (const id of actor.familyIds) {
    if (core.relationships.has(pairKey(actor.id, id))) continue;
    api.relationship(
      actor.id,
      id,
      "family",
      openingClosenessHours(core, actor.id, id),
      undefined,
      { cause: OPENING_FAMILY_CAUSE },
    );
  }
  openOpeningPeerTies(core, api, actor);
  for (const id of actor.knownIds) {
    const other = core.people.get(id) ?? core.husks.get(id)!;
    api.observe(actor.id, {
      key: `person:${id}:name`,
      value: `${other.givenName} ${other.familyName}`,
      ...initialNameProvenance(core, actor, id),
      access: "perceived",
    });
  }
  if (job) {
    api.observe(actor.id, {
      key: `job:${job.id}:pay`,
      value: String(job.wageDailyMinor),
      learnedAt: core.date,
      sourceId: job.id,
      access: "self",
    });
    api.observe(actor.id, {
      key: `organization:${job.organizationId}:public`,
      value: job.organizationId,
      learnedAt: core.date,
      sourceId: job.id,
      access: "perceived",
    });
  }
  core.husks.delete(input.id);
  return actor;
}

/** The people engine's fill-in, the plug's `fillIn` hook. */
export const PEOPLE_FILL_IN: ReturnType<NonNullable<CoreModule["fillIn"]>> = {
  person: fillInPerson,
  personOrFillIn,
  identity: fillInIdentity,
  promoteHusk,
  count: fillInCount,
};
