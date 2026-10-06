import { applyLegislativeStep } from "../../src/presentation/legislation-session";
import { publishLegislativeTransition } from "../../src/presentation/publish-legislative-transition";
import { lifePlaceByJurisdictionId } from "../../src/simulation/life-places";
import { legislativePackForJurisdiction } from "../../src/simulation/legislative-institutions";
import { legislativeRulePackForWorld } from "../../src/simulation/legislative-procedure-world";
import {
  availableMeasureSteps,
  attemptVetoOverride,
  introduceMeasure,
  measurePosition,
  requireMeasure,
} from "../../src/simulation/legislation";
import {
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type LegislativeProcedureContext,
} from "../../src/simulation/legislation-scenarios";
import { ensureStateLegislatureOpening } from "../../src/simulation/nationwide-world/state-legislature-opening";
import {
  stateExecutiveOffice,
  stateExecutiveTenureKeyPrefix,
  STATE_EXECUTIVE_WRITER_VERSION,
} from "../../src/simulation/nationwide-world/state-executives";
import {
  governorOfficeForJurisdiction,
  executiveDesk,
  governingMatters,
  openTransitionMatters,
} from "../../src/simulation/governing/state-governing";
import { legislativeBlueprintForMeasure } from "../../src/simulation/governing/legislative-clock";
import { seatedChamberForPack } from "../../src/simulation/governing/chamber-votes";
import { personName } from "../../src/simulation/people";
import { recordWorldEvent } from "../../src/simulation/world";
import type { World } from "../../src/simulation/types";

/** A new life's original person receives an explicitly authored downstream
 * seat. No election, treasury, age, household or NPC motivation is rewritten. */
export function recordedGovernorVetoPreview(input: World, seed: string) {
  if (input.control.kind !== "person")
    throw new Error("A controlled new life is required.");
  const person = input.people[input.control.personId]!;
  const stateKey = lifePlaceByJurisdictionId(
    person.homeJurisdictionId,
  )?.stateJurisdictionKey;
  if (!stateKey) throw new Error("The new life has no recorded state.");
  const office = governorOfficeForJurisdiction(input, stateKey);
  if (!office?.organizationId)
    throw new Error("The actual governor office is required.");
  const identity = stateExecutiveOffice(office.stateUsps);
  if (!identity) throw new Error("The actual office identity is required.");
  let world = ensureStateLegislatureOpening(input, person.id, office.stateUsps);
  world = recordWorldEvent(world, {
    stableKey: `${stateExecutiveTenureKeyPrefix(identity)}${world.currentDate}:controlled-veto-preview:${seed}`,
    type: "world.office-tenure",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: office.jurisdictionId,
    involvedEntityIds: [
      person.id,
      office.organizationId,
      office.holderPersonId,
    ],
    participants: [
      { personId: person.id, role: "focus:subject", detail: office.title },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      STATE_EXECUTIVE_WRITER_VERSION,
      `office:${office.officeKey}`,
      `state:${office.stateUsps}`,
      "provenance:authored-controlled-desk-seat",
      `source-event:${office.termId}`,
      ...(office.termEndsAt
        ? [`term-end:${office.termEndsAt}`]
        : ["term-end:unknown"]),
    ],
    summary: `${personName(person)} holds ${office.title} in this authored veto desk fixture; no election result is supplied.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  if (
    governorOfficeForJurisdiction(world, stateKey)?.holderPersonId !== person.id
  )
    throw new Error("The canonical tenure reader refused the authored seat.");
  world = openTransitionMatters(world, office.officeKey);
  const institution = legislativePackForJurisdiction(office.jurisdictionId);
  if (!institution) throw new Error("The actual legislature is required.");
  const pack = legislativeRulePackForWorld(world, institution.packId);
  const bodies = pack.chambers.map((chamber) => {
    const seated = seatedChamberForPack(
      world,
      pack.packId,
      chamber.chamberKey,
      chamber.name,
    );
    if (!seated) throw new Error("An actual seated chamber is required.");
    return seated.body;
  });
  const origin = pack.chambers.find((chamber) => chamber.introductionAllowed)!;
  const sponsor = bodies
    .find((body) => body.chamberKey === origin.chamberKey)!
    .members.find((member) => member.personId)!;
  world = introduceMeasure(world, {
    stableKey: `${seed}:veto-bill`,
    jurisdictionId: office.jurisdictionId,
    rulePackId: pack.packId,
    designation: "Desk proof 1",
    shortTitle: "Public service reporting",
    summary:
      "A fictional bill for the supplied-roll-call executive desk proof.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: origin.chamberKey,
    sponsorPersonId: sponsor.personId,
    propositionIds: [],
  });
  const measure = world.history.legislativeMeasures!.at(-1)!;
  const votePlan: Record<string, { yea: number }> = {};
  for (const chamber of pack.chambers) {
    const body = bodies.find(
      (entry) => entry.chamberKey === chamber.chamberKey,
    )!;
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: Math.min(body.members.length, committee.appointedMembers),
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: body.members.length,
      };
  }
  const context: LegislativeProcedureContext = {
    pack,
    measureId: measure.id,
    bodies,
    committeeMemberCount: null,
    votePlan,
    governorAction: null,
    governorRationale:
      "Only the player's bound desk supplies the executive disposition.",
  };
  const before = world;
  for (let guard = 0; guard < 60; guard += 1) {
    const phase = measurePosition(world, measure.id).phase;
    if (phase === "awaiting-executive") break;
    const step = availableMeasureSteps(world, measure.id).find(
      (key) => key !== "offer-amendment",
    );
    if (!step) throw new Error(`No canonical legislative step at ${phase}.`);
    world = applyLegislativeStep(context, world, step).world;
  }
  if (measurePosition(world, measure.id).phase !== "awaiting-executive")
    throw new Error("The bill did not reach the executive.");
  world = publishLegislativeTransition(before, world);
  world = executiveDesk(
    world,
    requireMeasure(world, measure.id),
    legislativeBlueprintForMeasure(world, measure),
  );
  if (
    !governingMatters(world, office.officeKey).some(
      (matter) => matter.measureId === measure.id && matter.status === "open",
    )
  )
    throw new Error("The actual bill matter was not opened.");
  return world;
}

/** Supplied actual member dispositions, not the desk's override forecast. */
export function recordedOverridePreview(world: World, seed: string): World {
  const measure = world.history.legislativeMeasures?.find(
    (entry) => entry.stableKey === `${seed}:veto-bill`,
  );
  if (
    !measure ||
    measurePosition(world, measure.id).phase !== "awaiting-override"
  )
    throw new Error("A recorded player veto is required first.");
  const pack = legislativeRulePackForWorld(world, measure.rulePackId);
  if (pack.executive.override.kind !== "each-chamber")
    throw new Error("This proof requires the recorded per-chamber rule.");
  return attemptVetoOverride(world, {
    stableKey: `${seed}:override`,
    measureId: measure.id,
    forums: pack.chambers.map((chamber) => {
      const seated = seatedChamberForPack(
        world,
        pack.packId,
        chamber.chamberKey,
        chamber.name,
      );
      if (!seated) throw new Error("The actual override chamber is required.");
      return {
        forumKey: chamber.chamberKey,
        electedMembers: seated.body.members.length,
        dispositions: seated.body.members.map((member) => ({
          memberKey: member.memberKey,
          personId: member.personId,
          disposition: "yea" as const,
        })),
      };
    }),
    rationale:
      "Unanimous supplied roll calls isolate the actual override result, not NPC bargaining.",
    provenance: {
      method: "authored-fixture",
      note: "Supplied actual seated-member override votes for the executive desk proof.",
      sourceEntityIds: [measure.id],
    },
  });
}
