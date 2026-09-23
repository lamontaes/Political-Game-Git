import { makeIsoDate } from "../dates";
import {
  US_CONGRESS_PACK_ID,
  US_CONGRESS_RULE_PACK,
} from "../congress-rule-pack";
import { currentPresidentOf } from "../crisis/offices";
import { scheduleFutureDueItem } from "../future-transitions";
import {
  introduceMeasure,
  measurePosition,
  measureVotes,
} from "../legislation";
import { chamberByKey } from "../legislature-rules";
import { publicPartyAffiliation } from "../living-world/congress";
import { livingWorldEstablished } from "../living-world/opening";
import { nextMeasureDesignation } from "../measure-numbering";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import { US_FEDERAL_POLICY_PACK } from "../policy-pack-us-federal";
import { SeededRng } from "../rng";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  LegislativeMeasureRecord,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import {
  CONGRESS_SITTING_TRANSITION,
  COSPONSOR_EVENT,
  isCongressMeasure,
  measureCosponsors,
  nationalPartyKeys,
  scheduleCongressSitting,
  seatedCongressChamber,
  withSittingSeating,
} from "./congress-chambers";
import {
  applyInstitutionStep,
  recordGovernorDecisionOnMeasure,
  scheduleInstitutionStep,
} from "./legislative-clock";
import type { SeatedMember } from "../legislation-scenarios";

/**
 * CONGRESS MAKES LAW — members of Congress file bills on the issues they have
 * taken up, colleagues who share the issue sign on, and the bill moves through
 * both Houses and to the President on the same clock that moves a state bill.
 *
 * Every step after filing belongs to the legislative clock
 * (`legislative-clock.ts`), which reads the Congress pack's rules and each
 * seated member's own decision. This file does the three things that clock
 * does not: it files bills, it gathers cosponsors, and it decides what the
 * President does with a bill on the desk.
 *
 * What a bill changes once it is law is NOT built yet. A Congress bill names
 * the federal issue it is about and nothing more, because the record of what
 * a bill does to a policy question is being built by the Legislation thread,
 * and the effect of each federal issue on the world is asked as
 * `what-each-level-of-government-may-legislate`.
 */

export const CONGRESS_LAWMAKING_VERSION = "congress-intake/v1";
export const CONGRESS_INTAKE_TRANSITION = "congress:intake" as const;
export const SPONSOR_MOTIVE_EVENT = "legislation.sponsor-motive" as const;

/**
 * PLACEHOLDER, every number here, until research question
 * how-congress-moves-bills is answered.
 *
 * - One bill is filed in each House on the first day of every month. The
 *   real Congress files more than ten thousand bills in two years and enacts
 *   a few hundred; a save cannot carry ten thousand, so this is a trickle of
 *   the bills that get a hearing.
 * - Each member has taken up two federal issues, drawn once for that person
 *   and stable for life. What a member really takes up (their state, their
 *   committee, their district's industries, their own history) is asked.
 * - Every other member of the sponsor's party who shares the issue signs on.
 *   A member of the other party who shares it signs on one time in ten.
 */
export const CONGRESS_LAWMAKING_PROFILE = {
  id: "ocd-congress-lawmaking/v1",
  intakeDayOfMonth: 1,
  priorityIssuesPerMember: 2,
  crossPartyCosponsorOneIn: 10,
} as const;

type FederalIssue = NonNullable<typeof US_FEDERAL_POLICY_PACK.issues>[number];

/** The federal issues a member of Congress has taken up, stable for life. */
export function memberPriorityIssues(
  world: World,
  personId: EntityId,
): readonly FederalIssue[] {
  const rng = new SeededRng(world.seed).fork(
    `${CONGRESS_LAWMAKING_VERSION}:priorities:${personId}`,
  );
  const pool = [...(US_FEDERAL_POLICY_PACK.issues ?? [])];
  const chosen: FederalIssue[] = [];
  while (
    chosen.length < CONGRESS_LAWMAKING_PROFILE.priorityIssuesPerMember &&
    pool.length > 0
  ) {
    chosen.push(pool.splice(rng.integer(0, pool.length), 1)[0]!);
  }
  return chosen;
}

function subjectClassFor(
  issue: FederalIssue,
): LegislativeMeasureRecord["subjectClass"] {
  if (issue.domain === "tax") return "revenue";
  if (issue.key === "budget.appropriations") return "appropriation";
  return "general-policy";
}

const SMALL_WORDS = new Set(["and", "of", "the", "for", "in", "on", "or"]);
function titleCase(name: string): string {
  return name
    .split(" ")
    .map((word, index) =>
      index > 0 && SMALL_WORDS.has(word)
        ? word
        : `${word.charAt(0).toUpperCase()}${word.slice(1)}`,
    )
    .join(" ");
}

function controlledPersonId(world: World): EntityId | null {
  return world.control.kind === "person" ? world.control.personId : null;
}

/**
 * One member of one House files a bill on an issue they have taken up.
 * Unchanged when Congress is not seated, when nobody in the chamber can file
 * (a Senate full of members whose only issues are taxes, which must start in
 * the House), or when this intake already ran.
 */
export function fileCongressBill(
  world: World,
  input: {
    readonly chamberKey: "house" | "senate";
    readonly intakeKey: string;
  },
): World {
  const seated = seatedCongressChamber(world, input.chamberKey);
  if (!seated) return world;
  const player = controlledPersonId(world);
  const rng = new SeededRng(world.seed).fork(
    `${CONGRESS_LAWMAKING_VERSION}:${input.intakeKey}:${input.chamberKey}`,
  );
  const candidates = seated.body.members.filter(
    (member) => member.personId && member.personId !== player,
  );
  const chamber = chamberByKey(US_CONGRESS_RULE_PACK, input.chamberKey);
  // Draw sponsors until one has an issue this House may start a bill on.
  const order = [...candidates];
  let sponsor: SeatedMember | null = null;
  let issue: FederalIssue | null = null;
  while (order.length > 0 && !issue) {
    const next = order.splice(rng.integer(0, order.length), 1)[0]!;
    const fileable = memberPriorityIssues(world, next.personId!).filter(
      (candidate) =>
        subjectClassFor(candidate) !== "revenue" ||
        input.chamberKey === "house",
    );
    if (fileable.length > 0) {
      sponsor = next;
      issue = rng.fork("issue").pick(fileable);
    }
  }
  if (!sponsor || !issue) return world;

  const stableKey = `${CONGRESS_LAWMAKING_VERSION}:${issue.key}:${input.intakeKey}:${input.chamberKey}`;
  if (
    (world.history.legislativeMeasures ?? []).some(
      (measure) => measure.stableKey === stableKey,
    )
  )
    return world;

  let next = ensureNationalElectionJurisdiction(world);
  const jurisdictionId = NATIONAL_ELECTION_JURISDICTION.id;
  const year = world.currentDate.slice(0, 4);
  const designation = nextMeasureDesignation(next, {
    jurisdictionId,
    originChamber: chamber,
  });
  next = introduceMeasure(next, {
    stableKey,
    jurisdictionId,
    rulePackId: US_CONGRESS_PACK_ID,
    designation,
    shortTitle: `${titleCase(issue.name)} Act of ${year}`,
    summary: `A bill on ${issue.name.toLowerCase()}, filed by ${sponsor.name}. What it would change is not written yet: the game does not yet model what a federal law on this issue does.`,
    origin: "member-introduction",
    subjectClass: subjectClassFor(issue),
    sponsorPersonId: sponsor.personId,
    originChamberKey: input.chamberKey,
  });
  const measure = next.history.legislativeMeasures!.at(-1)!;
  next = recordWorldEvent(next, {
    stableKey: `${stableKey}:motive`,
    type: SPONSOR_MOTIVE_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId,
    involvedEntityIds: [measure.id, sponsor.personId!].sort(),
    participants: [
      {
        personId: sponsor.personId!,
        role: "agency:sponsor",
        detail: `Sponsor of ${designation}`,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      CONGRESS_LAWMAKING_VERSION,
      `issue:${issue.key}`,
      "motive:priority-issue",
    ],
    summary: `${sponsor.name} filed ${designation} on ${issue.name.toLowerCase()}, one of the issues they have taken up in Congress.`,
    context: emptyContext(),
  });
  next = gatherCosponsors(
    next,
    measure,
    sponsor,
    issue,
    seated.body.members,
    rng,
  );
  return scheduleInstitutionStep(next, measure.id);
}

function gatherCosponsors(
  world: World,
  measure: LegislativeMeasureRecord,
  sponsor: SeatedMember,
  issue: FederalIssue,
  members: readonly SeatedMember[],
  rng: SeededRng,
): World {
  const player = controlledPersonId(world);
  const joining = members.filter((member) => {
    if (
      !member.personId ||
      member.personId === sponsor.personId ||
      member.personId === player
    )
      return false;
    if (
      !memberPriorityIssues(world, member.personId).some(
        (candidate) => candidate.key === issue.key,
      )
    )
      return false;
    if (member.partyKey && member.partyKey === sponsor.partyKey) return true;
    return (
      rng
        .fork(`cosponsor:${member.personId}`)
        .integer(0, CONGRESS_LAWMAKING_PROFILE.crossPartyCosponsorOneIn) === 0
    );
  });
  if (joining.length === 0) return world;
  return recordWorldEvent(world, {
    stableKey: `${measure.stableKey}:cosponsors`,
    type: COSPONSOR_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: measure.jurisdictionId,
    involvedEntityIds: [
      measure.id,
      ...joining.map((member) => member.personId!),
    ].sort(),
    participants: joining.map((member) => ({
      personId: member.personId!,
      role: "agency:cosponsor",
      detail: `Cosponsor of ${measure.designation}`,
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: [CONGRESS_LAWMAKING_VERSION, `issue:${issue.key}`],
    summary: `${joining.length === 1 ? "One member" : `${joining.length} members`} who also work on ${issue.name.toLowerCase()} signed on to ${measure.designation}: ${joining.map((member) => member.name).join(", ")}.`,
    context: emptyContext(),
  });
}

/* ------------------------------------------------------------------ *
 * The President's desk
 * ------------------------------------------------------------------ */

function partyKeyOf(world: World, personId: EntityId): string | null {
  const organizationId = publicPartyAffiliation(world, personId);
  return organizationId
    ? (nationalPartyKeys(world).get(organizationId) ?? null)
    : null;
}

/**
 * What a non-player President does with a bill.
 *
 * PLACEHOLDER until research question how-congress-moves-bills is
 * answered. The President signs a bill that carries the name of a member of
 * their own party. Otherwise they veto it when most of their own party's
 * members who voted on it in either House voted no, and sign it when their
 * party did not object.
 */
export function presidentialDecision(
  world: World,
  measure: LegislativeMeasureRecord,
  presidentPersonId: EntityId,
): { readonly action: "signed" | "vetoed"; readonly rationale: string } {
  const party = partyKeyOf(world, presidentPersonId);
  const backers = [
    ...(measure.sponsorPersonId ? [measure.sponsorPersonId] : []),
    ...measureCosponsors(world, measure.id),
  ];
  if (
    party &&
    backers.some((personId) => partyKeyOf(world, personId) === party)
  )
    return {
      action: "signed",
      rationale:
        "The bill carries the name of a member of the President's party.",
    };
  if (party) {
    const sameParty = new Set<EntityId>();
    for (const chamberKey of ["house", "senate"]) {
      for (const member of seatedCongressChamber(world, chamberKey)?.body
        .members ?? [])
        if (member.personId && member.partyKey === party)
          sameParty.add(member.personId);
    }
    for (const vote of measureVotes(world, measure.id)) {
      if (vote.purpose !== "floor-stage") continue;
      let yea = 0;
      let nay = 0;
      for (const entry of vote.dispositions) {
        if (!entry.personId || !sameParty.has(entry.personId)) continue;
        if (entry.disposition === "yea") yea += 1;
        if (entry.disposition === "nay") nay += 1;
      }
      if (nay > yea)
        return {
          action: "vetoed",
          rationale:
            "Most of the President's own party in Congress voted against the bill.",
        };
    }
  }
  return {
    action: "signed",
    rationale: "The President's party raised no objection to the bill.",
  };
}

/**
 * A Congress bill on the President's desk. A non-player President decides it
 * on the day it arrives. A player President's desk is not built yet, so the
 * bill waits there; with no President recorded at all, it waits too, and
 * nothing is invented.
 */
export function presidentDesk(
  world: World,
  measure: LegislativeMeasureRecord,
): World {
  if (measurePosition(world, measure.id).phase !== "awaiting-executive")
    return world;
  const president = currentPresidentOf(world);
  if (!president) return world;
  if (president.personId === controlledPersonId(world)) return world;
  const decision = presidentialDecision(world, measure, president.personId);
  return scheduleInstitutionStep(
    recordGovernorDecisionOnMeasure(
      world,
      measure.id,
      decision.action,
      decision.rationale,
    ),
    measure.id,
  );
}

/* ------------------------------------------------------------------ *
 * Calendar
 * ------------------------------------------------------------------ */

function nextIntakeDate(after: IsoDate): IsoDate {
  const year = Number(after.slice(0, 4));
  const month = Number(after.slice(5, 7));
  const day = String(CONGRESS_LAWMAKING_PROFILE.intakeDayOfMonth).padStart(
    2,
    "0",
  );
  const thisMonth = makeIsoDate(
    `${year}-${String(month).padStart(2, "0")}-${day}`,
  );
  if (thisMonth > after) return thisMonth;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return makeIsoDate(
    `${nextYear}-${String(nextMonth).padStart(2, "0")}-${day}`,
  );
}

function scheduleNextIntake(world: World): World {
  const dueAt = nextIntakeDate(world.currentDate);
  const stableKey = `${CONGRESS_LAWMAKING_VERSION}:intake:${dueAt}`;
  if (world.history.futureDueItems.some((due) => due.stableKey === stableKey))
    return world;
  const next = ensureNationalElectionJurisdiction(world);
  return scheduleFutureDueItem(next, {
    stableKey,
    dueAt,
    transitionKey: CONGRESS_INTAKE_TRANSITION,
    entityIds: [NATIONAL_ELECTION_JURISDICTION.id],
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    provenance: {
      kind: "authored",
      note: `${CONGRESS_LAWMAKING_PROFILE.id}: members of Congress file bills on the first of the month. The game's calendar, not Congress's.`,
    },
  });
}

/**
 * Called whenever the canonical clock moves. Keeps Congress's next filing day
 * on the calendar once the save has a seated Congress. Only writes a future
 * due item.
 */
export function applyCongressLawmaking(before: IsoDate, world: World): World {
  if (world.currentDate <= before) return world;
  if (!livingWorldEstablished(world)) return world;
  return scheduleNextIntake(world);
}

export function congressIntakeHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  let next = world;
  for (const chamberKey of ["house", "senate"] as const)
    next = fileCongressBill(next, { chamberKey, intakeKey: due.dueAt });
  next = scheduleNextIntake(next);
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context: "Members of Congress filed their bills.",
    outcomeEventId: null,
  };
}

/**
 * A sitting of Congress: every open federal bill takes its next step, in the
 * order it was filed, and the next sitting goes on the calendar while any bill
 * is still open.
 */
export function congressSittingHandler(
  world: World,
): FutureTransitionHandlerResult {
  let next = world;
  let steps = 0;
  const open = (next.history.legislativeMeasures ?? []).filter(
    (measure) =>
      isCongressMeasure(measure) && !measurePosition(next, measure.id).terminal,
  );
  withSittingSeating(world, () => {
    for (const measure of open) {
      const result = applyInstitutionStep(next, measure.id, (w, m) =>
        presidentDesk(w, m),
      );
      if (result.kind === "applied" || result.kind === "executive") {
        next = result.world;
        steps += 1;
      } else if (result.kind === "wait-until" && result.world) {
        next = result.world;
      }
    }
  });
  const stillOpen = (next.history.legislativeMeasures ?? []).some(
    (measure) =>
      isCongressMeasure(measure) && !measurePosition(next, measure.id).terminal,
  );
  if (stillOpen) next = scheduleCongressSitting(next);
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context: `Congress sat and took ${steps} step${steps === 1 ? "" : "s"} on its bills.`,
    outcomeEventId: null,
  };
}

export const CONGRESS_LAWMAKING_HANDLERS = [
  [CONGRESS_INTAKE_TRANSITION, congressIntakeHandler],
  [CONGRESS_SITTING_TRANSITION, congressSittingHandler],
] as const;

function emptyContext() {
  return {
    location: null,
    socialContext: null,
    pressure: null,
    choice: null,
    motivation: null,
    immediateReaction: null,
  };
}
