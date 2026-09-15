import {
  applyCharacterHistoryPlan,
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import type {
  CharacterHistoryContextPersonInput,
  CharacterHistoryTransition,
} from "../character-history";
import { addDays, makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import { stateJurisdictionForKey } from "../life-places";
import { US_STATE_NAMES } from "../nationwide-world/state-executive-candidacy-packs";
import { currentStateExecutiveHolders } from "../nationwide-world/state-executives";
import { drawCanonicalName, personName } from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng, pickDistinct } from "../rng";
import type { EntityId, IsoDate, LifeRecordProvenance, World } from "../types";
import { recordWorldEvent } from "../world";
import {
  LIVING_WORLD_CONTRACT_VERSION,
  LIVING_WORLD_SCENARIO_PROFILE as PROFILE,
} from "./contract";
import type { ChamberKey, MajorPartyKey } from "./contract";
import {
  CONGRESS_SEAT_SOURCES,
  MINIMUM_AGE,
  congressSeats,
  seatTermWindow,
} from "./congress-seats";
import type { CongressSeat, SeatTermWindow } from "./congress-seats";

export const LIVING_WORLD_WRITER_VERSION = "living-world-v1";
const V = LIVING_WORLD_WRITER_VERSION;

/** Present exactly once in a save whose public world W established. */
export const LIVING_WORLD_OPENING_KEY = `${V}:opening`;

export const LIVING_WORLD_KEYS = {
  chamber: (chamber: ChamberKey) => `${V}:chamber:${chamber}`,
  nationalParty: (party: MajorPartyKey) => `${V}:party:${party}`,
  caucus: (chamber: ChamberKey, party: MajorPartyKey) =>
    `${V}:caucus:${chamber}:${party}`,
  seat: (seatKey: string) => `${V}:seat:${seatKey}`,
  executiveAffiliation: (personId: EntityId) =>
    `${V}:affiliation:executive:${personId}`,
} as const;

export const CHAMBER_NAMES: Readonly<Record<ChamberKey, string>> = {
  "us-house": "United States House of Representatives",
  "us-senate": "United States Senate",
};

const CAUCUS_NAMES: Readonly<
  Record<ChamberKey, Readonly<Record<MajorPartyKey, string>>>
> = {
  "us-house": {
    democratic: "House Democratic Caucus",
    republican: "House Republican Conference",
  },
  "us-senate": {
    democratic: "Senate Democratic Caucus",
    republican: "Senate Republican Conference",
  },
};

/** Public identification with a party. Not registration, belief or a vote. */
export const PARTY_AFFILIATION_KIND = "affiliation:political-party" as const;
/** Membership in a chamber's party caucus. Separate from affiliation. */
export const CAUCUS_MEMBERSHIP_KIND = "membership:legislative-caucus" as const;
/** Seat-roll tag prefixes; a party or caucus key, or "none". */
export const SEAT_PARTY_TAG = "party:";
export const SEAT_CAUCUS_TAG = "caucus:";
export const SEAT_TENURE_EVENT = "world.legislative-seat-tenure" as const;
export const SEAT_VACANCY_EVENT = "world.legislative-seat-vacancy" as const;

export function livingWorldOrganizationId(
  world: World,
  stableKey: string,
): EntityId {
  return createStableId("organization", `${world.id}:${stableKey}`);
}

export function livingWorldEstablished(world: World): boolean {
  return world.history.events.some(
    (event) => event.stableKey === LIVING_WORLD_OPENING_KEY,
  );
}

const ORDINALS = ["th", "st", "nd", "rd"];
function ordinal(value: number): string {
  const tail = value % 100;
  return `${value}${tail >= 11 && tail <= 13 ? "th" : (ORDINALS[value % 10] ?? "th")}`;
}

export function congressSeatTitle(seat: CongressSeat): string {
  const state =
    US_STATE_NAMES[seat.stateUsps as keyof typeof US_STATE_NAMES] ??
    seat.stateUsps;
  if (seat.chamberKey === "us-senate") return `U.S. Senator from ${state}`;
  const district =
    seat.district === "00"
      ? "at-large congressional district"
      : `${ordinal(Number(seat.district))} congressional district`;
  return `U.S. Representative for ${state}'s ${district}`;
}

type SeatPlan =
  | {
      readonly kind: "vacancy";
      readonly seat: CongressSeat;
      readonly window: SeatTermWindow;
      readonly since: IsoDate;
    }
  | {
      readonly kind: "member";
      readonly seat: CongressSeat;
      readonly window: SeatTermWindow;
      readonly memberKey: string;
      readonly party: MajorPartyKey | null;
      readonly caucus: MajorPartyKey;
      readonly serviceSince: IsoDate;
      readonly birthDate: IsoDate;
    };

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Establishes a new save's public national world once: both chambers of
 * Congress with a persistent fictional member or an explicitly represented
 * vacancy in every voting seat, the two national parties and their chamber
 * caucuses as organizations, and public party affiliation for members and the
 * executives the opening already seated.
 *
 * Only a new life's opening calls this. An older save is never enriched here
 * and no read ever calls it, so an absent snapshot stays absent.
 */
export function ensureLivingWorldOpening(
  world: World,
  subjectPersonId: EntityId,
): World {
  if (livingWorldEstablished(world)) return world;
  if (!world.people[subjectPersonId]) {
    throw new Error("The living-world opening needs an existing subject.");
  }
  const date = world.currentDate;
  const rng = new SeededRng(world.seed).fork(LIVING_WORLD_OPENING_KEY);
  const plans: SeatPlan[] = [];
  const scenarioTags: string[] = [];

  for (const chamberKey of ["us-house", "us-senate"] as const) {
    const chamberRng = rng.fork(`chamber:${chamberKey}`);
    const seats = congressSeats().filter(
      (seat) => seat.chamberKey === chamberKey,
    );
    const [vacancyMin, vacancyMax] = PROFILE.vacancies[chamberKey];
    const [independentMin, independentMax] = PROFILE.independents[chamberKey];
    const vacant = new Set(
      pickDistinct(
        chamberRng.fork("vacancies"),
        seats,
        chamberRng.integer(vacancyMin, vacancyMax + 1),
      ).map((seat) => seat.seatKey),
    );
    const filled = seats.filter((seat) => !vacant.has(seat.seatKey));
    const independent = new Set(
      pickDistinct(
        chamberRng.fork("independents"),
        filled,
        chamberRng.integer(independentMin, independentMax + 1),
      ).map((seat) => seat.seatKey),
    );
    const affiliated = filled.filter((seat) => !independent.has(seat.seatKey));
    const permille = chamberRng.integer(
      PROFILE.firstPartySharePermille.min,
      PROFILE.firstPartySharePermille.max + 1,
    );
    const firstParty = new Set(
      pickDistinct(
        chamberRng.fork("first-party"),
        affiliated,
        Math.round((affiliated.length * permille) / 1000),
      ).map((seat) => seat.seatKey),
    );
    scenarioTags.push(
      `scenario:${chamberKey}:first-party-permille:${permille}`,
    );

    for (const seat of seats) {
      const window = seatTermWindow(seat, date);
      const seatRng = rng.fork(`seat:${seat.seatKey}`);
      if (vacant.has(seat.seatKey)) {
        const [minDays, maxDays] = PROFILE.vacancyAgeDays;
        const drawn = addDays(date, -seatRng.integer(minDays, maxDays + 1));
        plans.push({
          kind: "vacancy",
          seat,
          window,
          since: drawn < window.startsAt ? window.startsAt : drawn,
        });
        continue;
      }
      const party = independent.has(seat.seatKey)
        ? null
        : firstParty.has(seat.seatKey)
          ? PROFILE.majorParties[0].key
          : PROFILE.majorParties[1].key;
      // An independent's caucus is a modeled circumstance of this save.
      const caucus =
        party ??
        seatRng.fork("caucus").pick(PROFILE.majorParties.map((p) => p.key));
      const minimumAge = MINIMUM_AGE[seat.chamberKey];
      const termStartYear = Number(window.startsAt.slice(0, 4));
      const ageAtTermStart = seatRng.integer(minimumAge + 7, 81);
      let priorTerms = seatRng.integer(
        0,
        PROFILE.priorTermsMax[seat.chamberKey] + 1,
      );
      while (
        priorTerms > 0 &&
        ageAtTermStart - priorTerms * window.years < minimumAge + 1
      )
        priorTerms -= 1;
      const birthDate = makeIsoDate(
        `${termStartYear - ageAtTermStart - 1}-${pad(seatRng.integer(1, 13))}-${pad(seatRng.integer(1, 29))}`,
      );
      plans.push({
        kind: "member",
        seat,
        window,
        memberKey: `${LIVING_WORLD_KEYS.seat(seat.seatKey)}:term:${window.startsAt}:member`,
        party,
        caucus,
        serviceSince: makeIsoDate(
          `${termStartYear - priorTerms * window.years}${window.startsAt.slice(4)}`,
        ),
        birthDate,
      });
    }
  }

  const executives = executiveHoldersNeedingAffiliation(world);
  const earliest = [
    date,
    ...plans.map((plan) =>
      plan.kind === "member" ? plan.serviceSince : plan.since,
    ),
    ...plans.map((plan) => plan.window.startsAt),
    ...executives.map((holder) => holder.startedAt),
  ].reduce((min, value) => (value < min ? value : min));

  let next = world;
  for (const stateUsps of new Set(plans.map((plan) => plan.seat.stateUsps))) {
    const jurisdiction = stateJurisdictionForKey(`US-${stateUsps}`);
    if (!jurisdiction) throw new Error(`No state jurisdiction: ${stateUsps}`);
    if (!next.jurisdictions[jurisdiction.id]) {
      next = {
        ...next,
        jurisdictions: {
          ...next.jurisdictions,
          [jurisdiction.id]: jurisdiction,
        },
        jurisdictionOrder: [...next.jurisdictionOrder, jurisdiction.id],
      };
    }
  }

  const generated: LifeRecordProvenance = {
    kind: "generated",
    generatorKey: V,
  };
  const setting: LifeRecordProvenance = {
    kind: "authored",
    note: `${PROFILE.id}: a real institution named as setting data for this fictional save. Its record date is the earliest date the save needs, not a historical founding date.`,
  };
  const transitions: CharacterHistoryTransition[] = [];
  const organization = (
    stableKey: string,
    name: string,
    classification: `${string}:${string}`,
  ) => {
    if (next.history.organizations.some((o) => o.stableKey === stableKey))
      return;
    transitions.push({
      kind: "organization",
      input: {
        stableKey,
        formedAt: earliest,
        detailLevel: "lightweight",
        provenance: setting,
        initialProfile: {
          name,
          classification: classification as `membership:${string}`,
          locationJurisdictionId: null,
        },
      },
    });
  };
  for (const chamberKey of ["us-house", "us-senate"] as const) {
    organization(
      LIVING_WORLD_KEYS.chamber(chamberKey),
      CHAMBER_NAMES[chamberKey],
      "sector:government",
    );
  }
  for (const party of PROFILE.majorParties) {
    organization(
      LIVING_WORLD_KEYS.nationalParty(party.key),
      party.name,
      "membership:political-party",
    );
    for (const chamberKey of ["us-house", "us-senate"] as const) {
      organization(
        LIVING_WORLD_KEYS.caucus(chamberKey, party.key),
        CAUCUS_NAMES[chamberKey][party.key],
        "membership:legislative-caucus",
      );
    }
  }

  const memberInputs: CharacterHistoryContextPersonInput[] = [];
  for (const plan of plans) {
    if (plan.kind !== "member") continue;
    const seatRng = rng.fork(`seat:${plan.seat.seatKey}`);
    memberInputs.push({
      stableKey: plan.memberKey,
      ...drawCanonicalName(seatRng.fork("name")),
      identity: generatePersonIdentity(seatRng.fork("identity")),
      birthDate: plan.birthDate,
      homeJurisdictionId: stateJurisdictionForKey(`US-${plan.seat.stateUsps}`)!
        .id,
    });
  }

  for (const holder of executives) {
    const party = rng
      .fork(`executive:${holder.personId}`)
      .pick(PROFILE.majorParties.map((p) => p.key));
    transitions.push({
      kind: "participation",
      input: {
        stableKey: LIVING_WORLD_KEYS.executiveAffiliation(holder.personId),
        personId: holder.personId,
        organizationId: livingWorldOrganizationId(
          next,
          LIVING_WORLD_KEYS.nationalParty(party),
        ),
        startedAt: holder.startedAt,
        initialStatus: "active",
        kind: PARTY_AFFILIATION_KIND,
        roleKind: "member:public-affiliation",
        context: "Public party affiliation",
        provenance: generated,
      },
    });
  }

  // 535 members through the batched context-person writer: the same records
  // as the single writer, validated once rather than once per person.
  next = createCharacterHistoryContextPeople(next, memberInputs);
  next = applyCharacterHistoryPlan(next, {
    stableKey: `${LIVING_WORLD_OPENING_KEY}:plan`,
    mode: "quick-generated",
    personId: subjectPersonId,
    transitions,
  }).world;

  for (const plan of plans) {
    const jurisdictionId = stateJurisdictionForKey(
      `US-${plan.seat.stateUsps}`,
    )!.id;
    const chamberId = livingWorldOrganizationId(
      next,
      LIVING_WORLD_KEYS.chamber(plan.seat.chamberKey),
    );
    const title = congressSeatTitle(plan.seat);
    const seatTags = [
      V,
      `office:${plan.seat.chamberKey}`,
      `seat:${plan.seat.seatKey}`,
      `state:${plan.seat.stateUsps}`,
      `term-start:${plan.window.startsAt}`,
      `term-end:${plan.window.endExclusive}`,
    ];
    const context = {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    };
    if (plan.kind === "vacancy") {
      next = recordWorldEvent(next, {
        stableKey: `${LIVING_WORLD_KEYS.seat(plan.seat.seatKey)}:vacancy:${plan.since}`,
        type: SEAT_VACANCY_EVENT,
        occurredAt: plan.since,
        recordedAt: date,
        jurisdictionId,
        involvedEntityIds: [chamberId],
        participants: [],
        personFactConstraints: [],
        visibility: "public",
        tags: [...seatTags, "provenance:fictional-initial-vacancy"],
        summary: `The seat of the ${title} is vacant.`,
        context,
      });
      continue;
    }
    const personId = characterHistoryContextPersonId(next, plan.memberKey);
    next = recordWorldEvent(next, {
      stableKey: `${LIVING_WORLD_KEYS.seat(plan.seat.seatKey)}:term:${plan.window.startsAt}`,
      type: SEAT_TENURE_EVENT,
      occurredAt: plan.window.startsAt,
      recordedAt: date,
      jurisdictionId,
      involvedEntityIds: [personId, chamberId],
      participants: [{ personId, role: "focus:subject", detail: title }],
      personFactConstraints: [],
      visibility: "public",
      // The public roll lists the member's party label and caucus as of this
      // seating. Later affiliation changes are participations, which win.
      tags: [
        ...seatTags,
        `service-since:${plan.serviceSince}`,
        `${SEAT_PARTY_TAG}${plan.party ?? "none"}`,
        `${SEAT_CAUCUS_TAG}${plan.caucus}`,
        "provenance:fictional-initial-tenure",
      ],
      summary: `${personName(next.people[personId]!)} serves as ${title} in this fictional world.`,
      context,
    });
  }

  return recordWorldEvent(next, {
    stableKey: LIVING_WORLD_OPENING_KEY,
    type: "setup.living-world-opening",
    occurredAt: date,
    recordedAt: date,
    jurisdictionId: null,
    involvedEntityIds: (["us-house", "us-senate"] as const).map((chamber) =>
      livingWorldOrganizationId(next, LIVING_WORLD_KEYS.chamber(chamber)),
    ),
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      V,
      PROFILE.id,
      `contract:${LIVING_WORLD_CONTRACT_VERSION}`,
      ...scenarioTags,
    ],
    summary: `This save's public world was established from ${PROFILE.id}. ${Object.values(CONGRESS_SEAT_SOURCES).length} institutional sources.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

interface ExecutiveHolder {
  readonly personId: EntityId;
  readonly startedAt: IsoDate;
}

/** The president and state executives the opening seated, without a party. */
function executiveHoldersNeedingAffiliation(
  world: World,
): readonly ExecutiveHolder[] {
  const holders: ExecutiveHolder[] = [];
  for (const event of world.history.events) {
    if (
      event.type !== "world.office-tenure" ||
      !event.tags.includes("office:us-president") ||
      event.occurredAt > world.currentDate
    )
      continue;
    const personId = event.participants.find(
      (p) => p.role === "focus:subject",
    )?.personId;
    if (personId && world.people[personId])
      holders.push({ personId, startedAt: event.occurredAt });
  }
  for (const holder of currentStateExecutiveHolders(world)) {
    holders.push({
      personId: holder.personId,
      startedAt: holder.startedAt ?? world.currentDate,
    });
  }
  return holders.filter(
    (holder, index) =>
      holders.findIndex((other) => other.personId === holder.personId) ===
        index &&
      !world.history.organizationParticipations.some(
        (participation) =>
          participation.stableKey ===
          LIVING_WORLD_KEYS.executiveAffiliation(holder.personId),
      ),
  );
}
