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
import { stateJurisdictionForKey } from "../life-places";
import { LIVING_WORLD_SCENARIO_PROFILE } from "../living-world/contract";
import {
  MINIMUM_AGE,
  congressSeats,
  seatTermWindow,
} from "../living-world/congress-seats";
import type { CongressSeat } from "../living-world/congress-seats";
import { projectCongress } from "../living-world/congress";
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
import { currentPresidentOf } from "../crisis/offices";
import {
  FEDERAL_TENURE_EVENT,
  FEDERAL_VACANCY_EVENT,
  currentFederalTenure,
  federalTenureEnd,
  latestFederalOfficeRecord,
} from "../federal-tenures";
import { nationalOfficeHolder } from "../national-election-consumer";
import { appendNationalRecord, nationalRecords } from "../national-elections";
import { drawCanonicalNamedIdentity, personName } from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng } from "../rng";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import { seatGovernorSuccessor } from "../nationwide-world/governor-succession";
import {
  currentStateExecutiveHolders,
  stateExecutiveOffice,
} from "../nationwide-world/state-executives";
import {
  CHIEF_JUSTICE_CONFIRMATION,
  CHIEF_JUSTICE_NOMINATION,
  CHIEF_JUSTICESHIP_VACANT_SENTENCE,
  chiefJusticeNominationHandler,
  confirmChiefJustice,
  openChiefJusticeVacancy,
} from "./chief-justice-vacancy";
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
 * Representative's seat is vacant until a special election; the President
 * nominates a new Vice President or Chief Justice). Where the route is law
 * but its pace or choices are not compiled, a marked placeholder fills the
 * gap (a governor's successor, the nominee and the confirmation). Where it
 * does not know the route at all (Senate appointments, the statutory line of
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

interface SeatVacancyCause {
  readonly effectiveDate: IsoDate;
  /** A tag value: `member-died`, `member-became-vice-president`. */
  readonly key: string;
  /** Finishes "The seat of the … is vacant …". */
  readonly clause: string;
}

const MEMBER_DIED = (effectiveDate: IsoDate): SeatVacancyCause => ({
  effectiveDate,
  key: "member-died",
  clause: "after the member's death",
});

/** A member's seat becomes vacant from the day they leave it. */
function vacateSeat(
  world: World,
  seat: CongressSeat,
  notice: SeatVacancyCause,
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
        `vacancy-cause:${notice.key}`,
      ],
      summary: `The seat of the ${title} is vacant ${notice.clause}.`,
      context: CONTEXT,
    });
  if (seat.chamberKey === "us-senate")
    return {
      world: next,
      ruling: {
        officeKey: seat.seatKey,
        title,
        outcome: "blocked",
        sentence: `The seat is vacant. The Seventeenth Amendment lets ${seat.stateUsps}'s legislature allow its governor to appoint a temporary senator, but the game has not compiled ${seat.stateUsps}'s rule, so no one is appointed.`,
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
        sentence: `The seat is vacant until the regular election on ${regular} fills it for the next term.`,
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
      sentence: `The seat is vacant. ${seat.stateUsps}'s governor calls a special election, held on ${electionDay} in this game.`,
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
      ...drawCanonicalNamedIdentity(
        rng.fork("name"),
        generatePersonIdentity(rng.fork("identity")),
      ),
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
  const noVicePresident = {
    world,
    ruling: {
      ...base,
      outcome: "blocked" as const,
      sentence:
        "There is no sitting Vice President. The Speaker of the House is next under 3 U.S.C. § 19, but that line of succession is not modeled, so the presidency stays unfilled.",
    },
  };
  if (!plan || plan.kind !== "term-plan") {
    // A President seated by tenure record: the opening's, or one who came to
    // the office by succession. The Vice President by tenure record succeeds.
    const vacated = latestFederalOfficeRecord(world, "us-president");
    const vice = currentFederalTenure(world, "us-vice-president");
    const termEnd = vacated ? federalTenureEnd("us-president", vacated) : null;
    if (!vice || !termEnd) return noVicePresident;
    return tenureSuccession(world, notice, base, vice.personId, termEnd);
  }
  const vice = nationalOfficeHolder(world, "vice-president");
  if (!vice || vice.plan.electionId !== plan.electionId) {
    // A Vice President confirmed under § 2 holds by tenure record.
    const confirmed = currentFederalTenure(world, "us-vice-president");
    if (!confirmed) return noVicePresident;
    return tenureSuccession(
      world,
      notice,
      base,
      confirmed.personId,
      plan.endsAt.date,
    );
  }
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
    world: openVicePresidentialVacancy(next, {
      vacancyDate: death.diedAt,
      formerHolderId: vice.plan.personId,
      presidentId: vice.plan.personId,
      cause: "became-president",
    }),
    ruling: {
      ...base,
      outcome: "succeeded",
      sentence: `${personName(world.people[vice.plan.personId]!)} became President under the Twenty-Fifth Amendment. ${VICE_PRESIDENCY_VACANT_SENTENCE}`,
    },
  };
}

/**
 * § 1 for a presidency held by tenure record: the Vice President becomes
 * President for the rest of the term, and the vice presidency falls vacant.
 */
function tenureSuccession(
  world: World,
  notice: OfficeContinuityNoticeInput,
  base: { readonly officeKey: string; readonly title: string },
  vicePersonId: EntityId,
  termEnd: IsoDate,
): { world: World; ruling: OfficeContinuityRuling } {
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
  const successor = world.people[vicePersonId]!;
  const former = world.people[death.personId];
  const stableKey = `${OFFICE_CONTINUITY_VERSION}:president-by-succession:${death.id}`;
  let next = world;
  if (!next.history.events.some((event) => event.stableKey === stableKey))
    next = recordWorldEvent(next, {
      stableKey,
      type: FEDERAL_TENURE_EVENT,
      occurredAt: death.diedAt,
      recordedAt: next.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [vicePersonId],
      participants: [
        {
          personId: vicePersonId,
          role: "focus:subject",
          detail: "President of the United States",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        OFFICE_CONTINUITY_VERSION,
        "office:us-president",
        `term-end:${termEnd}`,
        "basis:us-const-amend-xxv-s1",
      ],
      summary: `${personName(successor)} became President of the United States${former ? ` on the death of ${personName(former)}` : ""}, and serves the rest of the term.`,
      context: CONTEXT,
    });
  next = openVicePresidentialVacancy(next, {
    vacancyDate: death.diedAt,
    formerHolderId: vicePersonId,
    presidentId: vicePersonId,
    cause: "became-president",
  });
  return {
    world: next,
    ruling: {
      ...base,
      outcome: "succeeded",
      sentence: `${personName(successor)} became President under the Twenty-Fifth Amendment. ${VICE_PRESIDENCY_VACANT_SENTENCE}`,
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
  if (office.officeKey === "us-vice-president") {
    const president = currentPresidentOf(world);
    return {
      world: openVicePresidentialVacancy(world, {
        vacancyDate: notice.effectiveDate,
        formerHolderId: notice.personId,
        presidentId: president?.personId ?? null,
        cause: "vice-president-died",
      }),
      ruling: {
        ...base,
        outcome: "vacant",
        sentence: president
          ? VICE_PRESIDENCY_VACANT_SENTENCE
          : "The vice presidency is vacant, and with no sitting President there is nobody to nominate a successor.",
      },
    };
  }
  if (office.officeKey === "us-chief-justice") {
    const opened = openChiefJusticeVacancy(world, {
      vacancyDate: notice.effectiveDate,
      formerHolderId: notice.personId,
    });
    return {
      world: opened.world,
      ruling: {
        ...base,
        outcome: "vacant",
        sentence: opened.presidentId
          ? CHIEF_JUSTICESHIP_VACANT_SENTENCE
          : "The office of Chief Justice is vacant, and with no sitting President there is nobody to nominate a successor.",
      },
    };
  }
  const seat = seatFor(office.officeKey);
  if (seat) return vacateSeat(world, seat, MEMBER_DIED(notice.effectiveDate));
  const governorship = governorOffice(office.officeKey);
  if (governorship) {
    // PLACEHOLDER (governor-succession.ts): the next officer in line serves
    // the rest of the term.
    const seated = seatGovernorSuccessor(world, governorship, {
      vacancyDate: notice.effectiveDate,
      formerHolderId: notice.personId,
      formerTermEvidenceId: office.termEvidenceId,
    });
    const successor = seated.successorId
      ? seated.world.people[seated.successorId]
      : undefined;
    return successor
      ? {
          world: seated.world,
          ruling: {
            ...base,
            outcome: "succeeded",
            sentence: `${personName(successor)} succeeded to the office of ${governorship.displayName} and serves the rest of the term.`,
          },
        }
      : {
          world,
          ruling: {
            ...base,
            outcome: "blocked",
            sentence: `${governorship.displayName} is vacant, and no record of the office exists to seat a successor in.`,
          },
        };
  }
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
 * THE VICE PRESIDENCY FALLS VACANT — Twenty-Fifth Amendment, § 2: "Whenever
 * there is a vacancy in the office of the Vice President, the President shall
 * nominate a Vice President who shall take office upon confirmation by a
 * majority vote of both Houses of Congress."
 *
 * The route is law; its pace and its choices are not, and each is marked:
 *
 * PLACEHOLDER (filed as `vice-presidential-vacancy-nomination-and-confirmation`):
 * - how long a President takes to name a nominee, and how long Congress takes
 *   to confirm one. The two times it has happened took 57 days (1973) and
 *   121 days (1974) from nomination to confirmation; the profile below sits
 *   between them and is not a finding.
 * - whom a President nominates. The amendment lets the President name anyone
 *   eligible to be Vice President; the game has no rule for whom a President
 *   would choose. Blanket rule meanwhile: an even draw among every living
 *   person in the World old enough for the office (35), other than the
 *   President, the player's own character, who would have to be asked, and
 *   sitting governors. Citizenship and fourteen years' residence are not recorded on a person,
 *   so they are not checked. A nominee who sat in Congress leaves the seat,
 *   which is then filled the way any vacated seat is.
 * - how Congress votes. The amendment requires a majority of both houses.
 *   Blanket rule meanwhile: both houses confirm, as they did both times.
 */
export const VICE_PRESIDENT_NOMINATION =
  "governing:vice-president-nomination" as const;
export const VICE_PRESIDENT_CONFIRMATION =
  "governing:vice-president-confirmation" as const;
export const VICE_PRESIDENT_NOMINATED_EVENT =
  "governing.vice-president-nominated" as const;

export const VICE_PRESIDENTIAL_VACANCY_PROFILE = {
  id: "ocd-vice-presidential-vacancy-game-profile/v1",
  daysFromVacancyToNomination: 10,
  daysFromNominationToConfirmation: 75,
} as const;

/** U.S. Const. art. II, § 1, cl. 5, read with amend. XII. */
const VICE_PRESIDENT_MINIMUM_AGE = 35;

const VICE_PRESIDENCY_VACANT_SENTENCE =
  "The vice presidency is vacant until the President's nominee is confirmed by both houses of Congress.";

type VicePresidentialVacancyCause = "vice-president-died" | "became-president";

function vicePresidencyHeld(world: World): boolean {
  return (
    nationalOfficeHolder(world, "vice-president") !== null ||
    currentFederalTenure(world, "us-vice-president") !== null
  );
}

/** When the sitting President's term ends, by either record. */
function presidentialTermEnd(world: World): IsoDate | null {
  const elected = nationalOfficeHolder(world, "president");
  if (elected) return elected.plan.endsAt.date;
  return currentFederalTenure(world, "us-president")?.endExclusive ?? null;
}

function nominationKey(vacancyDate: IsoDate, after: IsoDate): string {
  return `${OFFICE_CONTINUITY_VERSION}:vp-nomination:${vacancyDate}:${after}`;
}

function scheduleNomination(
  world: World,
  vacancyDate: IsoDate,
  presidentId: EntityId,
): World {
  const stableKey = nominationKey(vacancyDate, world.currentDate);
  if (world.history.futureDueItems.some((due) => due.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt: addDays(
      world.currentDate,
      VICE_PRESIDENTIAL_VACANCY_PROFILE.daysFromVacancyToNomination,
    ),
    transitionKey: VICE_PRESIDENT_NOMINATION,
    entityIds: [presidentId],
    jurisdictionId: null,
    provenance: {
      kind: "authored",
      note: `${VICE_PRESIDENTIAL_VACANCY_PROFILE.id}: the President nominates a Vice President (U.S. Const. amend. XXV, § 2); the ${VICE_PRESIDENTIAL_VACANCY_PROFILE.daysFromVacancyToNomination}-day interval is a game profile.`,
    },
  });
}

/**
 * Records that the vice presidency is vacant and puts the President's
 * nomination on the calendar. Once per vacancy.
 */
function openVicePresidentialVacancy(
  world: World,
  input: {
    readonly vacancyDate: IsoDate;
    readonly formerHolderId: EntityId;
    readonly presidentId: EntityId | null;
    readonly cause: VicePresidentialVacancyCause;
  },
): World {
  const stableKey = `${OFFICE_CONTINUITY_VERSION}:vp-vacancy:${input.vacancyDate}`;
  if (world.history.events.some((event) => event.stableKey === stableKey))
    return world;
  const former = world.people[input.formerHolderId];
  let next = recordWorldEvent(world, {
    stableKey,
    type: FEDERAL_VACANCY_EVENT,
    occurredAt: input.vacancyDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [input.formerHolderId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      OFFICE_CONTINUITY_VERSION,
      "office:us-vice-president",
      `vacancy-cause:${input.cause}`,
    ],
    summary:
      input.cause === "became-president"
        ? `The vice presidency is vacant: ${former ? personName(former) : "the Vice President"} became President.`
        : `The vice presidency is vacant after the death of ${former ? personName(former) : "the Vice President"}.`,
    context: CONTEXT,
  });
  if (input.presidentId)
    next = scheduleNomination(next, input.vacancyDate, input.presidentId);
  return next;
}

function resolved(
  world: World,
  context: string,
  outcomeEventId: EntityId | null = null,
): FutureTransitionHandlerResult {
  return {
    world,
    status: "resolved",
    reasonKey: null,
    context,
    outcomeEventId,
  };
}

function ageOn(birthDate: IsoDate, date: IsoDate): number {
  const years = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return date.slice(5) < birthDate.slice(5) ? years - 1 : years;
}

/** The President names a nominee. */
export function vicePresidentNominationHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const match = /:vp-nomination:(\d{4}-\d{2}-\d{2}):/.exec(due.stableKey);
  if (!match) return resolved(world, "No vacancy matches this nomination.");
  const vacancyDate = makeIsoDate(match[1]!);
  if (vicePresidencyHeld(world))
    return resolved(world, "The vice presidency is already filled.");
  const president = currentPresidentOf(world);
  if (!president)
    return resolved(
      world,
      "There is no sitting President to nominate a Vice President.",
    );
  // PLACEHOLDER: whom the President chooses (see the profile above).
  const controlled =
    world.control.kind === "person" ? world.control.personId : null;
  const dead = new Set(world.history.personDeaths.map((row) => row.personId));
  // A sitting governor is not drawn: the game has no route for them to give
  // up the governorship.
  const governors = new Set(
    currentStateExecutiveHolders(world).map((holder) => holder.personId),
  );
  const pool = Object.values(world.people)
    .filter(
      (person) =>
        person.id !== president.personId &&
        person.id !== controlled &&
        !governors.has(person.id) &&
        !dead.has(person.id) &&
        ageOn(person.birthDate, world.currentDate) >=
          VICE_PRESIDENT_MINIMUM_AGE,
    )
    .map((person) => person.id)
    .sort();
  if (!pool.length)
    return resolved(world, "Nobody in the World is eligible to be nominated.");
  const nomineeId = new SeededRng(world.seed).fork(due.stableKey).pick(pool);
  const nominee = { personId: nomineeId };
  const presidentName = personName(world.people[president.personId]!);
  const nomineeName = personName(world.people[nominee.personId]!);
  let next = recordWorldEvent(world, {
    stableKey: `${due.stableKey}:nominated`,
    type: VICE_PRESIDENT_NOMINATED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [president.personId, nominee.personId],
    participants: [
      {
        personId: president.personId,
        role: "focus:actor",
        detail: "President",
      },
      {
        personId: nominee.personId,
        role: "focus:subject",
        detail: "Nominee for Vice President",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      OFFICE_CONTINUITY_VERSION,
      "office:us-vice-president",
      `vacancy:${vacancyDate}`,
      `provenance:${VICE_PRESIDENTIAL_VACANCY_PROFILE.id}`,
    ],
    summary: `President ${presidentName} nominated ${nomineeName} to be Vice President. Both houses of Congress must confirm the nomination.`,
    context: CONTEXT,
  });
  const nominatedEventId = next.history.events.at(-1)!.id;
  next = scheduleFutureDueItem(next, {
    stableKey: `${OFFICE_CONTINUITY_VERSION}:vp-confirmation:${vacancyDate}:${nominee.personId}`,
    dueAt: addDays(
      next.currentDate,
      VICE_PRESIDENTIAL_VACANCY_PROFILE.daysFromNominationToConfirmation,
    ),
    transitionKey: VICE_PRESIDENT_CONFIRMATION,
    entityIds: [nominee.personId],
    jurisdictionId: null,
    provenance: {
      kind: "authored",
      note: `${VICE_PRESIDENTIAL_VACANCY_PROFILE.id}: both houses vote on the nomination (U.S. Const. amend. XXV, § 2); the ${VICE_PRESIDENTIAL_VACANCY_PROFILE.daysFromNominationToConfirmation}-day interval and the confirmation are a game profile.`,
    },
  });
  return resolved(next, `${nomineeName} was nominated.`, nominatedEventId);
}

/** The seat in Congress a person holds today, if any. */
function congressSeatHeldBy(
  world: World,
  personId: EntityId,
): CongressSeat | undefined {
  const congress = projectCongress(world);
  const held = [
    ...(congress?.house.seats ?? []),
    ...(congress?.senate.seats ?? []),
  ].find(
    (seat) =>
      seat.occupant.kind === "member" &&
      seat.occupant.member.personId === personId,
  );
  return held
    ? congressSeats().find((candidate) => candidate.seatKey === held.seatKey)
    : undefined;
}

/** The Senate confirms a Chief Justice, who leaves any seat in Congress. */
export function chiefJusticeConfirmationHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  return confirmChiefJustice(world, due, (next, personId) => {
    const seat = congressSeatHeldBy(next, personId);
    return seat
      ? vacateSeat(next, seat, {
          effectiveDate: next.currentDate,
          key: "member-became-chief-justice",
          clause: "after the member became Chief Justice",
        }).world
      : next;
  });
}

/** Both houses confirm; the nominee takes office for the rest of the term. */
export function vicePresidentConfirmationHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const match = /:vp-confirmation:(\d{4}-\d{2}-\d{2}):(.+)$/.exec(
    due.stableKey,
  );
  if (!match) return resolved(world, "No nomination matches.");
  const vacancyDate = makeIsoDate(match[1]!);
  const nomineeId = match[2]! as EntityId;
  if (vicePresidencyHeld(world))
    return resolved(world, "The vice presidency is already filled.");
  const termEnd = presidentialTermEnd(world);
  if (!termEnd || world.currentDate >= termEnd)
    return resolved(world, "The term ended before the vote.");
  const nominee = world.people[nomineeId];
  const dead = world.history.personDeaths.some(
    (death) =>
      death.personId === nomineeId && death.diedAt <= world.currentDate,
  );
  if (!nominee || dead) {
    const president = currentPresidentOf(world);
    return resolved(
      president
        ? scheduleNomination(world, vacancyDate, president.personId)
        : world,
      "The nominee died before the vote; the President nominates again.",
    );
  }
  // The seat in Congress the nominee leaves, if any, read before they take
  // the new office.
  const heldSeat = congressSeatHeldBy(world, nomineeId);
  let next = recordWorldEvent(world, {
    stableKey: `${due.stableKey}:confirmed`,
    type: FEDERAL_TENURE_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [nomineeId],
    participants: [
      {
        personId: nomineeId,
        role: "focus:subject",
        detail: "Vice President of the United States",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      OFFICE_CONTINUITY_VERSION,
      "office:us-vice-president",
      `term-end:${termEnd}`,
      "basis:us-const-amend-xxv-s2",
      `vacancy:${vacancyDate}`,
      `provenance:${VICE_PRESIDENTIAL_VACANCY_PROFILE.id}`,
    ],
    summary: `Both houses of Congress confirmed ${personName(nominee)} as Vice President of the United States, to serve the rest of the term.`,
    context: CONTEXT,
  });
  const confirmedEventId = next.history.events.at(-1)!.id;
  if (heldSeat)
    next = vacateSeat(next, heldSeat, {
      effectiveDate: next.currentDate,
      key: "member-became-vice-president",
      clause: "after the member became Vice President",
    }).world;
  return resolved(
    next,
    `${personName(nominee)} was confirmed as Vice President.`,
    confirmedEventId,
  );
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
      summary: `${person ? personName(person) : "An officeholder"}: ${rulings
        .map((ruling) => `${ruling.title}: ${ruling.sentence}`)
        .join(" ")}`,
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
  [VICE_PRESIDENT_NOMINATION, vicePresidentNominationHandler],
  [VICE_PRESIDENT_CONFIRMATION, vicePresidentConfirmationHandler],
  [CHIEF_JUSTICE_NOMINATION, chiefJusticeNominationHandler],
  [CHIEF_JUSTICE_CONFIRMATION, chiefJusticeConfirmationHandler],
] as const;
