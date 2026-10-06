import {
  stateExecutiveOffice,
  stateExecutiveTenureKeyPrefix,
  STATE_EXECUTIVE_WRITER_VERSION,
} from "../../src/simulation/nationwide-world/state-executives";
import { personName } from "../../src/simulation/people";
import { lifePlaceByJurisdictionId } from "../../src/simulation/life-places";
import { legislativePackForJurisdiction } from "../../src/simulation/legislative-institutions";
import { legislativeRulePackForWorld } from "../../src/simulation/legislative-procedure-world";
import {
  compileBillDraft,
  draftScope,
} from "../../src/simulation/legislation-drafting";
import { recordDraftLineage } from "../../src/simulation/legislation-draft-lineage";
import {
  introduceMeasure,
  requireMeasure,
} from "../../src/simulation/legislation";
import { recordFiledProvision } from "../../src/simulation/legislative-politics";
import {
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type LegislativeProcedureContext,
} from "../../src/simulation/legislation-scenarios";
import { ensureStateLegislatureOpening } from "../../src/simulation/nationwide-world/state-legislature-opening";
import {
  governorOfficeForJurisdiction,
  governingMatters,
  openTransitionMatters,
} from "../../src/simulation/governing/state-governing";
import { seatedChamberForPack } from "../../src/simulation/governing/chamber-votes";
import { publishLegislativeTransition } from "../../src/presentation/publish-legislative-transition";
import {
  playerRequiredWorkIds,
  releasePlayerRequiredWork,
} from "../../src/simulation/time-work";
import { recordWorldEvent } from "../../src/simulation/world";
import type { EntityId, World } from "../../src/simulation/types";
import { enactThroughDesk } from "./enact-through-desk";

/** Explicit downstream control handoff; it supplies no election win or payment. */
function control(world: World, personId: EntityId, key: string): World {
  const previous =
    world.control.kind === "person" ? world.control.personId : null;
  if (previous === personId) return world;
  const next = recordWorldEvent(world, {
    stableKey: key,
    type: "test.control-moved",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [
      personId,
      ...(previous
        ? [previous, ...playerRequiredWorkIds(world, previous)]
        : []),
    ],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: [],
    summary:
      "Controlled budget comparison fixture moves to an actual recorded officeholder; no election result is supplied.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const released = previous
    ? releasePlayerRequiredWork(next, {
        personId: previous,
        stableKeyPrefix: `${key}:released-work`,
        outcomeEventId: next.history.events.at(-1)!.id,
      })
    : next;
  return { ...released, control: { kind: "person", personId } };
}

export function recordedGovernorBudgetPreview(
  world: World,
  seed: string,
): World {
  if (world.control.kind !== "person")
    throw new Error("A new controlled life is required.");
  const person = world.people[world.control.personId]!;
  const stateKey = lifePlaceByJurisdictionId(
    person.homeJurisdictionId,
  )?.stateJurisdictionKey;
  if (!stateKey)
    throw new Error("The new life's actual state is not recorded.");
  const office = governorOfficeForJurisdiction(world, stateKey);
  if (!office) throw new Error("No actual governor is recorded for this life.");
  let next = ensureStateLegislatureOpening(world, person.id, stateKey.slice(3));
  if (person.id !== office.holderPersonId) {
    const identity = stateExecutiveOffice(office.stateUsps);
    if (!identity || !office.organizationId)
      throw new Error("The actual executive office identity is required.");
    // An explicitly authored seat for the original generated life. Preserve
    // its household, home, age and identity; supply no election or resignation.
    // The existing tenure reader consumes this canonical World event.
    next = recordWorldEvent(next, {
      stableKey: `${stateExecutiveTenureKeyPrefix(identity)}${next.currentDate}:controlled-budget-preview:${seed}`,
      type: "world.office-tenure",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
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
      summary: `${personName(person)} holds ${office.title} in this explicitly authored desk fixture; no election result is supplied.`,
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
  const controlled = governorOfficeForJurisdiction(next, stateKey);
  if (controlled?.holderPersonId !== person.id)
    throw new Error(
      "The canonical tenure reader did not admit the authored desk seat.",
    );
  return openTransitionMatters(next, office.officeKey);
}

/** A fictional, explicitly supplied $3m bill and unanimous chamber votes,
 * carried through the existing compiler, procedure, actual signature and law
 * outcome writers. No treasury opening, funding, cash transfer or NPC vote
 * motivation is supplied. This is not a natural legislative journey. */
export function enactedBudgetComparisonPreview(
  world: World,
  seed: string,
): World {
  const requestMatter = governingMatters(world).find(
    (matter) =>
      matter.family === "budget" &&
      matter.decision?.tags.includes("choice:budget:request-dollars"),
  );
  if (!requestMatter)
    throw new Error("The player's dollar request must already be saved.");
  const governorId = requestMatter.holderPersonId;
  const jurisdictionId = requestMatter.openedEvent.jurisdictionId!;
  const institution = legislativePackForJurisdiction(jurisdictionId);
  if (!institution) throw new Error("The actual legislature is not compiled.");
  const pack = legislativeRulePackForWorld(world, institution.packId);
  const bodies = pack.chambers.map((chamber) => {
    const seated = seatedChamberForPack(
      world,
      pack.packId,
      chamber.chamberKey,
      chamber.name,
    );
    if (!seated)
      throw new Error("An actual chamber is required; no synthetic seats.");
    return seated.body;
  });
  const chamber = pack.chambers.find((row) => row.introductionAllowed)!;
  const sponsor = bodies
    .find((body) => body.chamberKey === chamber.chamberKey)!
    .members.find((member) => member.personId)!;
  if (!sponsor?.personId)
    throw new Error("An actual legislative sponsor is required.");
  let next = control(world, sponsor.personId, `${seed}:sponsor-control`);
  const draft = compileBillDraft({
    familyKey: "transit-access",
    variantKey: "enrollment-fare-relief",
    parameterValues: {
      "support-limit": {
        kind: "money",
        minorUnits: 3_000_000_00,
        currency: "USD",
      },
      "pilot-term": { kind: "duration-years", years: 1 },
    },
    scenarioKey: `institution:${pack.packId}`,
    jurisdictionId,
    rulePackId: pack.packId,
    designation: "Budget comparison 1",
    filedOn: next.currentDate,
  });
  const propositionIds = draft.propositionKeys
    .map(
      (key) =>
        Object.values(next.policyCatalog.propositions).find(
          (row) => row.stableKey === key,
        )?.id,
    )
    .filter((id): id is EntityId => id !== undefined);
  next = introduceMeasure(next, {
    stableKey: `${seed}:comparison-bill`,
    jurisdictionId,
    rulePackId: pack.packId,
    designation: draft.designation,
    shortTitle: draft.shortTitle,
    summary: draft.summary,
    origin: "member-introduction",
    subjectClass: draft.subjectClass,
    originChamberKey: chamber.chamberKey,
    sponsorPersonId: sponsor.personId,
    propositionIds,
    propositionAnswers: propositionIds.map((propositionId) => ({
      propositionId,
      answer: "yes",
    })),
  });
  const measureId = next.history.legislativeMeasures!.at(-1)!.id;
  for (const clause of draft.clauses)
    next = recordFiledProvision(next, {
      stableKey: `${seed}:clause:${clause.provisionKey}`,
      measureId,
      provisionKey: clause.provisionKey,
      sectionNumber: clause.sectionNumber,
      heading: clause.heading,
      text: clause.text,
      beneficiary: clause.beneficiary,
      applicationScope: draftScope(draft),
      fiscalExposureLabel: clause.fiscalExposureLabel,
      fiscalExposureMinorUnits: clause.fiscalExposureMinorUnits,
      fiscalPeriod: clause.fiscalPeriod,
      operativeEffect: clause.operativeEffect,
    });
  next = recordDraftLineage(next, {
    stableKey: `${seed}:draft`,
    measureId,
    familyKey: draft.familyKey,
    familyVersion: draft.familyVersion,
    variantKey: draft.variantKey,
    compiledAt: next.currentDate,
    parameterValues: draft.parameterValues,
    provenanceNote:
      "Authored $3m comparison bill; supplied votes isolate requested-versus-enacted amounts, not natural NPC bargaining.",
  });
  const votePlan: Record<string, { yea: number }> = {};
  for (const row of pack.chambers) {
    const body = bodies.find((entry) => entry.chamberKey === row.chamberKey)!;
    for (const committee of row.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: Math.min(body.members.length, committee.appointedMembers),
      };
    for (const stage of row.floorStages)
      votePlan[votePlanKeyForFloor(row.chamberKey, stage.stageKey)] = {
        yea: body.members.length,
      };
  }
  const context: LegislativeProcedureContext = {
    pack,
    measureId,
    bodies,
    committeeMemberCount: null,
    votePlan,
    governorAction: null,
    governorRationale:
      "Only the actual governor's shared desk supplies the signature.",
  };
  const enacted = enactThroughDesk(next, measureId, { context });
  // The generic test helper restores sponsor control after signing. The
  // signature may open required implementation work for its actual governor;
  // record the return handoff before publishing those canonical consequences.
  const returned = control(enacted, governorId, `${seed}:return-to-governor`);
  const published = publishLegislativeTransition(next, returned);
  requireMeasure(published, measureId);
  return published;
}
