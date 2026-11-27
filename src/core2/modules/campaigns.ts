import { customPolitics, registerElectorate } from "../electorate";
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState } from "../types";
import type { ModuleRow } from "../module-data";
import { townDistrict } from "./offices";
import { districtLean } from "../campaign-views";
import { type Stance } from "../campaign-data";
import { type ContestRow, type FilingRow, worldSwing } from "./elections";
import { answerAskForVote, answerOffer } from "./campaigns-asks";
import {
  campaignFor,
  elections,
  heldSlots,
  rivalFiling,
  save,
  scheduleTurn,
  table,
} from "./campaigns-base";
import type {
  CampaignRow,
  CashJournalSourceSlot,
  EndorsementRow,
} from "./campaigns-base";
import {
  AD_KIND,
  CAMPAIGNS_MODULE_ID,
  DONATION_KIND,
  PURCHASE_KIND,
  townLeans,
} from "./campaigns-constants";
import {
  answerEndorsementAsk,
  answerVolunteerAsk,
} from "./campaigns-endorsements";
import { answerPetitionShort } from "./campaigns-petition-short";
import {
  dropOldFoldedCauses,
  foldClosedRaceCauses,
  foldOldCauses,
} from "./campaigns-polls";
import { rivalWordPassedOn } from "./campaigns-rival-word";
import { campaignWork } from "./campaigns-turn";
import { offersToHelp } from "./campaigns-volunteers";
export {
  doorsKnockedOf,
  knockDoors,
  registerDoorChoice,
  touchImpression,
  townDoorCount,
} from "./campaigns-doors";
export type { DoorVisit } from "./campaigns-doors";
export { publishedUnitPrice, seller, unitPrice } from "./campaigns-work";
export type { Purchase } from "./campaigns-work";
export {
  askToManage,
  askToVolunteer,
  castVolunteer,
  managerReason,
  volunteerLapseReason,
  volunteerReason,
} from "./campaigns-volunteers";
export type { VolunteerAsk } from "./campaigns-volunteers";
export {
  foldRivalWord,
  latestMessageDates,
  rivalWordMoved,
} from "./campaigns-rival-word";
export type { MessageRow } from "./campaigns-rival-word";
export {
  interviewHeldInTown,
  offerReason,
  offerWeight,
  townShareOfRace,
} from "./campaigns-asks";
export {
  canvassHoursFree,
  enlistVolunteer,
  shiftReason,
  shiftShare,
  volunteerShifts,
} from "./campaigns-shifts";
export type { VolunteerShift } from "./campaigns-shifts";
export {
  askCircleToSign,
  askToSign,
  circulatorShift,
  circulatorsCanWork,
  contributionLimit,
  eveningMoneyMinor,
  freeMinor,
  hireCirculators,
  petitionAsksAtDoors,
  registerPetitionRoll,
  signReason,
  signaturesToGather,
} from "./campaigns-petitions";
export {
  answerDonationAsk,
  askForDonation,
  askOutsideDonors,
  askPlayerForMoney,
  contributeOwnMoney,
  donationAnswer,
  donationAsksFor,
  donorReason,
  giftBudget,
  giftOf,
  giftsToCampaign,
  givenInMonth,
  spareAgainstGift,
} from "./campaigns-money";
export type { DonationWhy } from "./campaigns-money";
export {
  donorMeetingHost,
  donorMeetingInvitees,
  eveningReason,
  giveSpeech,
  holdDonorMeeting,
  hostCircle,
  makeStatements,
  reachablePeople,
  statementSpeechId,
  statementSpeechPrefix,
  whoComes,
} from "./campaigns-meetings";
export type { DonorMeetingResult } from "./campaigns-meetings";
export {
  adAudience,
  adTimeForSale,
  buyAdTime,
  registerAdOutlet,
  runAd,
} from "./campaigns-ads";
export {
  askForEndorsement,
  endorsementWeighing,
  endorsementsOf,
  groupPositions,
  organizedGroupsIn,
  outletWeighsRace,
} from "./campaigns-endorsements";
export type { EndorsementWeighing } from "./campaigns-endorsements";
export {
  answerPollReason,
  causeSummariesOf,
  causeSummaryOf,
  causesFor,
  commissionPoll,
  dropOldFoldedCauses,
  foldClosedRaceCauses,
  foldOldCauses,
  pollMargin,
} from "./campaigns-polls";
export type { CauseSummaryRow, CauseSums } from "./campaigns-polls";
export {
  askForSupport,
  campaignRecognition,
  campaignTurn,
  closeRace,
  holdEvent,
  raceReading,
  rentVenue,
  rivalDay,
  sendMail,
  steppedUpOf,
} from "./campaigns-turn";
export type {
  CampaignTurnResult,
  RaceReading,
  RivalDay,
  SteppedUp,
  SteppedUpRow,
} from "./campaigns-turn";
export {
  petitionShiftYield,
  petitionShortReading,
  petitionTeller,
  tellPetitionShort,
} from "./campaigns-petition-short";
export type { PetitionShortReading } from "./campaigns-petition-short";
export {
  CAMPAIGNS_MODULE_ID,
  CAMPAIGN_ACTS,
  CAMPAIGN_STEPPED_UP_EVENT,
  CANVASS_MESSAGE_KIND,
  ENDORSEMENT_ASKED_EVENT,
  PETITION_SHORT_EVENT,
  RIVAL_WORD_EVENT,
  VOLUNTEER_ASKED_EVENT,
  VOLUNTEER_JOINED_EVENT,
  VOLUNTEER_LAPSED_EVENT,
  VOLUNTEER_OFFERED_EVENT,
  VOLUNTEER_SHIFT_EVENT,
} from "./campaigns-constants";
export {
  campaignFor,
  impressionOf,
  parsePlatform,
  pledgeOf,
  pledgesOf,
  rivalFiling,
} from "./campaigns-base";
export type {
  AskRow,
  CampaignAct,
  CampaignRow,
  CauseRow,
  EndorsementReason,
  EndorsementRow,
  GiftRow,
  ImpressionRow,
  OrganizedGroup,
  PledgeRow,
  PollRow,
} from "./campaigns-base";

export {
  STANCE_LOADINGS,
  groupStance,
  personLean,
  popularity,
} from "../campaign-views";
export type { StanceProfile } from "../campaign-views";
export { filingClerkFor } from "./filing-clerk";
export { choosesPresident } from "../electorate-places";
export {
  joinParty,
  nextPartyMeeting,
  openParties,
  partyAgreement,
  partyMemberIds,
  partyStands,
} from "./parties";
export { campaignDayChoices } from "../campaign-day";
export { enrichCivicInputs } from "../civic-inputs";
export { openInterestGroups } from "./interest-groups";
export { openBallotMeasures } from "./ballot-measures";
export { openRecalls } from "./recalls";
export {
  NATIONAL_ENGAGEMENT,
  countedResidents,
  countedResidentsOf,
  engagementOf,
} from "../electorate";
export { StanceReader, candidateStance } from "../campaign-stances";
export { publicOffset, questionAxis } from "../campaign-views";
export { withMembershipDues } from "../membership-dues";
export { refreshOfficeStaff } from "../civic-inputs";
export { electionsParameter } from "../elections-calendar";

export { candidatePlatform } from "../campaign-stances";
export { contestPositions } from "../contest-positions";
/** A side's stance on a question, for the speeches that say where a speaker stands. */
export { stanceReader } from "../campaign-stances";
/** The journal source kinds of campaign payments, whose source records are let go once posted. */
export const CAMPAIGN_MONEY_KINDS: readonly string[] = [
  DONATION_KIND,
  AD_KIND,
  PURCHASE_KIND,
];

export interface PromiseRow {
  readonly id: string;
  readonly candidateId: string;
  readonly contestId: string;
  readonly date: string;
  readonly stance: Stance;
  readonly venue: string;
  readonly audience: number;
}
function moneySlot(
  api: CoreAPI,
  id: string,
): CashJournalSourceSlot | undefined {
  return heldSlots.get(api.state)?.get(id);
}

export const CAMPAIGNS_MODULE: CoreModule = {
  id: CAMPAIGNS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      campaigns: { indexes: { byContest: { fields: ["contestId"] } } },
      /** Each household a campaign's doors reached, one row each, kept until its race closes (`closeRace`; the campaign row keeps the counts). */
      doors: { indexes: { byCampaign: { fields: ["campaignId"] } } },
      impressions: {
        indexes: {
          byVoter: { fields: ["voterId"] },
          byCandidate: { fields: ["candidateId"] },
        },
      },
      causes: {
        indexes: {
          byVoter: { fields: ["voterId"] },
          byCandidate: { fields: ["candidateId"] },
        },
      },
      /** A closed race's causes, folded: one row a voter and candidate (`foldClosedRaceCauses`). */
      causeSummaries: { indexes: { byCandidate: { fields: ["candidateId"] } } },
      /** Folded causes a voter's known fact still names as its source, kept for the trace. */
      foldedCauses: {},
      promises: { indexes: { byCandidate: { fields: ["candidateId"] } } },
      /** What a campaign has said so far, a count per platform question, one row a filing (`nextTopic`); kept while its race is open (`closeRace`). */
      emphasis: {},
      /**
       * Each resident's "yes" at a campaign's door, one row a voter and
       * candidate in a contest, kept while the contest is open: a closed
       * contest's rows go at its close (`closeRace`), except in a contest the
       * player filed in, which keeps every row (CTO, Nov 1 21:25), and a
       * voter's yes in a race still open stays.
       */
      pledges: {
        indexes: {
          byVoter: { fields: ["voterId"] },
          byCandidate: { fields: ["candidateId"] },
        },
      },
      polls: { indexes: { byContest: { fields: ["contestId"] } } },
      /** A decision cast for a person on a campaign's ask (the player's, or a dev pick): read in place of their own lean (`castVolunteer`). */
      casts: {},
      gifts: {
        indexes: {
          byCampaign: { fields: ["campaignId"] },
          byDonor: { fields: ["donorId"] },
        },
      },
      /** Asks for money that reached the controlled person, and their answers. */
      asks: {
        indexes: {
          byDonor: { fields: ["donorId"] },
        },
      },
      /** Contests the town votes in whose campaigns are under way. */
      races: {},
      /**
       * Each paid message's reach, by contest, for word of it passed on, kept
       * while it is newer than `rivalWordDays` back, the window
       * `rivalWordPassedOn` reads (a closed race's last week included); at
       * each campaign turn an older row goes (`foldRivalWord`). `emitMessage`
       * stays the only writer, and keeps each contest's latest message date
       * (`latestMessageDates`); a row the fold removes lowers the table's
       * size, so that record is filled again from the rows. Any other writer
       * must drop the record (`latestMessages.delete`) after it writes.
       */
      messages: { indexes: { byContest: { fields: ["contestId"] } } },
      /**
       * Word of a rival's message passed to a candidate, one row each, kept
       * while it is newer than `rivalWordDays` back (`rivalWordPassedOn`
       * reads it there), and after that only while it is the candidate's
       * newest word in a race still under way (`raceReading`); at each
       * campaign turn any other row goes (`foldRivalWord`).
       */
      rivalWord: { indexes: { byCandidate: { fields: ["candidateId"] } } },
      /** Each reading of the race that made a world candidate campaign harder, one row each. */
      steppedUp: { indexes: { byFiling: { fields: ["filingId"] } } },
      /**
       * Each time a campaign asked the player to give it evenings, one row per campaign: `asked` until the
       * player answers in the scene it stages, then `yes` or `no`. A race's rows go when it is counted
       * (`foldClosedRaceCauses`).
       */
      volunteerAsks: { indexes: { byFiling: { fields: ["filingId"] } } },
      /** Each endorsement answer: a person asked, or a group's backing. */
      endorsements: {
        indexes: {
          byContest: { fields: ["contestId"] },
          byFiling: { fields: ["filingId"] },
        },
      },
      town: {},
    },
  },
  onCalendarWork: (api, work) => campaignWork(api, work),
  onDay: (api) => {
    offersToHelp(api);
    rivalWordPassedOn(api);
    if (Number(api.state.date.slice(8)) % 7 === 1) {
      foldOldCauses(api);
      dropOldFoldedCauses(api);
    }
  },
  // The candidate's answer to an offer, said in the scene it stages; a
  // count closes a race, and its causes fold; a filing's announcement takes
  // its candidate off the rival campaigns they worked for; an announcement
  // forms the candidate's committee the day they announce.
  eventKinds: [
    "scene.reply",
    "election-result",
    "candidate-filed",
    "candidate-announced",
  ],
  onEvent: (api, event) =>
    event.kind === "election-result"
      ? foldClosedRaceCauses(api, String(event.facts?.contestId ?? ""))
      : event.kind === "candidate-filed"
        ? leaveForOwnRun(api, String(event.facts?.filingId ?? ""))
        : event.kind === "candidate-announced"
          ? void campaignFor(api, String(event.facts?.filingId ?? ""))
          : (answerOffer(api, event),
            answerAskForVote(api, event),
            answerEndorsementAsk(api, event),
            answerVolunteerAsk(api, event),
            answerPetitionShort(api, event)),
  journalSourceProviders: {
    [DONATION_KIND]: (api, reference) => moneySlot(api, reference.id),
    [AD_KIND]: (api, reference) => moneySlot(api, reference.id),
    [PURCHASE_KIND]: (api, reference) => moneySlot(api, reference.id),
  },
};

/** Register the module and note the town's starting lean (stand-in for views). */
export function openCampaigns(core: CoreState): void {
  registerElectorate(core);
  if (!core.modules.has(CAMPAIGNS_MODULE_ID))
    registerModule(core, CAMPAIGNS_MODULE);
  const api = coreAPI(core);
  const town = elections(api, "town").get("town") as unknown as {
    stateKey: string;
    geoid: string;
    townPlaceId: string;
  };
  const district = townDistrict(
    town.geoid,
    town.stateKey.slice(3),
    "congressional",
    core.date,
  );
  // stopgapId: SG-GOV-views-stand-in
  api.stopgap("SG-GOV-views-stand-in");
  table(api, "town").put({
    id: "town",
    ...town,
    // A custom world's politics setting shifts where the town stands.
    lean: Math.max(
      -1,
      Math.min(
        1,
        districtLean(
          district?.geoid ?? null,
          town.stateKey,
          worldSwing(api.state.seed, town.stateKey.slice(3)),
        ) + customPolitics(core).leanShift,
      ),
    ),
  });
  scheduleTurn(api);
}

/**
 * The town's lean, right positive: the one reader every engine uses (voting,
 * the legislatures, recalls, staff, ballot measures, stances). Read once a
 * day, since the counted electorate asks it once per voter; 0 before the
 * campaigns engine opens.
 */
export function townLean(api: CoreAPI): number {
  const held = townLeans.get(api.state);
  if (held?.date === api.state.date) return held.lean;
  if (!api.state.modules.has(CAMPAIGNS_MODULE_ID)) return 0;
  const lean =
    (table(api, "town").get("town") as unknown as { lean?: number } | undefined)
      ?.lean ?? 0;
  townLeans.set(api.state, { date: api.state.date, lean });
  return lean;
}

/**
 * Someone who files campaigns for themselves from that day: the filing's
 * announcement (`candidate-filed`, every filing's one record) takes them off
 * the volunteers and staff of every other campaign in the same contest, and
 * each departure is kept on the campaign they left (`leftToRun`) with the day
 * and the filing that caused it. While the filing stands, every way back on
 * reads `rivalFiling` and is shut.
 */
function leaveForOwnRun(api: CoreAPI, filingId: string): void {
  const filing = elections(api, "filings").get(filingId) as unknown as
    FilingRow | undefined;
  if (!filing) return;
  const personId = filing.personId;
  for (const campaign of table(api, "campaigns").query("byContest", [
    filing.contestId,
  ]) as unknown as CampaignRow[]) {
    const staffed = campaign.staffIds.includes(personId);
    if (
      (!staffed && !campaign.volunteerIds.includes(personId)) ||
      rivalFiling(api, campaign, personId)?.id !== filing.id
    )
      continue;
    save(api, {
      ...campaign,
      volunteerIds: campaign.volunteerIds.filter((id) => id !== personId),
      staffIds: campaign.staffIds.filter((id) => id !== personId),
      leftToRun: [
        ...(campaign.leftToRun ?? []),
        {
          personId,
          role: staffed ? "staff" : "volunteer",
          on: api.state.date,
          filingId,
        },
      ],
    });
  }
  // A yes they gave a rival in this race ends the day they file: they are no
  // longer shown backing someone they run against, and a group whose speaker
  // files no longer backs the rival. The row stays, ended and naming the filing.
  for (const row of table(api, "endorsements").query("byContest", [
    filing.contestId,
  ]) as unknown as EndorsementRow[]) {
    if (
      row.answer !== "yes" ||
      row.speakerId !== personId ||
      row.candidateId === personId
    )
      continue;
    const campaign = table(api, "campaigns").get(row.filingId) as unknown as
      CampaignRow | undefined;
    if (!campaign || rivalFiling(api, campaign, personId)?.id !== filing.id)
      continue;
    table(api, "endorsements").put({
      ...row,
      answer: "withdrawn",
      endedOn: api.state.date,
      endedByFilingId: filing.id,
    } as unknown as ModuleRow);
  }
}

export type { ContestRow };

/** A party's lean, read by other families through this entry (`campaign-stances.ts`). */
export { partyLean } from "../campaign-stances";
