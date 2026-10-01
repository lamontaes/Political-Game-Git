import { smallWorld } from "./small-world";
import { enactThroughDesk } from "./enact-through-desk";
import { pay } from "./public-program-fixture";
import { addDays } from "../../src/simulation/dates";
import { introduceMeasure } from "../../src/simulation/legislation";
import { legislativePackForJurisdiction } from "../../src/simulation/legislative-institutions";
import {
  authoredScenarioSeatCount,
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type LegislativeProcedureContext,
} from "../../src/simulation/legislation-scenarios";
import { createOrganization } from "../../src/simulation/life";
import { createResourcePosition, money } from "../../src/simulation/resources";
import {
  ensureTaxPublicAccount,
  publicTaxAccountForJurisdiction,
} from "../../src/simulation/tax-policy";
import {
  commitPublicProgram,
  recordProgramAppropriation,
} from "../../src/simulation/governing/public-program";
import { currentStateExecutiveHolders } from "../../src/simulation/nationwide-world/state-executives";
import {
  playerRequiredWorkIds,
  releasePlayerRequiredWork,
} from "../../src/simulation/time-work";
import { recordWorldEvent } from "../../src/simulation/world";
export const RESIDENT_TRANSIT_QUESTION =
  "us-policy-positions:transportation-infrastructure.additional-rural-transit-service-hours";
const QUESTION = RESIDENT_TRANSIT_QUESTION;
const BASIS = {
  kind: "authored" as const,
  note: "Explicit resident-trip test authority and operating contract; not a researched cost or a natural vote.",
};

export function residentTransitServiceFixture(
  PLACE: string,
  SEED: string,
  purpose: "operating" | "maintenance" = "operating",
) {
  const f = smallWorld({
    place: PLACE,
    date: "2026-01-05",
    people: 3,
    seed: SEED,
    offices: ["governor"],
    laws: [QUESTION],
  });
  const pack = legislativePackForJurisdiction(f.stateJurisdictionId);
  if (!pack)
    throw new Error(
      `No admitted legislative procedure for ${PLACE}; no service law was authored.`,
    );
  let world = introduceMeasure(f.world, {
    stableKey: `${SEED}:service-law`,
    jurisdictionId: f.stateJurisdictionId,
    rulePackId: pack.packId,
    designation: "Resident trip test bill",
    shortTitle: "Fund recorded rural trips",
    summary: BASIS.note,
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: f.personId,
    propositionIds: [f.propositionIds[QUESTION]!],
    propositionAnswers: [
      { propositionId: f.propositionIds[QUESTION]!, answer: "yes" },
    ],
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  const votePlan: Record<string, { yea: number }> = {};
  for (const chamber of pack.chambers) {
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committee.appointedMembers,
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: authoredScenarioSeatCount(pack, chamber.chamberKey),
      };
  }
  const context: LegislativeProcedureContext = {
    pack,
    measureId,
    committeeMemberCount: null,
    votePlan,
    bodies: pack.chambers.map((c) =>
      seatBodyForPack(
        c.chamberKey,
        c.name,
        authoredScenarioSeatCount(pack, c.chamberKey),
        [],
        false,
      ),
    ),
    governorAction: null,
    governorRationale: BASIS.note,
  };
  world = enactThroughDesk(world, measureId, { context });
  // The shared desk helper restores control while the governor's required
  // follow-through remains open. Record an explicit fixture handoff through
  // the existing work writer rather than discard or rewrite those records.
  const signer = currentStateExecutiveHolders(world).find(
    (holder) => holder.stateUsps === f.stateUsps,
  )!;
  world = recordWorldEvent(
    { ...world, control: { kind: "person", personId: signer.personId } },
    {
      stableKey: `${SEED}:desk-handoff`,
      type: "test.control-moved",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: f.stateJurisdictionId,
      involvedEntityIds: [
        signer.personId,
        f.personId,
        ...playerRequiredWorkIds(world, signer.personId),
      ],
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: [],
      summary:
        "The controlled fixture returns from the actual governor desk to its resident.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    },
  );
  world = releasePlayerRequiredWork(world, {
    personId: signer.personId,
    stableKeyPrefix: `${SEED}:desk-work-released`,
    outcomeEventId: world.history.events.at(-1)!.id,
  });
  world = { ...world, control: f.world.control };
  world = ensureTaxPublicAccount(world, f.stateJurisdictionId);
  const account = publicTaxAccountForJurisdiction(
    world,
    f.stateJurisdictionId,
  )!;
  const organization = (key: string, name: string, opening: number) => {
    world = createOrganization(world, {
      stableKey: `${SEED}:${key}`,
      formedAt: world.currentDate,
      provenance: BASIS,
      initialProfile: {
        name,
        classification: "sector:private",
        locationJurisdictionId: f.stateJurisdictionId,
      },
    });
    const id = world.history.organizations.at(-1)!.id;
    world = createResourcePosition(world, {
      stableKey: `${SEED}:${key}:cash`,
      owner: { kind: "organization", organizationId: id },
      openedAt: world.currentDate,
      openingBalance: money(opening, "USD"),
      provenance: BASIS,
    });
    return id;
  };
  const payer = organization("payer", "Authored receipts payer", 20000);
  const operator = organization(
    "operator",
    "Authored resident transit operator",
    0,
  );
  world = pay(
    world,
    `${SEED}:public-receipt`,
    payer,
    account.organizationId,
    20000,
  );
  const appropriation = recordProgramAppropriation(world, {
    programKey: "transit:bus-service",
    edition: "resident-trip",
    jurisdictionId: f.stateJurisdictionId,
    accountOrganizationId: account.organizationId,
    sourceMeasureId: measureId,
    amount: money(20000, "USD"),
    availableFrom: world.currentDate,
    availableThrough: addDays(world.currentDate, 30),
    basis: { kind: "authored-fixture", note: BASIS.note },
  });
  const governor = currentStateExecutiveHolders(appropriation.world).find(
    (h) => h.stateUsps === f.stateUsps,
  )!;
  const committed = commitPublicProgram(appropriation.world, {
    appropriationId: appropriation.id,
    personId: governor.personId,
    office: { kind: "state-executive" },
    recipientOrganizationId: operator,
    alternative: {
      key: "one-operating-payment",
      title: "Authored operating service",
      installments: [{ afterDays: 0, amount: money(20000, "USD"), purpose }],
      deliveryLeadDays: null,
    },
  });
  if (!committed.ok) throw new Error(committed.reason);
  return {
    ...f,
    world: committed.world,
    beforeCommitment: appropriation.world,
    commitmentId: committed.recordId,
    operator,
    account: account.organizationId,
  };
}
