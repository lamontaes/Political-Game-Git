import { coreAPI } from "../core2/state";
import {
  askForDonation,
  askForEndorsement,
  askToVolunteer,
  campaignFor,
  commissionPoll,
  giveSpeech,
  runAd,
  statementSpeechId,
  type CauseRow,
} from "../core2/modules/campaigns";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import {
  campaignDayChoices,
  takeCampaignDayChoice,
  type CampaignDayKind,
} from "../core2/campaign-day";
import type { FilingRow } from "../core2/modules/elections";
import type { CoreState } from "../core2/types";
import { retellingsOf } from "../core2/modules/speech";
import {
  answerDebate,
  debatesIn,
  type DebateRow,
} from "../core2/modules/meetings";
import type { InterviewAnswer } from "../core2/modules/press";
import { backdropFile, stagePeople } from "./scene";
import scenePlaces from "./data/scene-places.json" with { type: "json" };

const ELECTIONS = "core2-elections-v1";
const CAMPAIGNS = "core2-campaigns-v1";

/** The player's campaigns: one for each filing on the ballot. */
export function campaignView(core: CoreState, personId: string) {
  if (!core.modules.has(CAMPAIGNS))
    return { campaigns: [], questions: [], venues: [] };
  const api = coreAPI(core);
  const filings = (
    api
      .moduleState(ELECTIONS)
      .table("filings")
      .query("byPerson", [personId]) as unknown as FilingRow[]
  ).filter((row) => row.status !== "withdrawn");
  return {
    questions: PLATFORM_QUESTIONS,
    venues: scenePlaces.speechPlaces,
    campaigns: filings.map((filing) => {
      const campaign = campaignFor(api, filing.id);
      const polls = api
        .moduleState(CAMPAIGNS)
        .table("polls")
        .query("byContest", [filing.contestId]) as unknown as {
        date: string;
        contacted: number;
        answers: Record<string, number>;
      }[];
      return {
        filing,
        campaign: {
          ...campaign,
          volunteers: campaign.volunteerIds.length,
          doors: campaign.doorsKnockedCount ?? 0,
        },
        polls: polls.slice(-3),
        // The day's choices the records offer, each with the hours it takes.
        day: campaignDayChoices(api, filing.id).map((choice) => ({
          kind: choice.kind,
          hours: choice.hours,
          available: choice.available,
        })),
        // Debates the outlet has invited the candidates to, waiting for their answers.
        debates: debatesIn(api, filing.contestId)
          .filter((row) => row.status === "invited")
          .map((row) => ({
            id: row.id,
            date: row.date,
            outletId: row.outletId,
            questions: row.questions,
          })),
      };
    }),
  };
}

const summary = (causes: readonly CauseRow[]) => ({
  reached: causes.length,
  warmer: causes.filter((row) => row.warmthAfter > row.warmthBefore).length,
  cooler: causes.filter((row) => row.warmthAfter < row.warmthBefore).length,
  causes: causes.slice(0, 20),
});

/** One campaign act, done by the player, answered by each person reached. */
export function campaignAct(
  core: CoreState,
  personId: string,
  input: {
    filingId: string;
    kind: string;
    venue?: string;
    statements?: string;
    amountMinor?: number;
    sampleSize?: number;
  },
) {
  const api = coreAPI(core);
  const campaign = campaignFor(api, input.filingId);
  if (campaign.candidateId !== personId)
    throw new Error("That is not your campaign.");
  const known = [...(core.people.get(personId)?.knownIds ?? [])].sort();
  switch (input.kind) {
    case "speech": {
      const causes = giveSpeech(api, {
        filingId: input.filingId,
        venue: input.venue ?? "",
        statements: (input.statements ?? "")
          .split(",")
          .filter(Boolean)
          .map((row) => {
            const [question, position] = row.split("=");
            return { question: question!, position: Number(position) };
          }),
      });
      // The people it reached heard it as a speech (OPUS-PEOPLE's speech
      // engine, from the campaign's statements): each stance on its topic
      // moved by how near they lean, and each decided whether to retell it.
      const retold = retellingsOf(
        api,
        statementSpeechId(personId, core.date, {
          act: "speech",
          venue: input.venue ?? "",
        }),
      ).filter((row) => row.retold).length;
      return {
        ...summary(causes),
        retold,
        scene: speechScene(core, personId, input.venue, causes),
      };
    }
    case "volunteer":
      return {
        answers: known.map((id) => ({
          personId: id,
          yes: askToVolunteer(api, input.filingId, id),
        })),
      };
    case "donation":
      return {
        answers: known.map((id) => ({
          personId: id,
          givenMinor: askForDonation(api, input.filingId, id),
        })),
      };
    case "endorsement":
      return {
        answers: known.map((id) => ({
          personId: id,
          yes: askForEndorsement(api, input.filingId, id),
        })),
      };
    case "ad":
      return summary(
        runAd(api, {
          filingId: input.filingId,
          amountMinor: input.amountMinor ?? 0,
        }),
      );
    case "poll":
      return commissionPoll(api, {
        filingId: input.filingId,
        sampleSize: input.sampleSize ?? 50,
      });
    default:
      throw new Error("Unknown campaign act.");
  }
}

/** The speech where it was given: the candidate up front, the people it reached around them. */
function speechScene(
  core: CoreState,
  personId: string,
  venue: string | undefined,
  causes: readonly CauseRow[],
) {
  const place = scenePlaces.speechPlaces.includes(venue ?? "")
    ? venue!
    : scenePlaces.speechPlaces[0]!;
  const ids = [personId, ...new Set(causes.map((row) => row.voterId))].filter(
    (id) => core.people.get(id)?.alive,
  );
  return {
    place,
    backdrop: backdropFile(place, 18 * 60),
    ...stagePeople(
      core,
      place,
      ids.map((id) => {
        const row = core.people.get(id)!;
        return { id, name: `${row.givenName} ${row.familyName}` };
      }),
    ),
  };
}

/** The player answers a debate they were invited to, one position (or none) for each question it asks. */
export function debateAnswer(
  core: CoreState,
  personId: string,
  debateId: string,
  answers: readonly InterviewAnswer[],
): DebateRow {
  const api = coreAPI(core);
  const waiting = campaignView(core, personId).campaigns.some((c) =>
    c.debates.some((d) => d.id === debateId),
  );
  if (!waiting) throw new Error("No debate is waiting for your answers.");
  return answerDebate(api, debateId, answers);
}

/** The player takes one of the campaign day's choices; the engine runs it and every dollar goes through its journal. */
export function campaignDay(
  core: CoreState,
  personId: string,
  input: { filingId: string; kind: string; outletId?: string },
) {
  const api = coreAPI(core);
  if (campaignFor(api, input.filingId).candidateId !== personId)
    throw new Error("That is not your campaign.");
  const kinds: readonly CampaignDayKind[] = [
    "canvass",
    "event",
    "interview",
    "raise-money",
    "rest",
  ];
  const kind = kinds.find((k) => k === input.kind);
  if (!kind) throw new Error("Unknown campaign day choice.");
  const result = takeCampaignDayChoice(api, input.filingId, kind, {
    ...(input.outletId ? { outletId: input.outletId } : {}),
  });
  return {
    kind: result.kind,
    hours: result.hours,
    doorsKnocked: result.doorsKnocked,
    reached: result.causeIds.length,
    raisedMinor: result.raisedMinor,
    gifts: result.giftIds.length,
    interview: result.interview
      ? {
          id: result.interview.id,
          outletId: result.interview.outletId,
          status: result.interview.status,
        }
      : null,
  };
}
