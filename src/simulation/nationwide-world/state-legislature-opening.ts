import {
  applyCharacterHistoryPlan,
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import type {
  CharacterHistoryContextPersonInput,
  CharacterHistoryTransition,
} from "../character-history";
import { candidacyPackById, stateCandidacyPack } from "../candidacy-packs";
import { legislativeTermForRelationship } from "../legislative-office-terms";
import type { CandidacyPack, ElectiveOfficeOption } from "../candidacy-packs";
import { addDays, makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { createStableId } from "../ids";
import { stateJurisdictionForKey } from "../life-places";
import {
  LIVING_WORLD_KEYS,
  PARTY_AFFILIATION_KIND,
  livingWorldOrganizationId,
} from "../living-world/opening";
import { congressSeats } from "../living-world/congress-seats";
import {
  drawCanonicalNameForGender,
  DISTINCT_GIVEN_NAME_GENERATION_VERSION,
} from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng } from "../rng";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  LifeRecordProvenance,
  OrganizationParticipation,
  WorkRelationship,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import {
  createOrganizationParticipations,
  createWorkRelationships,
  recordWorkStatus,
} from "../life";
import type {
  CreateOrganizationParticipationInput,
  CreateWorkRelationshipInput,
} from "../life";
import {
  activeOrganizationParticipationsAt,
  currentLifeCutoff,
  workRoleAt,
  workStatusAt,
} from "../life-queries";
import { isPersonAliveAt } from "../vitality-integrity";
import { politicalStartingConditions } from "../world-setup/conditions";
import { US_STATE_USPS } from "./state-executive-candidacy-packs";
import {
  clampShare,
  logistic,
  logit,
  standardNormal,
} from "../world-setup/deterministic-math";
import { districtIdentityCatalog } from "../../districts/catalog";
import {
  gazetteerChamberForOfficeChamberKey,
  listDistrictIdentities,
} from "../../districts/query";
import type { DistrictIdentity } from "../../districts/types";

/**
 * A state legislature with a real person in every seat.
 *
 * Until this, a state chamber started empty. Congress got 535 generated
 * members at the opening; state chambers did not, and every floor vote there
 * was a head count written in advance and handed out to "Member for District
 * N". A seat got a person only when somebody won a campaign for it. Current
 * new-game preparation fills all 50 states at the opening; older saves keep
 * the dated calendar fallback. Members use the same records a campaign
 * winner gets:
 * the seat is a `employment:legislative-member` work relationship in the body
 * `legislature:<candidacy pack>`, exactly the body `seatTheWinner` reuses, so
 * a player who later wins a seat joins the same chamber as these members.
 *
 * **How big a chamber is.** The accepted rule pack's own seat count wins. Where
 * the pack does not know it, the chamber gets one member per Census legislative
 * district for that chamber in that state. That is the state's own geography,
 * never a neighbor's rule, and it is exactly right for a chamber of
 * single-member districts; for a state that elects several members per
 * district it undercounts, and the opening record names which basis each
 * chamber was seated on. Where
 * a state has no districts on record either, no chamber is seated and the
 * opening says so, rather than inventing a size.
 *
 * **Party.** Each seat's lean is drawn from the save's own generated political
 * conditions: centered on this state's House seats as the save generated them,
 * and spread by how far House districts inside one state differ from each
 * other across the whole save. A state whose House seats carry no two-party
 * share is centered on its own statewide Senate contests; one with neither
 * seats its members without a party rather than guessing one.
 *
 * The player's home state remains first in the opening history; other states
 * follow in the deterministic jurisdiction order.
 */

export const STATE_LEGISLATURE_OPENING_VERSION =
  "state-legislature-opening/v1" as const;
const V = STATE_LEGISLATURE_OPENING_VERSION;
export const STATE_LEGISLATURE_OPENING_TRANSITION =
  "legislature:state-opening" as const;
const NATIONWIDE_OPENING_CALENDAR = "state-legislature-opening-calendar/v1";

/**
 * Older saves still use two due states per day until their initial rosters
 * exist. Current new games seat all states during opening preparation, so no
 * later clock work is scheduled for them. This makes no claim about a state's
 * convening day.
 */
export function scheduleNationwideStateLegislatureOpenings(
  world: World,
): World {
  // New-game preparation has already seated every state roster at the
  // opening date. The old calendar is still needed by saves that predate that
  // preparation, but must not put completed new-game work back on the clock.
  if (
    US_STATE_USPS.every((usps) => {
      const pack = stateCandidacyPack(`US-${usps}`);
      return !!pack && stateLegislatureEstablished(world, pack.packId);
    })
  ) {
    return world;
  }
  let next = world;
  for (const [index, usps] of US_STATE_USPS.entries()) {
    const stableKey = `${NATIONWIDE_OPENING_CALENDAR}:${usps}`;
    if (next.history.futureDueItems.some((due) => due.stableKey === stableKey))
      continue;
    const jurisdiction = stateJurisdictionForKey(`US-${usps}`);
    if (!jurisdiction) continue;
    next = scheduleFutureDueItem(next, {
      stableKey,
      dueAt: addDays(world.currentDate, 1 + Math.floor(index / 2)),
      transitionKey: STATE_LEGISLATURE_OPENING_TRANSITION,
      entityIds: [jurisdiction.id],
      jurisdictionId: jurisdiction.id,
      provenance: {
        kind: "authored",
        note: `${NATIONWIDE_OPENING_CALENDAR}: spreading initial state roster construction across clock days; this is not a state's session rule.`,
      },
    });
  }
  return next;
}

export interface NationwideStateLegislatureOpeningChunk {
  readonly world: World;
  readonly completedStates: number;
  readonly totalStates: number;
  readonly firstStateUsps: string;
  readonly lastStateUsps: string;
  readonly done: boolean;
}

/**
 * Prepare state rosters in deterministic, resumable chunks. A caller can
 * yield between iterator steps to report real progress while each chunk
 * remains an ordinary immutable World transition. The home state is first so
 * the existing opening-history order is retained.
 */
export function* prepareNationwideStateLegislatureOpeningChunks(
  world: World,
  subjectPersonId: EntityId,
  options: {
    readonly preferredFirstStateUsps?: string | null;
    readonly statesPerChunk?: number;
  } = {},
): Generator<NationwideStateLegislatureOpeningChunk, World, void> {
  if (!world.people[subjectPersonId]) {
    throw new Error("Nationwide state openings need an existing subject.");
  }
  const requestedSize = options.statesPerChunk ?? 2;
  if (!Number.isInteger(requestedSize) || requestedSize < 1) {
    throw new RangeError("statesPerChunk must be a positive integer.");
  }
  const preferred = options.preferredFirstStateUsps;
  const stateCodes: readonly string[] = US_STATE_USPS;
  const usps =
    preferred && stateCodes.includes(preferred)
      ? [preferred, ...US_STATE_USPS.filter((code) => code !== preferred)]
      : [...US_STATE_USPS];
  const openingDate = world.currentDate;
  let next = world;

  for (let start = 0; start < usps.length; start += requestedSize) {
    const chunkStates = usps.slice(start, start + requestedSize);
    for (const code of chunkStates) {
      const pack = stateCandidacyPack(`US-${code}`);
      if (!pack) {
        throw new Error(`Missing state legislature pack for ${code}.`);
      }
      next = ensureStateLegislatureOpening(next, subjectPersonId, code);
      if (!stateLegislatureEstablished(next, pack.packId)) {
        throw new Error(`Could not prepare the state legislature for ${code}.`);
      }
      if (next.currentDate !== openingDate) {
        throw new Error(
          "State legislature preparation advanced the game date.",
        );
      }
    }
    yield {
      world: next,
      completedStates: Math.min(start + chunkStates.length, usps.length),
      totalStates: usps.length,
      firstStateUsps: chunkStates[0]!,
      lastStateUsps: chunkStates.at(-1)!,
      done: start + chunkStates.length >= usps.length,
    };
  }
  return next;
}

/** Seat the people of one state's saved legislature when its opening is due. */
export function stateLegislatureOpeningHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const usps = new RegExp(`^${NATIONWIDE_OPENING_CALENDAR}:([A-Z]{2})$`).exec(
    due.stableKey,
  )?.[1];
  const subjectPersonId =
    world.control.kind === "person"
      ? world.control.personId
      : world.personOrder.find((id) => !!world.people[id]);
  if (!usps || !subjectPersonId || !world.people[subjectPersonId])
    return {
      world,
      status: "blocked",
      reasonKey: "legislature:state-opening-unavailable",
      context: "The state legislature lacks an opening subject.",
      outcomeEventId: null,
    };
  const pack = stateCandidacyPack(`US-${usps}`);
  const next = pack
    ? ensureStateLegislatureOpening(world, subjectPersonId, usps)
    : world;
  return !pack || !stateLegislatureEstablished(next, pack.packId)
    ? {
        world,
        status: "blocked",
        reasonKey: "legislature:state-opening-unavailable",
        context: `The legislature of ${usps} could not be seated from this world's saved conditions.`,
        outcomeEventId: null,
      }
    : {
        world: next,
        status: "resolved",
        reasonKey: null,
        context: `The legislature of ${usps} is seated.`,
        outcomeEventId: null,
      };
}

export const STATE_LEGISLATURE_KEYS = {
  opening: (packId: string) => `${V}:${packId}:opening`,
  body: (packId: string) => `legislature:${packId}`,
  seat: (officeKey: string, ordinal: number) =>
    `${V}:${officeKey}:seat:${ordinal}`,
} as const;

/** Where a seated chamber's size came from. */
export type ChamberSizeBasis = "rule-pack" | "one-member-per-district";

export interface SeatedChamberPlan {
  readonly officeKey: string;
  readonly chamberKey: string;
  readonly chamberName: string;
  readonly size: number;
  readonly basis: ChamberSizeBasis;
  /** The district each seat sits in, by ordinal; null where none is bound. */
  readonly districts: readonly (DistrictIdentity | null)[];
  /** How many of the last seats are elected at large, by law. */
  readonly atLargeSeats: number;
}

/**
 * The size and districts of each chamber a state's pack describes, or the
 * reason a chamber cannot be seated. Pure; reads no world.
 */
export function planStateChambers(pack: CandidacyPack): {
  readonly chambers: readonly SeatedChamberPlan[];
  readonly unseated: readonly { officeKey: string; reason: string }[];
} {
  const usps = pack.jurisdictionKey.replace(/^US-/, "");
  const catalog = districtIdentityCatalog();
  const chambers: SeatedChamberPlan[] = [];
  const unseated: { officeKey: string; reason: string }[] = [];
  for (const office of pack.offices) {
    const chamberKey = office.officeKey.split(":").at(-1) ?? "";
    const gazetteer = gazetteerChamberForOfficeChamberKey(chamberKey);
    const districts = gazetteer
      ? [
          ...listDistrictIdentities(catalog, {
            stateUsps: usps,
            chamber: gazetteer,
          }),
        ].sort((l, r) =>
          l.districtCode.localeCompare(r.districtCode, "en", { numeric: true }),
        )
      : [];
    let size: number;
    let basis: ChamberSizeBasis;
    // PLACEHOLDER until research question
    // state-legislature-chamber-sizes-and-quorum is answered: a Census
    // district is not a seat, and multi-member districts (Arizona's House)
    // seat fewer members here than the chamber has.
    //
    // A size read from law wins. A size the game drew for an unresearched
    // state's profile gives way to the state's own Census districts, which
    // are a record of that state rather than a range across others; the draw
    // seats a chamber only where the Census has no districts for it.
    const drawn =
      office.seats.kind === "known" &&
      office.seats.source?.authority === "game-profile";
    if (office.seats.kind === "known" && !(drawn && districts.length > 0)) {
      size = office.seats.value;
      basis = "rule-pack";
    } else if (districts.length > 0) {
      size = districts.length;
      basis = "one-member-per-district";
    } else {
      unseated.push({
        officeKey: office.officeKey,
        reason:
          "Neither the rule pack nor the Census district record says how many members this chamber has.",
      });
      continue;
    }
    const atLargeSeats = Math.min(
      size,
      AT_LARGE_SEATS[pack.jurisdictionKey]?.[chamberKey] ?? 0,
    );
    chambers.push({
      officeKey: office.officeKey,
      chamberKey,
      chamberName: office.chamberName,
      size,
      basis,
      districts: bindDistricts(size - atLargeSeats, districts, size),
      atLargeSeats,
    });
  }
  return { chambers, unseated };
}

/**
 * Seats a chamber elects at large, by jurisdiction and chamber key, where the
 * law says so. Puerto Rico: eleven Senators and eleven Representatives at
 * large beside the district members (P.R. Const. art. III, §§ 2-3; research
 * answer OCD-PUERTO-RICO-GOVERNMENT-AND-MUNICIPIOS, 2026-09-22).
 */
const AT_LARGE_SEATS: Readonly<
  Record<string, Readonly<Record<string, number>>>
> = {
  "US-PR": { house: 11, senate: 11 },
};

/**
 * Seats to districts. One member each where the counts match, an equal number
 * each where the seats divide evenly, and none bound otherwise: a seat is
 * never put in a district the record cannot support. Seats past the district
 * seats are at-large seats, bound to no district.
 */
function bindDistricts(
  districtSeats: number,
  districts: readonly DistrictIdentity[],
  size: number = districtSeats,
): readonly (DistrictIdentity | null)[] {
  if (
    districtSeats <= 0 ||
    districts.length === 0 ||
    districtSeats % districts.length !== 0
  ) {
    return Array.from({ length: size }, () => null);
  }
  const perDistrict = districtSeats / districts.length;
  return Array.from({ length: size }, (_, index) =>
    index < districtSeats ? districts[Math.floor(index / perDistrict)]! : null,
  );
}

export function stateLegislatureEstablished(
  world: World,
  packId: string,
): boolean {
  return world.history.events.some(
    (event) => event.stableKey === STATE_LEGISLATURE_KEYS.opening(packId),
  );
}

/** A seat's public title: its chamber and, where known, its district. */
export function stateSeatTitle(
  chamberName: string,
  district: DistrictIdentity | null,
  ordinal: number,
  atLarge = false,
): string {
  if (atLarge) return `Member of the ${chamberName}, At Large`;
  return district
    ? `Member of the ${chamberName}, District ${district.districtCode.replace(/^0+(?=\d)/, "")}`
    : `Member of the ${chamberName}, Seat ${ordinal}`;
}

export function ensureStateLegislatureOpening(
  world: World,
  subjectPersonId: EntityId,
  stateUsps: string,
): World {
  const pack = stateCandidacyPack(`US-${stateUsps}`);
  // NOT MODELED HERE: the District of Columbia's legislature is the Council
  // of the District of Columbia, thirteen members under D.C. Code § 1-204.01,
  // subject to congressional review. It is described in the municipal
  // governance data, not as a state pack, and this opening does not seat it.
  if (!pack) return world;
  if (stateLegislatureEstablished(world, pack.packId)) return world;
  if (!world.people[subjectPersonId]) {
    throw new Error("The state legislature opening needs an existing subject.");
  }
  const political = politicalStartingConditions(world);
  // Only a generated opening has the conditions a seat's lean is drawn from.
  if (!political) return world;
  const jurisdiction = stateJurisdictionForKey(pack.jurisdictionKey);
  if (!jurisdiction) return world;

  let next = world.jurisdictions[jurisdiction.id]
    ? world
    : {
        ...world,
        jurisdictions: {
          ...world.jurisdictions,
          [jurisdiction.id]: jurisdiction,
        },
        jurisdictionOrder: [...world.jurisdictionOrder, jurisdiction.id],
      };
  const date = next.currentDate;
  const rng = new SeededRng(next.seed).fork(
    STATE_LEGISLATURE_KEYS.opening(pack.packId),
  );
  const { chambers, unseated } = planStateChambers(pack);

  // PLACEHOLDER until research question
  // state-legislator-age-tenure-and-district-lean is answered: the spread,
  // the age range and the years served below are the game's own rules, not
  // measurements. Puerto Rico's members get no party until
  // puerto-rico-legislative-parties is answered.
  //
  // A seat's lean: this state's own center, as the save generated its House
  // seats, spread by how much House districts inside one state actually
  // differ from each other across the whole save. Both numbers are read from
  // this save's own generated conditions; neither is another state's.
  const houseShares = new Map<string, number[]>();
  for (const seat of congressSeats()) {
    if (seat.chamberKey !== "us-house") continue;
    const share = political.seats.find(
      (row) => row.seatKey === seat.seatKey,
    )?.generatedShare;
    if (share === null || share === undefined) continue;
    const list = houseShares.get(seat.stateUsps) ?? [];
    list.push(logit(clampShare(share, 1e-6)));
    houseShares.set(seat.stateUsps, list);
  }
  const mean = (values: readonly number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const home = houseShares.get(stateUsps) ?? [];
  // A state whose House seats carry no two-party margin (an at-large seat
  // decided another way) is centered on its own statewide Senate contests
  // instead, generated from the same conditions. Never a neighbor's.
  const statewide = congressSeats()
    .filter(
      (seat) => seat.chamberKey === "us-senate" && seat.stateUsps === stateUsps,
    )
    .map(
      (seat) =>
        political.seats.find((row) => row.seatKey === seat.seatKey)
          ?.generatedShare ?? null,
    )
    .filter((share): share is number => share !== null)
    .map((share) => logit(clampShare(share, 1e-6)));
  const center =
    home.length > 0
      ? mean(home)
      : statewide.length > 0
        ? mean(statewide)
        : null;
  let squares = 0;
  let freedom = 0;
  for (const values of houseShares.values()) {
    if (values.length < 2) continue;
    const m = mean(values);
    for (const value of values) squares += (value - m) ** 2;
    freedom += values.length - 1;
  }
  const spread = freedom > 0 ? Math.sqrt(squares / freedom) : 0;
  const parties = ["democratic", "republican"].filter((party) =>
    next.history.organizations.some(
      (organization) =>
        organization.id ===
        livingWorldOrganizationId(next, LIVING_WORLD_KEYS.nationalParty(party)),
    ),
  );

  const generated: LifeRecordProvenance = {
    kind: "generated",
    generatorKey: V,
  };
  const bodyKey = STATE_LEGISLATURE_KEYS.body(pack.packId);
  const bodyId = createStableId("organization", `${next.id}:${bodyKey}`);
  const transitions: CharacterHistoryTransition[] = [];
  const earliest = { value: date as IsoDate };
  const organization = (
    stableKey: string,
    name: string,
    classification: `${string}:${string}`,
  ) => {
    if (next.history.organizations.some((o) => o.stableKey === stableKey))
      return;
    if (
      transitions.some(
        (t) => t.kind === "organization" && t.input.stableKey === stableKey,
      )
    )
      return;
    transitions.push({
      kind: "organization",
      input: {
        stableKey,
        formedAt: earliest.value,
        detailLevel: "lightweight",
        provenance: {
          kind: "authored",
          note: `The body the accepted rule pack ${pack.legislativeRulePackId} describes, seated for this fictional save.`,
        },
        initialProfile: {
          name,
          classification: classification as `membership:${string}`,
          locationJurisdictionId: jurisdiction.id,
        },
      },
    });
  };

  interface MemberPlan {
    readonly chamber: SeatedChamberPlan;
    readonly office: ElectiveOfficeOption;
    readonly ordinal: number;
    readonly district: DistrictIdentity | null;
    readonly memberKey: string;
    readonly party: string | null;
    readonly serviceSince: IsoDate;
    readonly person: CharacterHistoryContextPersonInput;
  }
  const members: MemberPlan[] = [];
  for (const chamber of chambers) {
    const office = pack.offices.find(
      (candidate) => candidate.officeKey === chamber.officeKey,
    )!;
    const minimumAge =
      office.qualification.minimumAge.kind === "known"
        ? office.qualification.minimumAge.value
        : 18;
    for (let ordinal = 1; ordinal <= chamber.size; ordinal += 1) {
      const seatKey = STATE_LEGISLATURE_KEYS.seat(chamber.officeKey, ordinal);
      const seatRng = rng.fork(`seat:${chamber.officeKey}:${ordinal}`);
      let party: string | null = null;
      if (center !== null && parties.length === 2) {
        const lean = center + spread * standardNormal(seatRng.fork("lean"));
        party = logistic(lean) >= 0.5 ? "democratic" : "republican";
      }
      const age = seatRng.integer(minimumAge + 7, 81);
      const yearsServed = Math.min(
        seatRng.integer(0, 13),
        Math.max(0, age - minimumAge - 1),
      );
      const year = Number(date.slice(0, 4));
      const birthDate = makeIsoDate(
        `${year - age - 1}-${pad(seatRng.integer(1, 13))}-${pad(seatRng.integer(1, 29))}`,
      );
      const serviceSince = addDays(date, -Math.max(1, yearsServed * 365));
      if (serviceSince < earliest.value) earliest.value = serviceSince;
      const identity = generatePersonIdentity(seatRng.fork("identity"));
      const name = drawCanonicalNameForGender(
        seatRng.fork("name"),
        identity.gender,
        undefined,
        DISTINCT_GIVEN_NAME_GENERATION_VERSION,
      );
      members.push({
        chamber,
        office,
        ordinal,
        district: chamber.districts[ordinal - 1] ?? null,
        memberKey: `${seatKey}:member`,
        party,
        serviceSince,
        person: {
          stableKey: `${seatKey}:member`,
          ...name,
          identity,
          birthDate,
          homeJurisdictionId: jurisdiction.id,
        },
      });
    }
  }
  if (members.length === 0) return world;

  organization(bodyKey, pack.displayName, "sector:government");

  next = createCharacterHistoryContextPeople(
    next,
    members.map((member) => member.person),
  );
  next = applyCharacterHistoryPlan(next, {
    stableKey: `${STATE_LEGISLATURE_KEYS.opening(pack.packId)}:plan`,
    mode: "quick-generated",
    personId: subjectPersonId,
    transitions,
  }).world;
  const seats: CreateWorkRelationshipInput[] = [];
  const affiliations: CreateOrganizationParticipationInput[] = [];
  for (const member of members) {
    const personId = characterHistoryContextPersonId(next, member.memberKey);
    const title = stateSeatTitle(
      member.chamber.chamberName,
      member.district,
      member.ordinal,
      member.ordinal > member.chamber.size - member.chamber.atLargeSeats,
    );
    seats.push({
      stableKey: `${STATE_LEGISLATURE_KEYS.seat(member.chamber.officeKey, member.ordinal)}:tenure`,
      personId,
      organizationId: bodyId,
      startedAt: member.serviceSince,
      kind: "employment:legislative-member",
      compensation: "paid",
      authority: "shared",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: generated,
      initialRole: {
        title,
        occupationClassification: "service:elected-legislator",
        locationJurisdictionId: jurisdiction.id,
        timeDemand: {
          expectedWeekly: { minimumHours: 10, maximumHours: 45 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: jurisdiction.id,
        },
      },
    });
    if (member.party === null) continue;
    affiliations.push({
      stableKey: `${member.memberKey}:affiliation`,
      personId,
      organizationId: livingWorldOrganizationId(
        next,
        LIVING_WORLD_KEYS.nationalParty(member.party),
      ),
      startedAt: member.serviceSince,
      initialStatus: "active",
      kind: PARTY_AFFILIATION_KIND,
      roleKind: "member:public-affiliation",
      context: "Public party affiliation",
      provenance: generated,
    });
  }
  // One integrity check per batch, not per member: a chamber of two hundred
  // is otherwise seconds of repeated whole-world validation.
  next = createWorkRelationships(next, seats);
  next = createOrganizationParticipations(next, affiliations);

  return recordWorldEvent(next, {
    stableKey: STATE_LEGISLATURE_KEYS.opening(pack.packId),
    type: "world.state-legislature-opening",
    occurredAt: date,
    recordedAt: date,
    jurisdictionId: jurisdiction.id,
    involvedEntityIds: [bodyId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      V,
      `pack:${pack.packId}`,
      ...chambers.map(
        (chamber) =>
          `chamber:${chamber.chamberKey}:${chamber.size}:${chamber.basis}`,
      ),
      ...unseated.map((entry) => `unseated:${entry.officeKey}`),
    ],
    summary: `${pack.displayName} is seated: ${chambers
      .map((chamber) => `${chamber.size} in the ${chamber.chamberName}`)
      .join(", ")}.`,
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

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** "democratic" or "republican" for a national party's organization id. */
function nationalPartyKey(
  world: World,
  organizationId: EntityId | undefined,
): string | null {
  if (!organizationId) return null;
  return (
    ["democratic", "republican"].find(
      (key) =>
        livingWorldOrganizationId(
          world,
          LIVING_WORLD_KEYS.nationalParty(key),
        ) === organizationId,
    ) ?? null
  );
}

export interface StateLegislatorView {
  readonly personId: EntityId;
  readonly workRelationshipId: EntityId;
  readonly officeKey: string;
  readonly ordinal: number;
  readonly title: string;
  /** Null where the member has no recorded public party. */
  readonly party: string | null;
  /** True for a member seated by a campaign (the player, or a rival who beat them). */
  readonly byCampaign: boolean;
}

/**
 * Who holds each seat an opening filled, read from the records. A member whose
 * seat has ended, or who has died, is not listed: the seat is then vacant, and
 * a vacancy is not a person.
 */
export function stateLegislators(
  world: World,
  packId: string,
): readonly StateLegislatorView[] {
  const bodyId = createStableId(
    "organization",
    `${world.id}:${STATE_LEGISLATURE_KEYS.body(packId)}`,
  );
  const prefix = `${V}:`;
  const views: StateLegislatorView[] = [];
  const { affiliationsByStableKey, firstPartyByPerson } = affiliationIndexes(
    world.history.organizationParticipations,
  );
  for (const work of legislativeWorkForBody(world, bodyId)) {
    if (!world.people[work.personId]) continue;
    if (!isPersonAliveAt(world, work.personId, currentLifeCutoff(world)))
      continue;
    if (workStatusAt(world, work.id)?.status !== "active") continue;
    const match = seatTenureMatch(work.stableKey);
    if (!match) continue;
    const namedAffiliation = affiliationsByStableKey.get(
      `${prefix}${match[1]}:seat:${match[2]}:member:affiliation`,
    );
    const affiliation =
      (namedAffiliation?.personId === work.personId
        ? namedAffiliation
        : undefined) ?? firstPartyByPerson.get(work.personId);
    views.push({
      personId: work.personId,
      workRelationshipId: work.id,
      officeKey: match[1]!,
      ordinal: Number(match[2]),
      title: workRoleAt(world, work.id)?.title ?? "",
      party: nationalPartyKey(world, affiliation?.organizationId),
      byCampaign: false,
    });
  }
  // A campaign's winner sits in their district's seat. The seat's earlier
  // holder left when the term began, so the two are never both listed.
  for (const holder of campaignSeatHolders(world, packId)) {
    if (holder.status !== "active") continue;
    if (!world.people[holder.personId]) continue;
    if (!isPersonAliveAt(world, holder.personId, currentLifeCutoff(world)))
      continue;
    const affiliation = activeOrganizationParticipationsAt(
      world,
      holder.personId,
    ).find(
      (entry) => entry.participation.kind === PARTY_AFFILIATION_KIND,
    )?.participation;
    views.push({
      personId: holder.personId,
      workRelationshipId: holder.workRelationshipId,
      officeKey: holder.officeKey,
      ordinal: holder.ordinal,
      title: holder.title,
      party: nationalPartyKey(world, affiliation?.organizationId),
      byCampaign: true,
    });
  }
  // A save made before campaign winners were placed in their seat can still
  // show the member they replaced as serving. The winner holds the seat.
  const campaignSeats = new Set(
    views
      .filter((view) => view.byCampaign)
      .map((view) => `${view.officeKey}|${view.ordinal}`),
  );
  return views.filter(
    (view) =>
      view.byCampaign ||
      !campaignSeats.has(`${view.officeKey}|${view.ordinal}`),
  );
}

const AFFILIATION_INDEXES = new WeakMap<
  readonly OrganizationParticipation[],
  {
    readonly affiliationsByStableKey: ReadonlyMap<
      string,
      OrganizationParticipation
    >;
    readonly firstPartyByPerson: ReadonlyMap<
      EntityId,
      OrganizationParticipation
    >;
  }
>();

function affiliationIndexes(
  participations: readonly OrganizationParticipation[],
) {
  const cached = AFFILIATION_INDEXES.get(participations);
  if (cached) return cached;
  const affiliationsByStableKey = new Map<string, OrganizationParticipation>();
  const firstPartyByPerson = new Map<EntityId, OrganizationParticipation>();
  for (const participation of participations) {
    affiliationsByStableKey.set(participation.stableKey, participation);
    if (
      participation.kind === PARTY_AFFILIATION_KIND &&
      !firstPartyByPerson.has(participation.personId)
    )
      firstPartyByPerson.set(participation.personId, participation);
  }
  const indexes = { affiliationsByStableKey, firstPartyByPerson };
  AFFILIATION_INDEXES.set(participations, indexes);
  return indexes;
}

// The nationwide opening appends thousands of relationships, then reuses the
// immutable history array during ordinary bill steps. A chamber read should
// visit its own seats rather than every other state's seats each time.
const LEGISLATIVE_WORK_BY_BODY = new WeakMap<
  readonly WorkRelationship[],
  ReadonlyMap<EntityId, readonly WorkRelationship[]>
>();

function legislativeWorkForBody(
  world: World,
  bodyId: EntityId,
): readonly WorkRelationship[] {
  const records = world.history.workRelationships;
  let indexed = LEGISLATIVE_WORK_BY_BODY.get(records);
  if (!indexed) {
    const byBody = new Map<EntityId, WorkRelationship[]>();
    for (const work of records) {
      if (
        work.organizationId === null ||
        work.kind !== "employment:legislative-member"
      )
        continue;
      const body = byBody.get(work.organizationId);
      if (body) body.push(work);
      else byBody.set(work.organizationId, [work]);
    }
    indexed = byBody;
    LEGISLATIVE_WORK_BY_BODY.set(records, indexed);
  }
  return indexed.get(bodyId) ?? [];
}

export interface StateLegislativeSeatView {
  readonly officeKey: string;
  readonly ordinal: number;
  readonly title: string;
  /** The sitting member, or null when the seat has no living holder. */
  readonly member: StateLegislatorView | null;
  /** When the seat's last holder died, where that is the reason it is empty. */
  readonly holderDiedOn: IsoDate | null;
}

/**
 * Every seat an opening filled, whether or not it still has a holder. A seat
 * whose member has died stays on the list as empty, so a chamber keeps its
 * size on the screen rather than shrinking to its survivors.
 */
export function stateLegislativeSeats(
  world: World,
  packId: string,
): readonly StateLegislativeSeatView[] {
  const bodyId = createStableId(
    "organization",
    `${world.id}:${STATE_LEGISLATURE_KEYS.body(packId)}`,
  );
  const sitting = new Map(
    stateLegislators(world, packId).map((member) => [
      member.workRelationshipId,
      member,
    ]),
  );
  // Each seat's latest tenure speaks for it: its sitting member, else the
  // most recent holder, whose death (if any) is why it is empty.
  const latest = new Map<
    string,
    { work: (typeof world.history.workRelationships)[number]; seat: string[] }
  >();
  for (const work of world.history.workRelationships) {
    if (work.organizationId !== bodyId) continue;
    if (work.kind !== "employment:legislative-member") continue;
    const match = seatTenureMatch(work.stableKey);
    if (!match) continue;
    const seatKey = `${match[1]}|${match[2]}`;
    const earlier = latest.get(seatKey);
    if (earlier) {
      const earlierSitting = sitting.has(earlier.work.id);
      const thisSitting = sitting.has(work.id);
      if (earlierSitting && !thisSitting) continue;
      if (
        earlierSitting === thisSitting &&
        earlier.work.startedAt > work.startedAt
      )
        continue;
    }
    latest.set(seatKey, { work, seat: [match[1]!, match[2]!] });
  }
  // A seat a campaign's winner now holds speaks for them, not for the
  // tenure that ended when their term began.
  const byCampaign = new Map(
    [...sitting.values()]
      .filter((member) => member.byCampaign)
      .map((member) => [`${member.officeKey}|${member.ordinal}`, member]),
  );
  return [...latest.entries()]
    .map(([seatKey, { work, seat }]) => {
      const member = byCampaign.get(seatKey) ?? sitting.get(work.id) ?? null;
      return {
        officeKey: seat[0]!,
        ordinal: Number(seat[1]),
        title: member?.title ?? workRoleAt(world, work.id)?.title ?? "",
        member,
        holderDiedOn: member
          ? null
          : (world.history.personDeaths.find(
              (death) => death.personId === work.personId,
            )?.diedAt ?? null),
      };
    })
    .sort(
      (a, b) => a.officeKey.localeCompare(b.officeKey) || a.ordinal - b.ordinal,
    );
}

/**
 * The officeKey and ordinal an opening seat's tenure belongs to. The
 * opening's own tenure is `<officeKey>:seat:<n>:tenure`; a member elected
 * later holds `<officeKey>:seat:<n>:tenure:<term start>`.
 */
export function seatTenureMatch(stableKey: string): RegExpExecArray | null {
  const prefix = `${V}:`;
  return stableKey.startsWith(prefix)
    ? /^(.*):seat:(\d+):tenure(?::\d{4}-\d{2}-\d{2})?$/.exec(
        stableKey.slice(prefix.length),
      )
    : null;
}

const plansByPack = new Map<string, readonly SeatedChamberPlan[]>();

function seatedPlans(packId: string): readonly SeatedChamberPlan[] {
  let plans = plansByPack.get(packId);
  if (!plans) {
    const pack = candidacyPackById(packId);
    plans = pack ? planStateChambers(pack).chambers : [];
    plansByPack.set(packId, plans);
  }
  return plans;
}

/**
 * The seats a district elects in one chamber, in seat order, with the title
 * each carries. More than one where the state elects several members per
 * district.
 */
export function stateSeatsInDistrict(
  packId: string,
  officeKey: string,
  districtRecordId: string,
): readonly { ordinal: number; title: string }[] {
  const plan = seatedPlans(packId).find((p) => p.officeKey === officeKey);
  if (!plan) return [];
  const seats: { ordinal: number; title: string }[] = [];
  plan.districts.forEach((district, index) => {
    const ordinal = index + 1;
    if (ordinal > plan.size - plan.atLargeSeats) return;
    if (district?.recordId !== districtRecordId) return;
    seats.push({
      ordinal,
      title: stateSeatTitle(plan.chamberName, district, ordinal),
    });
  });
  return seats;
}

export interface CampaignSeatHolder {
  readonly personId: EntityId;
  readonly workRelationshipId: EntityId;
  readonly contestId: EntityId;
  readonly officeKey: string;
  readonly ordinal: number;
  readonly title: string;
  readonly startsAt: IsoDate;
  readonly endsAt: IsoDate;
  readonly status: "expected" | "active";
}

/**
 * The members a campaign put in one of an opening's seats: the player, or a
 * rival who beat them. The campaign system seats them in its own record,
 * named for their district, so each is placed here in that district's seat.
 * Where a district elects several members, a returning member keeps their
 * own seat and anyone else takes the first seat no other campaign holds. A
 * term that has ended, or a record without a district, holds no seat.
 */
export function campaignSeatHolders(
  world: World,
  packId: string,
): readonly CampaignSeatHolder[] {
  const bodyId = createStableId(
    "organization",
    `${world.id}:${STATE_LEGISLATURE_KEYS.body(packId)}`,
  );
  const terms = world.history.workRelationships
    .filter(
      (work) =>
        work.organizationId === bodyId &&
        work.kind === "employment:legislative-member" &&
        !seatTenureMatch(work.stableKey),
    )
    .map((work) => ({
      work,
      status: workStatusAt(world, work.id)?.status,
      term: legislativeTermForRelationship(world, work.id),
    }))
    .filter(
      (entry) =>
        (entry.status === "expected" || entry.status === "active") &&
        entry.term &&
        // Named contests and uniquely reconciled older contests use the
        // same seat identity. An unresolved term falls back to contest.id.
        entry.term.seatKey !== entry.term.contest.id &&
        stateSeatsInDistrict(
          packId,
          entry.term.contest.office.officeKey,
          entry.term.seatKey,
        ).length > 0 &&
        // A member who has died holds no seat, whatever their record says.
        !world.history.personDeaths.some(
          (death) => death.personId === entry.work.personId,
        ),
    )
    .sort(
      (a, b) =>
        a.work.startedAt.localeCompare(b.work.startedAt) ||
        a.work.id.localeCompare(b.work.id),
    );
  const held = new Map<string, EntityId>();
  const holders: CampaignSeatHolder[] = [];
  for (const { work, status, term } of terms) {
    const officeKey = term!.contest.office.officeKey;
    const seats = stateSeatsInDistrict(packId, officeKey, term!.seatKey);
    const seat =
      seats.find(
        (s) => held.get(`${officeKey}|${s.ordinal}`) === work.personId,
      ) ?? seats.find((s) => !held.has(`${officeKey}|${s.ordinal}`));
    if (!seat) continue;
    held.set(`${officeKey}|${seat.ordinal}`, work.personId);
    holders.push({
      personId: work.personId,
      workRelationshipId: work.id,
      contestId: term!.contest.id,
      officeKey,
      ordinal: seat.ordinal,
      title: seat.title,
      startsAt: term!.startsAt,
      endsAt: term!.endsAt,
      status: status as "expected" | "active",
    });
  }
  return holders;
}

/**
 * Ends the generated member (the opening's, or one a regular election seated)
 * in the seat a campaign's winner takes, on the day the winner's term begins,
 * so the seat has one holder from its first day. The seat is the one
 * `campaignSeatHolders` places the winner in. Nothing changes where the
 * chamber was never seated or the winner's record names no district seat.
 * The regular election's own term start ends the same member when it runs
 * first; each records the end only while the member still serves.
 */
export function endOpeningMemberForWinner(
  world: World,
  input: {
    readonly candidacyPackId: string;
    readonly winnerWorkRelationshipId: EntityId;
    readonly effectiveAt: IsoDate;
    readonly outcomeEventId: EntityId;
  },
): World {
  if (!stateLegislatureEstablished(world, input.candidacyPackId)) return world;
  const holder = campaignSeatHolders(world, input.candidacyPackId).find(
    (candidate) =>
      candidate.workRelationshipId === input.winnerWorkRelationshipId,
  );
  if (!holder) return world;
  const tenureKey = `${STATE_LEGISLATURE_KEYS.seat(holder.officeKey, holder.ordinal)}:tenure`;
  const work = world.history.workRelationships.find(
    (candidate) =>
      (candidate.stableKey === tenureKey ||
        candidate.stableKey.startsWith(`${tenureKey}:`)) &&
      workStatusAt(world, candidate.id)?.status === "active",
  );
  const status = work && workStatusAt(world, work.id);
  if (!work || status?.status !== "active") return world;
  const replacementKey = `${V}:replaced-by:${input.winnerWorkRelationshipId}`;
  // The original entry may already have ended an opening tenure. A saved
  // stale successor in that seat needs its own append-only status identity.
  const stableKey = world.history.workStatuses.some(
    (record) => record.stableKey === replacementKey,
  )
    ? `${replacementKey}:tenure:${work.id}`
    : replacementKey;
  return recordWorkStatus(world, {
    stableKey,
    workRelationshipId: work.id,
    effectiveAt: input.effectiveAt,
    status: "ended",
    reason: "The winner of this district's election took the seat.",
    provenance: { kind: "simulated-event", eventId: input.outcomeEventId },
    supersedesStatusId: status.id,
  });
}
