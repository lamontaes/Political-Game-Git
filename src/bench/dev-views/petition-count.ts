/**
 * Dev mode's "Petition count": for each of the player's campaigns with a petition, the whole count
 * read from the records and changing none: what the law asks, what a campaign gathers, who signed
 * and how (a door, an event, the circle), what paid circulators brought from outside the town, who
 * is on the campaign, the gap, and why it is short or was struck (the days left against what a
 * canvass shift a day can add, the fund if any, the clerk's check), and what the petition scene
 * was told (whether paid circulators were offered, whether the campaign held money, whether that
 * money covers the gap). Shown on the Calendar (slot "calendar").
 */
import type { DevView } from "../dev-views";
import { coreAPI } from "../../core2/state";
import {
  PETITION_SHORT_EVENT,
  campaignFor,
  circulatorsCanWork,
  freeMinor,
  petitionShortReading,
  signaturesToGather,
} from "../../core2/modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  petitionOf,
  petitionSigners,
  type FilingRow,
} from "../../core2/modules/elections";
import type { CoreState } from "../../core2/types";

/** One campaign's petition, read from the records. */
export function petitionCountOf(core: CoreState, filingId: string) {
  const api = coreAPI(core);
  const petition = petitionOf(api, filingId);
  if (!petition) throw new Error("That filing has no petition.");
  const campaign = campaignFor(api, filingId);
  const signers = petitionSigners(api, filingId);
  const via = { door: 0, event: 0, circle: 0 };
  for (const signer of signers) via[signer.via] += 1;
  const outside = Object.values(petition.outsideSigned ?? {}).reduce(
    (sum, count) => sum + count,
    0,
  );
  const reading = petitionShortReading(api, filingId, 0);
  const gathers = signaturesToGather(petition.needed);
  const told = core.durableLog.get(
    `${PETITION_SHORT_EVENT}:${filingId}` as never,
  );
  return {
    filingId,
    needed: petition.needed,
    gathers,
    signed: petition.signed,
    inTown: signers.length,
    outsideTown: outside,
    byDoor: via.door,
    byEvent: via.event,
    byCircle: via.circle,
    signers: signers.map((signer) => ({
      personId: signer.personId,
      on: signer.on,
      via: signer.via,
    })),
    staffIds: [...campaign.staffIds],
    volunteerIds: [...campaign.volunteerIds],
    doorsKnocked: campaign.doorsKnockedCount ?? 0,
    gap: Math.max(0, petition.needed - petition.signed),
    gapToGathers: Math.max(0, gathers - petition.signed),
    daysLeft: reading ? reading.daysLeft : null,
    canAddByCanvass: reading ? Number(reading.canAdd.toFixed(1)) : null,
    circulatorsCanWork: circulatorsCanWork(api, filingId),
    circulatorFundMinor: campaign.circulatorFundMinor ?? 0,
    freeMinor: freeMinor(campaign),
    // What the scene was told: offered, money held, and whether the money covers the gap.
    told: told
      ? {
          circulators: told.facts?.circulators === "yes",
          money: told.facts?.money === "yes",
          coversPart: told.facts?.covers === "part",
        }
      : null,
    check: petition.check
      ? {
          on: petition.check.on,
          valid: petition.check.valid,
          struck: petition.check.struckIds.length,
        }
      : null,
  };
}

/** The player's campaigns that have a petition. */
export function petitionCounts(core: CoreState) {
  if (!core.modules.has(ELECTIONS_MODULE_ID) || !core.playerId) return [];
  const api = coreAPI(core);
  return (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .rows() as unknown as FilingRow[]
  )
    .filter((f) => f.personId === core.playerId && petitionOf(api, f.id))
    .map((f) => petitionCountOf(core, f.id));
}

const view: DevView = {
  name: "petition-count",
  client: "petition-count.mjs",
  labels: {
    title: "Petition count",
    signed: "Signed",
    inTown: "In town",
    outside: "Outside town",
    doors: "At doors",
    gap: "Short by",
    daysLeft: "Days left",
    fund: "Set aside for paid circulators",
    offered: "Paying people to carry it was offered",
    noMoney: "Paying people was possible, no money to do it",
    part: "The money buys part of the gap",
    checked: "Clerk counted",
  },
  routes: {
    "GET petition-count": ({ mode }) => petitionCounts(mode.core),
  },
};
export default view;
