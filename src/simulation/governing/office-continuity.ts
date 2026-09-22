import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import {
  addDays,
  compareSimulationMoments,
  makeIsoDate,
  simulationMomentOnLocalDate,
} from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { formatStatutoryDate } from "../legislation-content-contracts";
import { stateJurisdictionForKey } from "../life-places";
import { LIVING_WORLD_SCENARIO_PROFILE } from "../living-world/contract";
import {
  MINIMUM_AGE,
  congressSeats,
  seatTermWindow,
} from "../living-world/congress-seats";
import type { CongressSeat } from "../living-world/congress-seats";
import {
  CONGRESS_TURNOVER_PROFILE,
  congressionalElectionDay,
} from "../living-world/congress-turnover";
import {
  LIVING_WORLD_KEYS,
  LIVING_WORLD_WRITER_VERSION,
  SEAT_CAUCUS_TAG,
  SEAT_PARTY_TAG,
  SEAT_TENURE_EVENT,
  SEAT_VACANCY_EVENT,
  congressSeatTitle,
  livingWorldOrganizationId,
} from "../living-world/opening";
import { nationalOfficeHolder } from "../national-election-consumer";
import { appendNationalRecord, nationalRecords } from "../national-elections";
import { drawCanonicalName, personName } from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng } from "../rng";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import { stateExecutiveOffice } from "../nationwide-world/state-executives";
import type {
  EntityId,
  EventVisibility,
  FutureDueItem,
  FutureTransitionHandlerResult,
  HistoricalEvent,
  IsoDate,
  World,
} from "../types";
import { recordWorldEvent } from "../world";

/**
 * GOVERNING K3 — what happens to an office when its holder dies or loses
 * capacity.
 *
 * CRISIS reports the fact; this module decides what the law the game has
 * compiled says follows, once per notice. Where the game has the rule it acts
 * (a Vice President succeeds under the Twenty-Fifth Amendment, § 1; a dead
 * Representative's seat is vacant until a special election). Where it does not
 * (Senate appointments, governors' successors, the statutory line of
 * succession) it writes a public record saying exactly what is missing and
 * leaves the office unfilled rather than inventing a successor.
 */

export const OFFICE_CONTINUITY_VERSION = "office-continuity/v1";
export const OFFICE_CONTINUITY_EVENT = "governing.office-continuity" as const;
export const HOUSE_SPECIAL_ELECTION = "governing:house-special-election";

/** Game profile, not law: states set their own special-election calendars. */
export const HOUSE_SPECIAL_ELECTION_PROFILE = {
  id: "ocd-house-special-election-game-profile/v1",
  daysFromVacancyToElection: 90,
  samePartyPermille: 750,
} as const;

export const OFFICE_CONTINUITY_SOURCES = {
  amendment25: {
    label: "U.S. Const. amend. XXV",
    url: "https://constitution.congress.gov/constitution/amendment-25/",
  },
  successionAct: {
    label: "3 U.S.C. § 19",
    url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title3-section19&num=0&edition=prelim",
  },
  houseVacancy: {
    label: "U.S. Const. art. I, § 2, cl. 4",
    url: "https://constitution.congress.gov/browse/article-1/section-2/clause-4/",
  },
  senateVacancy: {
    label: "U.S. Const. amend. XVII",
    url: "https://constitution.congress.gov/constitution/amendment-17/",
  },
} as const;

/** The CRISIS notice shape, copied structurally so neither lane imports the other. */
export interface OfficeContinuityNoticeInput {
  readonly noticeKey: string;
  readonly sequence: number;
  readonly originEventId: EntityId;
  readonly personId: EntityId;
  readonly kind: "death" | "incapacity-began" | "incapacity-ended";
  readonly effectiveDate: IsoDate;
  readonly recordedDate: IsoDate;
  readonly visibility: EventVisibility;
  readonly offices: readonly {
    readonly officeKey: string;
    readonly title: string;
    readonly organizationId: EntityId | null;
    readonly termEvidenceId: EntityId | null;
  }[];
  readonly sourceRecordId: EntityId;
}

export type OfficeContinuityOutcome =
  | "succeeded"
  | "vacant"
  | "special-election"
  | "blocked"
  | "not-automatic"
  | "no-change";

export interface OfficeContinuityRuling {
  readonly officeKey: string;
  readonly title: string;
  readonly outcome: OfficeContinuityOutcome;
  readonly sentence: string;
}

export function officeContinuityDedupeKey(
  notice: Pick<OfficeContinuityNoticeInput, "noticeKey">,
): string {
  return `${notice.noticeKey}|governing|${OFFICE_CONTINUITY_VERSION}`;
}

function consumedKey(notice: OfficeContinuityNoticeInput): string {
  return `${OFFICE_CONTINUITY_VERSION}:${officeContinuityDedupeKey(notice)}`;
}

const CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
};

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

function seatFor(officeKey: string): CongressSeat | null {
  const [chamberKey, ...rest] = officeKey.split(":");
  const seatKey = rest.join(":");
  return (
    congressSeats().find(
      (seat) =>
        seat.chamberKey === chamberKey &&
        (seat.seatKey === seatKey || seat.seatKey === officeKey),
    ) ?? null
  );
}

function latestSeatRecord(
  world: World,
  seatKey: string,
): HistoricalEvent | undefined {
  let latest: HistoricalEvent | undefined;
  for (const event of world.history.events) {
    if (
      (event.type !== SEAT_TENURE_EVENT && event.type !== SEAT_VACANCY_EVENT) ||
      !event.tags.includes(LIVING_WORLD_WRITER_VERSION) ||
      tagValue(event, "seat:") !== seatKey
    )
      continue;
    if (
      !latest ||
      event.occurredAt > latest.occurredAt ||
      (event.occurredAt === latest.occurredAt &&
        event.sequence > latest.sequence)
    )
      latest = event;
  }
  return latest;
}

function seatTags(seat: CongressSeat, onDate: IsoDate): string[] {
  const window = seatTermWindow(seat, onDate);
  return [
    LIVING_WORLD_WRITER_VERSION,
    OFFICE_CONTINUITY_VERSION,
    `office:${seat.chamberKey}`,
    `seat:${seat.seatKey}`,
    `state:${seat.stateUsps}`,
    `term-start:${window.startsAt}`,
    `term-end:${window.endExclusive}`,
  ];
}

function specialElectionKey(seat: CongressSeat, vacancyDate: IsoDate): string {
  return `${OFFICE_CONTINUITY_VERSION}:special:${seat.seatKey}:${vacancyDate}`;
}

/** A dead member's seat becomes vacant from the day of death. */
function vacateSeat(
  world: World,
  seat: CongressSeat,
  notice: OfficeContinuityNoticeInput,
): { world: World; ruling: OfficeContinuityRuling } {
  const title = congressSeatTitle(seat);
  const stableKey = `${OFFICE_CONTINUITY_VERSION}:vacancy:${seat.seatKey}:${notice.effectiveDate}`;
  const chamberId = livingWorldOrganizationId(
    world,
    LIVING_WORLD_KEYS.chamber(seat.chamberKey),
  );
  const stateId = stateJurisdictionForKey(`US-${seat.stateUsps}`)!.id;
  let next = world;
  if (!next.history.events.some((event) => event.stableKey === stableKey))
    next = recordWorldEvent(next, {
      stableKey,
      type: SEAT_VACANCY_EVENT,
      occurredAt: notice.effectiveDate,
      recordedAt: next.currentDate,
      jurisdictionId: stateId,
      involvedEntityIds: [chamberId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        ...seatTags(seat, notice.effectiveDate),
        "vacancy-cause:member-died",
      ],
      summary: `The seat of the ${title} is vacant after the member's death.`,
      context: CONTEXT,
    });
  if (seat.chamberKey === "us-senate")
    return {
      world: next,
      ruling: {
        officeKey: seat.seatKey,
        title,
        outcome: "blocked",
        // PLACEHOLDER: the Seventeenth Amendment lets a state's legislature
        // allow its governor to appoint a temporary senator. That rule is not
        // compiled per state, so no one is appointed. The sentence is printed
        // to players and says only what happened.
        sentence:
          "The seat is vacant, and no temporary senator has been appointed.",
      },
    };
  const window = seatTermWindow(seat, notice.effectiveDate);
  const electionDay = addDays(
    next.currentDate > notice.effectiveDate
      ? next.currentDate
      : notice.effectiveDate,
    HOUSE_SPECIAL_ELECTION_PROFILE.daysFromVacancyToElection,
  );
  const regular = congressionalElectionDay(
    Number(window.endExclusive.slice(0, 4)) - 1,
  );
  if (electionDay >= regular)
    return {
      world: next,
      ruling: {
        officeKey: seat.seatKey,
        title,
        outcome: "vacant",
        // A vacancy after the regular election has already been held waits
        // for the new term rather than for an election in the past.
        sentence:
          regular > next.currentDate
            ? `The seat is vacant until the regular election on ${formatStatutoryDate(regular)}.`
            : `The seat stays vacant until the new term begins on ${formatStatutoryDate(window.endExclusive)}.`,
      },
    };
  const dueKey = specialElectionKey(seat, notice.effectiveDate);
  if (!next.history.futureDueItems.some((due) => due.stableKey === dueKey))
    next = scheduleFutureDueItem(next, {
      stableKey: dueKey,
      dueAt: electionDay,
      transitionKey: HOUSE_SPECIAL_ELECTION,
      entityIds: [chamberId],
      jurisdictionId: stateId,
      provenance: {
        kind: "authored",
        note: `${HOUSE_SPECIAL_ELECTION_PROFILE.id}: the state's governor calls a special election (U.S. Const. art. I, § 2, cl. 4); the ${HOUSE_SPECIAL_ELECTION_PROFILE.daysFromVacancyToElection}-day interval is a game profile.`,
      },
    });
  return {
    world: next,
    ruling: {
      officeKey: seat.seatKey,
      title,
      outcome: "special-election",
      // The interval to the special election is a game profile, not the
      // state's law (see HOUSE_SPECIAL_ELECTION_PROFILE).
      sentence: `The seat is vacant. The governor has called a special election for ${formatStatutoryDate(electionDay)}.`,
    },
  };
}

/** Special election day: choose the member who serves out the term. */
export function houseSpecialElectionHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const done = (
    next: World,
    context: string,
    outcomeEventId: EntityId | null,
  ): FutureTransitionHandlerResult => ({
    world: next,
    status: "resolved",
    reasonKey: null,
    context,
    outcomeEventId,
  });
  const match = /:special:(.+):(\d{4}-\d{2}-\d{2})$/.exec(due.stableKey);
  const seat = match
    ? congressSeats().find((candidate) => candidate.seatKey === match[1])
    : undefined;
  if (!seat || !match) return done(world, "No seat matches.", null);
  const vacancyDate = makeIsoDate(match[2]!);
  const latest = latestSeatRecord(world, seat.seatKey);
  if (latest?.type !== SEAT_VACANCY_EVENT || latest.occurredAt !== vacancyDate)
    return done(world, "The seat was already filled.", null);
  const window = seatTermWindow(seat, world.currentDate);
  if (world.currentDate >= window.endExclusive)
    return done(world, "The term ended before the special election.", null);
  const rng = new SeededRng(world.seed).fork(due.stableKey);
  const majors: string[] = LIVING_WORLD_SCENARIO_PROFILE.majorParties.map(
    (party) => party.key,
  );
  const previous = world.history.events
    .filter(
      (event) =>
        event.type === SEAT_TENURE_EVENT &&
        tagValue(event, "seat:") === seat.seatKey &&
        event.occurredAt <= vacancyDate,
    )
    .at(-1);
  const priorParty = previous ? tagValue(previous, SEAT_PARTY_TAG) : null;
  const party =
    priorParty && majors.includes(priorParty)
      ? rng.integer(0, 1000) < HOUSE_SPECIAL_ELECTION_PROFILE.samePartyPermille
        ? priorParty
        : majors.find((key) => key !== priorParty)!
      : rng.pick(majors);
  const memberKey = `${due.stableKey}:member`;
  const age = rng.integer(MINIMUM_AGE[seat.chamberKey] + 3, 70);
  const year = Number(world.currentDate.slice(0, 4));
  let next = createCharacterHistoryContextPeople(world, [
    {
      stableKey: memberKey,
      ...drawCanonicalName(rng.fork("name")),
      identity: generatePersonIdentity(rng.fork("identity")),
      birthDate: makeIsoDate(
        `${year - age}-${String(rng.integer(1, 13)).padStart(2, "0")}-${String(rng.integer(1, 29)).padStart(2, "0")}`,
      ),
      homeJurisdictionId: stateJurisdictionForKey(`US-${seat.stateUsps}`)!.id,
    },
  ]);
  const winner = characterHistoryContextPersonId(next, memberKey);
  const title = congressSeatTitle(seat);
  const chamberId = livingWorldOrganizationId(
    next,
    LIVING_WORLD_KEYS.chamber(seat.chamberKey),
  );
  next = recordWorldEvent(next, {
    stableKey: `${due.stableKey}:term`,
    type: SEAT_TENURE_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: stateJurisdictionForKey(`US-${seat.stateUsps}`)!.id,
    involvedEntityIds: [winner, chamberId],
    participants: [{ personId: winner, role: "focus:subject", detail: title }],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      ...seatTags(seat, next.currentDate),
      `service-since:${next.currentDate}`,
      `${SEAT_PARTY_TAG}${party}`,
      `${SEAT_CAUCUS_TAG}${party}`,
      `provenance:${HOUSE_SPECIAL_ELECTION_PROFILE.id}`,
      `provenance:${CONGRESS_TURNOVER_PROFILE.id}`,
    ],
    summary: `${personName(next.people[winner]!)} won the special election and serves the rest of the term as ${title}.`,
    context: CONTEXT,
  });
  return done(
    next,
    "The special election filled the seat.",
    next.history.events.at(-1)!.id,
  );
}

function presidentialRuling(
  world: World,
  notice: OfficeContinuityNoticeInput,
  office: OfficeContinuityNoticeInput["offices"][number],
): { world: World; ruling: OfficeContinuityRuling } {
  const base = { officeKey: office.officeKey, title: office.title };
  if (notice.kind === "incapacity-ended")
    return {
      world,
      ruling: {
        ...base,
        outcome: "no-change",
        sentence: "No powers were transferred, so there is nothing to return.",
      },
    };
  if (notice.kind === "incapacity-began")
    return {
      world,
      ruling: {
        ...base,
        outcome: "not-automatic",
        sentence:
          "Illness alone transfers nothing. Under the Twenty-Fifth Amendment the President may declare an inability (§ 3), or the Vice President and a majority of the Cabinet may (§ 4); neither declaration is recorded.",
      },
    };
  const plan = nationalRecords(world).find(
    (record) =>
      record.kind === "term-plan" &&
      record.id === office.termEvidenceId &&
      record.office === "president",
  );
  if (!plan || plan.kind !== "term-plan")
    return {
      world,
      ruling: {
        ...base,
        outcome: "blocked",
        sentence:
          "The Vice President becomes President under the Twenty-Fifth Amendment, but this world's opening records name no Vice President, so the presidency stays unfilled.",
      },
    };
  const vice = nationalOfficeHolder(world, "vice-president");
  if (!vice || vice.plan.electionId !== plan.electionId)
    return {
      world,
      ruling: {
        ...base,
        outcome: "blocked",
        sentence:
          "There is no sitting Vice President. The Speaker of the House is next under 3 U.S.C. § 19, but that line of succession is not modeled, so the presidency stays unfilled.",
      },
    };
  const death = world.history.personDeaths.find(
    (row) => row.id === notice.sourceRecordId,
  );
  if (!death)
    return {
      world,
      ruling: {
        ...base,
        outcome: "blocked",
        sentence: "The death this notice reports is not in the record.",
      },
    };
  const effectiveAt =
    death.diedAt === world.currentDate
      ? world.currentMoment
      : simulationMomentOnLocalDate(world.currentMoment, death.diedAt);
  const next = appendNationalRecord(world, {
    kind: "succession",
    stableKey: `${OFFICE_CONTINUITY_VERSION}:succession:${plan.id}`,
    electionId: plan.electionId,
    vacatedPlanId: plan.id,
    successorPlanId: vice.plan.id,
    personId: vice.plan.personId,
    deathRecordId: death.id,
    effectiveAt:
      compareSimulationMoments(effectiveAt, world.currentMoment) > 0
        ? world.currentMoment
        : effectiveAt,
    basis: "us-const-amend-xxv-s1",
    provenance: {
      method: "simulated",
      sourceEntityIds: [plan.id, vice.plan.id],
      note: "U.S. Const. amend. XXV, § 1, applied to a recorded death.",
    },
  });
  return {
    world: next,
    ruling: {
      ...base,
      outcome: "succeeded",
      // PLACEHOLDER: filling the vice presidency (a nominee confirmed by both
      // houses) is not modeled, so the office stays vacant.
      sentence: `${personName(world.people[vice.plan.personId]!)} became President under the Twenty-Fifth Amendment. The vice presidency is vacant.`,
    },
  };
}

function governorOffice(officeKey: string) {
  return US_STATE_USPS.map((usps) => stateExecutiveOffice(usps)).find(
    (office) => office?.officeKey === officeKey,
  );
}

function rulingFor(
  world: World,
  notice: OfficeContinuityNoticeInput,
  office: OfficeContinuityNoticeInput["offices"][number],
): { world: World; ruling: OfficeContinuityRuling } {
  const base = { officeKey: office.officeKey, title: office.title };
  if (office.officeKey === "us-president")
    return presidentialRuling(world, notice, office);
  if (notice.kind !== "death")
    return {
      world,
      ruling: {
        ...base,
        outcome: "no-change",
        sentence:
          "Illness does not remove anyone from this office; it stays with its holder.",
      },
    };
  if (office.officeKey === "us-vice-president")
    return {
      world,
      ruling: {
        ...base,
        outcome: "vacant",
        sentence:
          "The vice presidency is vacant. The Twenty-Fifth Amendment (§ 2) fills it by presidential nomination and confirmation by both houses, which is not modeled.",
      },
    };
  const seat = seatFor(office.officeKey);
  if (seat) return vacateSeat(world, seat, notice);
  const governorship = governorOffice(office.officeKey);
  if (governorship)
    return {
      world,
      ruling: {
        ...base,
        outcome: "blocked",
        // PLACEHOLDER: the state's constitution names the successor, and that
        // rule is not compiled, so no one takes office.
        sentence: `The office of ${governorship.displayName} is vacant, and no successor has taken office.`,
      },
    };
  return {
    world,
    ruling: {
      ...base,
      outcome: "blocked",
      sentence:
        "How this office is filled is not compiled, so it stays unfilled.",
    },
  };
}

/**
 * Applies each notice once. Safe to call from a UI read and a due runner:
 * a notice already consumed at this version writes nothing.
 */
export function applyOfficeContinuityNotices(
  world: World,
  notices: readonly OfficeContinuityNoticeInput[],
): World {
  let next = world;
  for (const notice of [...notices].sort((a, b) => a.sequence - b.sequence)) {
    const stableKey = consumedKey(notice);
    if (next.history.events.some((event) => event.stableKey === stableKey))
      continue;
    if (!notice.offices.length) continue;
    const rulings: OfficeContinuityRuling[] = [];
    for (const office of notice.offices) {
      const applied = rulingFor(next, notice, office);
      next = applied.world;
      rulings.push(applied.ruling);
    }
    const person = next.people[notice.personId];
    next = recordWorldEvent(next, {
      stableKey,
      type: OFFICE_CONTINUITY_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [
        ...new Set([
          notice.personId,
          ...notice.offices.flatMap((office) =>
            office.organizationId ? [office.organizationId] : [],
          ),
        ]),
      ].sort(),
      participants: [],
      personFactConstraints: [],
      visibility: notice.visibility,
      tags: [
        OFFICE_CONTINUITY_VERSION,
        `continuity-change:${notice.kind}`,
        `crisis-notice:${notice.noticeKey}`,
        `crisis-origin:${notice.originEventId}`,
        ...rulings.flatMap((ruling) => [
          `office:${ruling.officeKey}`,
          `outcome:${ruling.officeKey}:${ruling.outcome}`,
        ]),
      ],
      summary: rulings
        .map(
          (ruling) =>
            `${person ? `${personName(person)}, ${ruling.title}.` : `${ruling.title}.`} ${ruling.sentence}`,
        )
        .join(" "),
      context: CONTEXT,
    });
  }
  return next;
}

/** What the record says followed for one office, newest first. */
export function officeContinuityRulings(
  world: World,
  officeKey?: string,
): readonly {
  readonly eventId: EntityId;
  readonly date: IsoDate;
  readonly personId: EntityId | null;
  readonly officeKey: string;
  readonly outcome: OfficeContinuityOutcome;
}[] {
  return world.history.events
    .filter((event) => event.type === OFFICE_CONTINUITY_EVENT)
    .flatMap((event) =>
      event.tags
        .filter((tag) => tag.startsWith("outcome:"))
        .map((tag) => {
          const body = tag.slice("outcome:".length);
          const cut = body.lastIndexOf(":");
          return {
            eventId: event.id,
            date: event.occurredAt,
            personId:
              event.involvedEntityIds.find((id) => world.people[id]) ?? null,
            officeKey: body.slice(0, cut),
            outcome: body.slice(cut + 1) as OfficeContinuityOutcome,
          };
        }),
    )
    .filter((row) => !officeKey || row.officeKey === officeKey)
    .reverse();
}

export const OFFICE_CONTINUITY_HANDLERS = [
  [HOUSE_SPECIAL_ELECTION, houseSpecialElectionHandler],
] as const;
