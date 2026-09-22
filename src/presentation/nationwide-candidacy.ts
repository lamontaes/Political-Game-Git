import {
  incumbentGovernorStandingAgain,
  recordedTermsInOffice,
  GOVERNOR_TURNOVER_PROFILE,
  stateExecutiveEntryStatus,
  addDays,
  candidacyEligibility,
  ensureCampaignOpponents,
  ensureStateJurisdiction,
  fileCampaign,
  homeStateUsps,
  makeCurrencyCode,
  nextRegularElection,
  regularFieldClosed,
  stateExecutiveIdentity,
  stateExecutiveTermRule,
  chiefExecutiveJurisdiction,
  termDatesAfterElection,
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
  const rule = stateExecutiveTermRule(stateUsps);
  if (!rule) return null;
  // A filing stands in the next regular election whose candidate field is
  // still open; once a field closes, the office's next cycle is the one.
  let nextElection = nextRegularElection(rule, addDays(world.currentDate, 1));
  if (regularFieldClosed(world, nextElection))
    nextElection = nextRegularElection(rule, addDays(nextElection, 1));
  const term = termDatesAfterElection(rule, nextElection);
  const bases = Object.values(rule.basis);
  const basis = bases.every((b) => b === "verified")
    ? "verified"
    : bases.every((b) => b === "game-profile")
      ? "game-profile"
      : "mixed";
  return {
    nextElection,
    termStartsAt: term.startsAt,
    termEndsAt: term.endsAt,
    basis,
    note: describeStateExecutiveTerm(rule),
    sources: rule.sources,
    ruleVersion: rule.ruleVersion,
  };
}

/**
 * Whether a sitting governor may stand for the next term.
 *
 * BLANKET RULE: a governor may serve two terms in a row, the limit most states
 * set and the one the game already applies to governors it runs itself
 * (`GOVERNOR_TURNOVER_PROFILE.incumbentStepsDownAfterTerms`). Some states set
 * none and some count differently; each state's own limit is filed with
 * ChatGPT as `governor-term-limits-by-state` and replaces this when answered.
 * Null when this person does not hold the office now.
 */
export function stateExecutiveReelection(
  world: World,
  personId: EntityId,
): { readonly canStand: boolean; readonly reason: string | null } | null {
  const status = stateExecutiveEntryStatus(world, personId);
  if (status.kind !== "in-office") return null;
  const candidacy = stateExecutiveCandidacyForPerson(world, personId);
  if (!candidacy) return null;
  const served = recordedTermsInOffice(
    world,
    personId,
    candidacy.identity.officeKey,
  );
  if (served >= GOVERNOR_TURNOVER_PROFILE.incumbentStepsDownAfterTerms)
    return {
      canStand: false,
      reason: `You are serving your ${served === 2 ? "second" : `${served}th`} term in a row. Governors in this game may serve two terms in a row, so you cannot stand for a third.`,
    };
  return { canStand: true, reason: null };
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
  const opponents =
    incumbent.incumbentPersonId && incumbent.incumbentPersonId !== personId
      ? { world: incumbent.world, personIds: [incumbent.incumbentPersonId] }
      : ensureCampaignOpponents(incumbent.world, {
          stableKey,
          jurisdictionId: person.homeJurisdictionId,
          count: 1,
          excludePersonIds: [personId],
        });
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
