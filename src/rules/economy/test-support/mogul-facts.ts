/** Raw campaign/actor/geography/press/authority receipts and common producer replies. Own mogul money, selection, windows and consideration math stay on the shelf. */
import * as campaigns from "../../../simulation/campaign-queries";
import { campaignCompliancePackFor } from "../../../simulation/campaign-compliance";
import { assessContribution } from "../../../simulation/campaign-compliance-rules";
import { isPersonAliveAt } from "../../../simulation/vitality-integrity";
import { publicPositionAtDate } from "../../../simulation/queries";
import { publicAdverseFindingsAgainst } from "../../../simulation/press/findings";
import { stateOfJurisdiction } from "../../../simulation/press/outlets";
import { procedureForSubject } from "../../../simulation/press/matters";
import type {
  MogulFacts,
  StructuredKind,
  MogulReceiptMap,
} from "../mogul-offers";
import type { World } from "../../../simulation/types";
export interface CommonMogulReply {
  readonly kind: StructuredKind;
  readonly value: unknown;
}
export function mogulFacts(world: World, reply?: CommonMogulReply): MogulFacts {
  return {
    id: world.id,
    seed: world.seed,
    currentDate: world.currentDate,
    onDate: world.currentDate,
    records: world.history,
    people: world.people,
    personOrder: world.personOrder,
    control: world.control,
    policyCatalog: world.policyCatalog,
    upstream: {
      campaigns: campaigns.campaigns(world),
      opponents: campaigns.campaignOpponentRecords(world),
      active: (id) => campaigns.activeCampaignForCandidate(world, id),
      pack: (id) => campaignCompliancePackFor(world, id),
      contribution: (input) => assessContribution(world, input),
      alive: (id, cutoff) => isPersonAliveAt(world, id, cutoff),
      state: (id) => stateOfJurisdiction(world, id),
      stance: (id, q, date) => publicPositionAtDate(world, id, q, date),
      findings: (id) => publicAdverseFindingsAgainst(world, id),
      procedure: (id, campaign) => procedureForSubject(world, id, campaign),
    },
    receipt: <K extends StructuredKind>(kind: K): MogulReceiptMap[K] => {
      if (!reply || reply.kind !== kind)
        throw Error("Missing common mogul reply: " + kind);
      if (kind === "evaluateDecision") return reply.value as MogulReceiptMap[K];
      const { world: ignored, ...metadata } = reply.value as { world: World };
      void ignored;
      return { ...metadata, facts: mogulFacts(world) } as MogulReceiptMap[K];
    },
  };
}
