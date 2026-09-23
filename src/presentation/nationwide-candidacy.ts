import {
  incumbentGovernorStandingAgain,
  stateExecutiveEntryStatus,
  candidacyEligibility,
  ensureCampaignOpponents,
  generalElectionField,
  ensureStateJurisdiction,
  fileCampaign,
  homeStateUsps,
  makeCurrencyCode,
  nextFilableStateExecutiveTerm,
  stateExecutiveIdentity,
  chiefExecutiveJurisdiction,
} from "../simulation";
import { describeStateExecutiveTerm } from "./state-executive-term-description";
import type {
  CandidacyBlock,
  EntityId,
  IsoDate,
  StateExecutiveIdentity,
  TermRuleSource,
  World,
} from "../simulation";

export {
  qualifyForStateExecutiveTerm,
  recoverOffCycleStateExecutiveTerm,
  stateExecutiveEntryStatus,
} from "../simulation";

export interface StateExecutiveCandidacy {
  readonly identity: StateExecutiveIdentity;
  readonly jurisdictionId: EntityId;
  readonly eligible: boolean;
  readonly blocks: readonly CandidacyBlock[];
}

/**
 * The executive office of the state this person lives in, and whether the
 * facts RULES has admitted let them stand for it today. Reading is free and
 * writes nothing.
 */
export function stateExecutiveCandidacyForPerson(
  world: World,
  personId: EntityId,
  alreadyACandidate = false,
): StateExecutiveCandidacy | null {
  const usps = homeStateUsps(world, personId);
  const identity = usps ? stateExecutiveIdentity(usps) : null;
  const jurisdiction = identity
    ? chiefExecutiveJurisdiction(identity.stateUsps)
    : null;
  if (!identity || !jurisdiction) return null;
  const eligibility = candidacyEligibility(world, {
    personId,
    jurisdictionId: jurisdiction.id,
    officeKey: identity.officeKey,
    alreadyACandidate,
  });
  return {
    identity,
    jurisdictionId: jurisdiction.id,
    eligible: eligibility.eligible,
    blocks: eligibility.blocks,
  };
}

export interface StateExecutiveOfficeCalendar {
  /** The next regular general election a filing today would stand in. */
  readonly nextElection: IsoDate;
  /** A nearer regular election whose candidate field has already closed. */
  readonly closedElection: IsoDate | null;
  /** The term that election would win. */
  readonly termStartsAt: IsoDate;
  readonly termEndsAt: IsoDate;
  /** "verified" only when every calendar value is compiled state law. */
  readonly basis: "verified" | "game-profile" | "mixed";
  /** Player-facing statement of the calendar's rules, not of their source. */
  readonly note: string;
  readonly sources: readonly TermRuleSource[];
  readonly ruleVersion: string;
}

/** The office's own election calendar, read without writing anything. */
export function stateExecutiveOfficeCalendar(
  world: World,
  stateUsps: string,
): StateExecutiveOfficeCalendar | null {
  // A filing stands in the next regular election whose candidate field is
  // still open, on the calendar this World's law sets; once a field closes,
  // the office's next cycle is the one.
  const term = nextFilableStateExecutiveTerm(world, stateUsps);
  if (!term) return null;
  const { rule, electionDay: nextElection } = term;
  const bases = Object.values(rule.basis);
  const basis = bases.every((b) => b === "verified")
    ? "verified"
    : bases.every((b) => b === "game-profile")
      ? "game-profile"
      : "mixed";
  return {
    nextElection,
    closedElection: term.closedElectionDay,
    termStartsAt: term.startsAt,
    termEndsAt: term.endsAt,
    basis,
    note: describeStateExecutiveTerm(rule),
    sources: rule.sources,
    ruleVersion: rule.ruleVersion,
  };
}

/**
 * Whether a sitting governor may stand for the next term: the same candidacy
 * rules anyone filing meets, which include the state's term limit for the term
 * the election fills. Null when this person does not hold the office now.
 */
export function stateExecutiveReelection(
  world: World,
  personId: EntityId,
): { readonly canStand: boolean; readonly reason: string | null } | null {
  if (stateExecutiveEntryStatus(world, personId).kind !== "in-office")
    return null;
  const candidacy = stateExecutiveCandidacyForPerson(world, personId);
  if (!candidacy) return null;
  return candidacy.eligible
    ? { canStand: true, reason: null }
    : {
        canStand: false,
        reason: candidacy.blocks.map((block) => block.reason).join(" "),
      };
}

/**
 * Standing for governor of one's own state, through the same campaign and
 * contest route a legislative filing uses. The contest is statewide, so it is
 * run from the state's jurisdiction; the candidate still lives where they live.
 */
export function fileForStateExecutiveOffice(
  world: World,
  personId: EntityId,
): World {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  const candidacy = stateExecutiveCandidacyForPerson(world, personId);
  if (!candidacy)
    throw new Error("This character does not live in one of the fifty states.");
  const stableKey = `candidacy:${personId}:${world.currentDate}`;
  const registered = ensureStateJurisdiction(
    world,
    candidacy.identity.stateUsps,
  );
  // The office's own regular election: verified where the state's law is
  // compiled, otherwise the game's disclosed calendar. Never a fixed number of
  // days after filing.
  const electionDate = stateExecutiveOfficeCalendar(
    world,
    candidacy.identity.stateUsps,
  )!.nextElection;
  // A sitting governor who stands again is the opponent. Only an open seat
  // draws a new rival, who lives in the state: in the candidate's own home
  // place, so a rival who wins can qualify like anyone else.
  const incumbent = incumbentGovernorStandingAgain(
    registered,
    candidacy.identity.stateUsps,
    electionDate,
  );
  const incumbentStanding =
    incumbent.incumbentPersonId !== null &&
    incumbent.incumbentPersonId !== personId;
  // The other party's nominee (the incumbent, if standing again), plus any
  // independent who ran: see `contest-field.ts`. A governorship is never left
  // unopposed there.
  const field = generalElectionField(world.seed, {
    stableKey,
    officeKey: candidacy.identity.officeKey,
    incumbentStanding,
  });
  const drawn = ensureCampaignOpponents(incumbent.world, {
    stableKey,
    // New rivals live in the state: in the candidate's own home place, so a
    // rival who wins can qualify like anyone else.
    jurisdictionId: person.homeJurisdictionId,
    count: (incumbentStanding ? 0 : field.partyOpponents) + field.independents,
    excludePersonIds: [
      personId,
      ...(incumbentStanding ? [incumbent.incumbentPersonId!] : []),
    ],
  });
  const opponents = {
    world: drawn.world,
    personIds: [
      ...(incumbentStanding ? [incumbent.incumbentPersonId!] : []),
      ...drawn.personIds,
    ],
  };
  return fileCampaign(opponents.world, {
    stableKey,
    candidatePersonId: personId,
    jurisdictionId: candidacy.jurisdictionId,
    officeKey: candidacy.identity.officeKey,
    districtBinding: null,
    electionDate,
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: `${person.familyName} for ${candidacy.identity.displayName}`,
    donorPoolName: "People who might give",
    advertisingVendorName: "Whoever sells the advertising",
    staffPersonIds: [],
    treasuryCurrency: makeCurrencyCode("USD"),
  }).world;
}
