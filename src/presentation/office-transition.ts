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
  officeTransitionProfile,
  stateExecutiveEntryStatus,
  stateExecutiveIdentityForOfficeKey,
  stateJurisdictionForKey,
  transitionServiceStatus,
  workRelationshipHistoryForPerson,
  workRoleAt,
  workStatusAt,
} from "../simulation";
import { congressSeatStatus } from "./congress-candidacy";
import type {
  DatedTransitionService,
  EntityId,
  IsoDate,
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
   * Only a state executive term needs a recorded qualification before entry;
   * a legislative seat has none in this game. Qualifying stays on Campaigns.
   */
  readonly qualification: "not-required" | "needed" | "done";
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
    identity && stateJurisdictionForKey(identity.jurisdictionKey);
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
      status.kind === "qualified-awaiting-entry" ? "done" : "needed",
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
