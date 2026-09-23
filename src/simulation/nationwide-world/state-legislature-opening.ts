import {
  applyCharacterHistoryPlan,
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import type {
  CharacterHistoryContextPersonInput,
  CharacterHistoryTransition,
} from "../character-history";
import { stateCandidacyPack } from "../candidacy-packs";
import type { CandidacyPack, ElectiveOfficeOption } from "../candidacy-packs";
import { addDays, makeIsoDate } from "../dates";
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
import type { EntityId, IsoDate, LifeRecordProvenance, World } from "../types";
import { recordWorldEvent } from "../world";
import {
  createOrganizationParticipations,
  createWorkRelationships,
} from "../life";
import type {
  CreateOrganizationParticipationInput,
  CreateWorkRelationshipInput,
} from "../life";
import { currentLifeCutoff, workRoleAt, workStatusAt } from "../life-queries";
import { isPersonAliveAt } from "../vitality-integrity";
import { politicalStartingConditions } from "../world-setup/conditions";
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
 * members at the opening; the state house under the player's feet got none,
 * and every floor vote there was a head count written in advance and handed
 * out to "Member for District N". A seat got a person only when somebody won
 * a campaign for it. This fills the home state's chambers once, at the
 * opening, with people who have a seat, a district where one can be named, a
 * and a party, all through the same records a campaign winner gets:
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
 * Only a current opening calls this, for the player's home state, once.
 */

export const STATE_LEGISLATURE_OPENING_VERSION =
  "state-legislature-opening/v1" as const;
const V = STATE_LEGISLATURE_OPENING_VERSION;

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
    chambers.push({
      officeKey: office.officeKey,
      chamberKey,
      chamberName: office.chamberName,
      size,
      basis,
      districts: bindDistricts(size, districts),
    });
  }
  return { chambers, unseated };
}

/**
 * Seats to districts. One member each where the counts match, an equal number
 * each where the seats divide evenly, and none bound otherwise: a seat is
 * never put in a district the record cannot support.
 */
function bindDistricts(
  size: number,
  districts: readonly DistrictIdentity[],
): readonly (DistrictIdentity | null)[] {
  if (districts.length === 0 || size % districts.length !== 0) {
    return Array.from({ length: size }, () => null);
  }
  const perDistrict = size / districts.length;
  return Array.from(
    { length: size },
    (_, index) => districts[Math.floor(index / perDistrict)]!,
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
): string {
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

export interface StateLegislatorView {
  readonly personId: EntityId;
  readonly workRelationshipId: EntityId;
  readonly officeKey: string;
  readonly ordinal: number;
  readonly title: string;
  /** Null where the member has no recorded public party. */
  readonly party: string | null;
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
  for (const work of world.history.workRelationships) {
    if (work.organizationId !== bodyId) continue;
    if (work.kind !== "employment:legislative-member") continue;
    if (!world.people[work.personId]) continue;
    if (!isPersonAliveAt(world, work.personId, currentLifeCutoff(world)))
      continue;
    if (workStatusAt(world, work.id)?.status !== "active") continue;
    const match = work.stableKey.startsWith(prefix)
      ? /^(.*):seat:(\d+):tenure$/.exec(work.stableKey.slice(prefix.length))
      : null;
    if (!match) continue;
    const affiliation = world.history.organizationParticipations.find(
      (participation) =>
        participation.stableKey ===
        `${prefix}${match[1]}:seat:${match[2]}:member:affiliation`,
    );
    const party = affiliation
      ? (["democratic", "republican"].find(
          (key) =>
            livingWorldOrganizationId(
              world,
              LIVING_WORLD_KEYS.nationalParty(key),
            ) === affiliation.organizationId,
        ) ?? null)
      : null;
    views.push({
      personId: work.personId,
      workRelationshipId: work.id,
      officeKey: match[1]!,
      ordinal: Number(match[2]),
      title: workRoleAt(world, work.id)?.title ?? "",
      party,
    });
  }
  return views;
}
