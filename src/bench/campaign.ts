import { coreAPI, fillInPerson } from "../core2/state";
import { residentsRuntime } from "../core2/modules/residents";
import {
  askForDonation,
  askForEndorsement,
  askToVolunteer,
  campaignFor,
  commissionPoll,
  giveSpeech,
  knockDoors,
  runAd,
  type CauseRow,
} from "../core2/modules/campaigns";
import { campaignParameter, PLATFORM_QUESTIONS } from "../core2/campaign-views";
import type { FilingRow } from "../core2/modules/elections";
import type { CoreState } from "../core2/types";
import { deliverSpeech, SPEECH_MODULE_ID } from "../core2/modules/speech";
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
          doors: campaign.doorsKnocked.length,
        },
        polls: polls.slice(-3),
      };
    }),
  };
}

// Stopgap SG-PLAY-doors-fill-in: the doors a round can reach are filled in
// from the counts before it starts (people are filled in when met); the
// campaign engine should fill in the households it actually reaches.
function fillDoors(core: CoreState, filingId: string, hours: number) {
  const runtime = residentsRuntime(core);
  if (!runtime) return;
  const api = coreAPI(core);
  const campaign = campaignFor(api, filingId);
  const town = core.people.get(campaign.candidateId)?.placeId;
  const reach = Math.ceil(
    hours * campaignParameter("doorsPerCanvasserHour") * 2,
  );
  const waiting = [...core.households.values()].filter(
    (row) => row.placeId === town && !campaign.doorsKnocked.includes(row.id),
  ).length;
  const counted = [...runtime.households.values()]
    .filter((row) => row.household.placeId === town)
    .map((row) => row.household)
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, Math.max(reach - waiting, 0));
  for (const home of counted)
    if (home.memberIds[0] && !core.people.has(home.memberIds[0]))
      fillInPerson(core, home.memberIds[0]);
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
      fillDoors(core, input.filingId, hours);
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
      // The people it reached hear it as a speech (OPUS-PEOPLE's speech
      // engine): each stance on its topic moves by how near they lean, and
      // each decides whether to retell it at home.
      const retold = hearSpeech(core, personId, input.statements ?? "", causes);
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

/** The speech heard on its first statement's topic; how many retell it. */
function hearSpeech(
  core: CoreState,
  personId: string,
  statements: string,
  causes: readonly CauseRow[],
): number {
  if (!core.modules.has(SPEECH_MODULE_ID)) return 0;
  const [question, position] = (statements.split(",")[0] ?? "").split("=");
  if (!question) return 0;
  const api = coreAPI(core);
  const speaker = core.people.get(personId)!;
  const audienceIds = [...new Set(causes.map((row) => row.voterId))].filter(
    (id) => core.people.get(id)?.alive,
  );
  const n = core.durableLog.size;
  return deliverSpeech(api, {
    id: `speech:${personId}:${core.date}:${n}`,
    speakerId: personId,
    placeId: speaker.placeId,
    topic: question,
    desiredChange: Number(position) > 0 ? "enact" : "repeal",
    audienceIds,
  }).filter((row) => row.retold).length;
}
