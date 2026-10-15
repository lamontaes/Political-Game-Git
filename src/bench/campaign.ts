import { coreAPI } from "../core2/state";
import {
  askForDonation,
  askForEndorsement,
  askToVolunteer,
  campaignFor,
  commissionPoll,
  giveSpeech,
  knockDoors,
  runAd,
  statementSpeechId,
  type CauseRow,
} from "../core2/modules/campaigns";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import type { FilingRow } from "../core2/modules/elections";
import type { CoreState } from "../core2/types";
import { retellingsOf } from "../core2/modules/speech";
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
    hours?: number;
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
    case "doors": {
      const hours = input.hours ?? 1;
      return summary(
        knockDoors(api, {
          filingId: input.filingId,
          canvasserId: personId,
          hours,
        }),
      );
    }
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
