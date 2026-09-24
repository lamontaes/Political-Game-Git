/**
 * The winner's transition, as the player sees it: what they are called until
 * the term begins, when it begins, and the services open to them before then.
 *
 * Read from the records that already say a term is coming — a legislative
 * seat's expected work and its dated term, or a state executive term awaiting
 * entry — so there is no second store of who won. Projecting writes nothing.
 */

import {
  attendTransitionService,
  daysBetween,
  datedTransitionServices,
  electionContestById,
  legislativeTermForRelationship,
  oathChoiceOf,
  oathOfOfficeRecord,
  oathSwornOnOptions,
  personName,
  stateOathOfOffice,
  officeTransitionProfile,
  stateExecutiveEntryStatus,
  stateExecutiveIdentityForOfficeKey,
  stateJurisdictionForKey,
  takeOathOfOffice,
  transitionServiceStatus,
  workRelationshipHistoryForPerson,
  workRoleAt,
  workStatusAt,
} from "../simulation";
import { congressSeatStatus } from "./congress-candidacy";
import { electedExecutiveOfficeJurisdiction } from "../simulation/executive-work-context";
import type {
  DatedTransitionService,
  EntityId,
  IsoDate,
  OathForm,
  OathSwornOn,
  OathSwornOnOption,
  OfficeTransitionProfile,
  TransitionServiceStatus,
  World,
} from "../simulation";

export interface OfficeTransitionServiceView {
  readonly key: string;
  readonly title: string;
  readonly description: string;
  readonly opensOn: IsoDate;
  readonly closesOn: IsoDate;
  readonly status: TransitionServiceStatus;
}

export interface OfficeTransitionView {
  readonly contestId: EntityId;
  readonly officeTitle: string;
  readonly electTitle: string;
  readonly electedOn: IsoDate;
  readonly startsAt: IsoDate;
  readonly daysUntilStart: number;
  readonly entry: string;
  /**
   * Whether the office's requirements are met, checked for the winner rather
   * than pressed (there is no Qualify step). "blocked" means one the game can
   * test fails; the reason is on Campaigns. A legislative seat re-reads its
   * requirements on the first day instead.
   */
  readonly qualification: "not-required" | "blocked" | "done";
  readonly services: readonly OfficeTransitionServiceView[];
}

interface ResolvedTransition {
  readonly contestId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly officeTitle: string;
  readonly electTitle: string;
  readonly electedOn: IsoDate;
  readonly startsAt: IsoDate;
  readonly profile: OfficeTransitionProfile;
  readonly qualification: OfficeTransitionView["qualification"];
  readonly services: readonly DatedTransitionService[];
}

function legislativeTransition(
  world: World,
  personId: EntityId,
): ResolvedTransition | null {
  for (const relationship of workRelationshipHistoryForPerson(
    world,
    personId,
  )) {
    if (relationship.kind !== "employment:legislative-member") continue;
    if (workStatusAt(world, relationship.id)?.status !== "expected") continue;
    const term = legislativeTermForRelationship(world, relationship.id);
    if (!term || world.currentDate >= term.startsAt) continue;
    const profile = officeTransitionProfile("state-legislature");
    // Named by the chamber: the seat's own title reads "Seat in the House
    // of Representatives", which is not what anybody is called.
    const chamber =
      term.pack.offices.find(
        (office) => office.officeKey === term.contest.office.officeKey,
      )?.chamberName ?? "legislature";
    return {
      contestId: term.contest.id,
      jurisdictionId: term.governing.id,
      officeTitle:
        workRoleAt(world, relationship.id)?.title ?? term.contest.office.title,
      electTitle: profile.electTitle(chamber),
      electedOn: term.contest.electionDate,
      startsAt: term.startsAt,
      profile,
      qualification: "not-required",
      services: datedTransitionServices(
        profile,
        term.contest.electionDate,
        term.startsAt,
      ),
    };
  }
  return null;
}

function executiveTransition(
  world: World,
  personId: EntityId,
): ResolvedTransition | null {
  const status = stateExecutiveEntryStatus(world, personId);
  if (
    status.kind !== "awaiting-qualification" &&
    status.kind !== "qualified-awaiting-entry"
  )
    return null;
  const contest = electionContestById(world, status.contestId);
  const identity =
    contest && stateExecutiveIdentityForOfficeKey(contest.office.officeKey);
  const jurisdiction =
    identity && electedExecutiveOfficeJurisdiction(identity.jurisdictionKey);
  if (!contest || !identity || !jurisdiction) return null;
  const profile = officeTransitionProfile("state-executive");
  return {
    contestId: contest.id,
    jurisdictionId: jurisdiction.id,
    officeTitle: identity.title,
    electTitle: profile.electTitle(identity.title),
    electedOn: contest.electionDate,
    startsAt: status.startsAt,
    profile,
    qualification:
      status.kind === "qualified-awaiting-entry" ? "done" : "blocked",
    services: datedTransitionServices(
      profile,
      contest.electionDate,
      status.startsAt,
    ),
  };
}

function congressTransition(
  world: World,
  personId: EntityId,
): ResolvedTransition | null {
  const status = congressSeatStatus(world, personId);
  if (status.kind !== "won-awaiting-term") return null;
  const jurisdiction = stateJurisdictionForKey(status.identity.jurisdictionKey);
  if (!jurisdiction) return null;
  const profile = officeTransitionProfile(
    status.identity.seat.chamberKey === "us-house"
      ? "federal-house"
      : "federal-senate",
  );
  return {
    contestId: status.contestId,
    jurisdictionId: jurisdiction.id,
    officeTitle: status.identity.displayName,
    electTitle: profile.electTitle(status.identity.title),
    electedOn: status.electionDate,
    startsAt: status.startsAt,
    profile,
    qualification: "not-required",
    services: datedTransitionServices(
      profile,
      status.electionDate,
      status.startsAt,
    ),
  };
}

function resolveTransition(
  world: World,
  personId: EntityId,
): ResolvedTransition | null {
  return (
    legislativeTransition(world, personId) ??
    executiveTransition(world, personId) ??
    congressTransition(world, personId)
  );
}

export function projectOfficeTransition(
  world: World,
  personId: EntityId,
): OfficeTransitionView | null {
  const resolved = resolveTransition(world, personId);
  if (!resolved) return null;
  return {
    contestId: resolved.contestId,
    officeTitle: resolved.officeTitle,
    electTitle: resolved.electTitle,
    electedOn: resolved.electedOn,
    startsAt: resolved.startsAt,
    daysUntilStart: daysBetween(world.currentDate, resolved.startsAt),
    entry: resolved.profile.entry,
    qualification: resolved.qualification,
    services: resolved.services.map((service) => ({
      key: service.key,
      title: service.title,
      description: service.description,
      opensOn: service.opensOn,
      closesOn: service.closesOn,
      status: transitionServiceStatus(
        world,
        personId,
        resolved.contestId,
        service,
      ),
    })),
  };
}

/** Attend one of the open services. Refuses, unchanged, if none is open by that key. */
export function attendOfficeTransitionService(
  world: World,
  personId: EntityId,
  serviceKey: string,
): World {
  const resolved = resolveTransition(world, personId);
  const service = resolved?.services.find((s) => s.key === serviceKey);
  if (!resolved || !service)
    throw new Error("There is no transition service by that name to attend.");
  return attendTransitionService(world, {
    personId,
    contestId: resolved.contestId,
    jurisdictionId: resolved.jurisdictionId,
    electTitle: resolved.electTitle,
    profile: resolved.profile,
    service,
  });
}

export interface SwearingInView {
  readonly contestId: EntityId;
  readonly officeTitle: string;
  readonly startedOn: IsoDate;
  /** How this institution holds the ceremony. */
  readonly ceremony: string;
  /** When the oath was taken, or null while it is still to take. */
  readonly swornInOn: IsoDate | null;
  /** The name the officeholder speaks in the oath. */
  readonly personName: string;
  readonly swornOnOptions: readonly OathSwornOnOption[];
  /** What the recorded oath was taken on; null before it, or for an older record. */
  readonly swornOn: OathSwornOnOption | null;
  readonly form: OathForm | null;
}

interface ResolvedTerm {
  readonly contestId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly officeTitle: string;
  readonly startsAt: IsoDate;
  readonly profile: OfficeTransitionProfile;
  readonly stateName: string;
}

function heldLegislativeTerm(
  world: World,
  personId: EntityId,
): ResolvedTerm | null {
  for (const relationship of workRelationshipHistoryForPerson(
    world,
    personId,
  )) {
    if (relationship.kind !== "employment:legislative-member") continue;
    if (workStatusAt(world, relationship.id)?.status !== "active") continue;
    const term = legislativeTermForRelationship(world, relationship.id);
    if (!term || world.currentDate < term.startsAt) continue;
    if (world.currentDate >= term.endsAt) continue;
    const chamber =
      term.pack.offices.find(
        (office) => office.officeKey === term.contest.office.officeKey,
      )?.chamberName ?? "legislature";
    return {
      contestId: term.contest.id,
      jurisdictionId: term.governing.id,
      officeTitle: `Member of the ${chamber}`,
      startsAt: term.startsAt,
      profile: officeTransitionProfile("state-legislature"),
      stateName: term.governing.name,
    };
  }
  return null;
}

function heldExecutiveTerm(
  world: World,
  personId: EntityId,
): ResolvedTerm | null {
  const status = stateExecutiveEntryStatus(world, personId);
  if (status.kind !== "in-office") return null;
  const contest = electionContestById(world, status.contestId);
  const identity =
    contest && stateExecutiveIdentityForOfficeKey(contest.office.officeKey);
  const jurisdiction =
    identity && electedExecutiveOfficeJurisdiction(identity.jurisdictionKey);
  if (!contest || !identity || !jurisdiction) return null;
  return {
    contestId: contest.id,
    jurisdictionId: jurisdiction.id,
    officeTitle: identity.title,
    startsAt: status.startsAt,
    profile: officeTransitionProfile("state-executive"),
    stateName: jurisdiction.name,
  };
}

function heldTerm(world: World, personId: EntityId): ResolvedTerm | null {
  return (
    heldLegislativeTerm(world, personId) ?? heldExecutiveTerm(world, personId)
  );
}

/**
 * The swearing-in for the term being served, from its first day. Shown until
 * the oath is taken and on the day it is; null outside a held term.
 */
export function projectSwearingIn(
  world: World,
  personId: EntityId,
): SwearingInView | null {
  const held = heldTerm(world, personId);
  if (!held) return null;
  const record = oathOfOfficeRecord(world, personId, held.contestId);
  if (record && record.occurredAt < world.currentDate) return null;
  const options = oathSwornOnOptions(held.stateName);
  const choice = record ? oathChoiceOf(record) : null;
  return {
    contestId: held.contestId,
    officeTitle: held.officeTitle,
    startedOn: held.startsAt,
    ceremony: held.profile.swearingIn,
    swornInOn: record ? record.occurredAt : null,
    personName: speakerName(world, personId),
    swornOnOptions: options,
    swornOn: choice
      ? (options.find((option) => option.key === choice.swornOn) ?? null)
      : null,
    form: choice?.form ?? null,
  };
}

function speakerName(world: World, personId: EntityId): string {
  const person = world.people[personId];
  if (!person) throw new Error(`No person ${personId}.`);
  return personName(person);
}

/**
 * The oath for the term being served, phrase by phrase, as the officiant reads
 * it and the officeholder repeats it. Reading it records nothing.
 */
export function oathWordsForHeldOffice(
  world: World,
  personId: EntityId,
  form: OathForm,
): readonly string[] {
  const held = heldTerm(world, personId);
  if (!held) throw new Error("There is no office to be sworn into.");
  return stateOathOfOffice({
    personName: speakerName(world, personId),
    stateName: held.stateName,
    officeTitle: held.officeTitle,
    form,
  }).map((phrase) => phrase.text);
}

/** Take the oath for the term being served. Refuses, unchanged, outside one. */
export function takeOathForHeldOffice(
  world: World,
  personId: EntityId,
  choice: { readonly swornOn: OathSwornOn; readonly form: OathForm },
): World {
  const held = heldTerm(world, personId);
  if (!held) throw new Error("There is no office to be sworn into.");
  return takeOathOfOffice(world, { personId, ...held, ...choice });
}
