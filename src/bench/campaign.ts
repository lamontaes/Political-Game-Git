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
import type { Stance } from "../core2/campaign-views";
import {
  campaignDayChoices,
  takeCampaignDayChoice,
  type CampaignDayKind,
} from "../core2/campaign-day";
import type { FilingRow } from "../core2/modules/elections";
import type { CoreState } from "../core2/types";
import { dwellingKind } from "../core2/modules/housing";
import { retellingsOf } from "../core2/modules/speech";
import {
  answerDebate,
  debatesIn,
  type DebateRow,
} from "../core2/modules/meetings";
import type { InterviewAnswer } from "../core2/modules/press";
import {
  beginSpeech,
  chooseSpeechPart,
  speechText,
  type SpeechBuild,
} from "../director/speech-builder";
import { backdropFile, stagePeople } from "./scene";
import scenePlaces from "./data/scene-places.json" with { type: "json" };

const ELECTIONS = "core2-elections-v1";
const CAMPAIGNS = "core2-campaigns-v1";

/** The campaign day's acts that open as a scene, by the name the screen's control carries. */
const OUTINGS: Partial<Record<CampaignDayKind, "doors" | "calls">> = {
  canvass: "doors",
  "raise-money": "calls",
};

/** The player's campaigns: one for each filing on the ballot. */
export function campaignView(core: CoreState, personId: string) {
  if (!core.modules.has(CAMPAIGNS)) return { campaigns: [], venues: [] };
  const api = coreAPI(core);
  const filings = (
    api
      .moduleState(ELECTIONS)
      .table("filings")
      .query("byPerson", [personId]) as unknown as FilingRow[]
  ).filter((row) => row.status !== "withdrawn");
  return {
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
        // What the contest turns on: each candidate's acts and how the people they reached came to feel.
        causes: contestCauses(core, filing.contestId, personId),
        // Where the player can go out and meet people today: a street of doors, the phone bank.
        outings: campaignDayChoices(api, filing.id).flatMap((choice) => {
          const outing = OUTINGS[choice.kind];
          return outing
            ? [{ outing, hours: choice.hours, available: choice.available }]
            : [];
        }),
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

/**
 * The causes a contest turns on: for each candidate on its ballot, the acts
 * that reached voters (doors, speeches, ads, a retelling) with how many were
 * reached and how many came away warmer or cooler. Read from the cause rows
 * the campaign engine kept; a read-only view.
 */
function contestCauses(core: CoreState, contestId: string, personId: string) {
  const api = coreAPI(core);
  const filings = (
    api
      .moduleState(ELECTIONS)
      .table("filings")
      .query("byContest", [contestId]) as unknown as FilingRow[]
  ).filter((row) => row.status !== "withdrawn");
  return filings.map((filing) => {
    const rows = api
      .moduleState(CAMPAIGNS)
      .table("causes")
      .query("byCandidate", [filing.personId]) as unknown as CauseRow[];
    const acts = new Map<
      string,
      { act: string; reached: number; warmer: number; cooler: number }
    >();
    for (const row of rows) {
      const entry = acts.get(row.act) ?? {
        act: row.act,
        reached: 0,
        warmer: 0,
        cooler: 0,
      };
      entry.reached += 1;
      if (row.warmthAfter > row.warmthBefore) entry.warmer += 1;
      else if (row.warmthAfter < row.warmthBefore) entry.cooler += 1;
      acts.set(row.act, entry);
    }
    const person = core.people.get(filing.personId);
    return {
      filingId: filing.id,
      candidateId: filing.personId,
      name: person
        ? `${person.givenName} ${person.familyName}`
        : filing.personId,
      you: filing.personId === personId,
      acts: [...acts.values()].sort((a, b) => a.act.localeCompare(b.act)),
    };
  });
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

/** The people an outing reached: who answered the doors, who was asked for money. */
function outingPeople(
  core: CoreState,
  kind: CampaignDayKind,
  result: {
    causeIds: readonly string[];
    giftIds: readonly string[];
  },
): string[] {
  const api = coreAPI(core);
  const ids =
    kind === "canvass"
      ? result.causeIds.map(
          (id) =>
            (
              api.moduleState(CAMPAIGNS).table("causes").get(id) as unknown as
                CauseRow | undefined
            )?.voterId ?? "",
        )
      : kind === "raise-money"
        ? result.giftIds.map((id) => id.split("|")[1] ?? "")
        : [];
  return [...new Set(ids)].filter((id) => core.people.get(id)?.alive);
}

/**
 * Doors and calls where they happen: the street the first household that answered
 * lives on (by its kind of dwelling) or the phone bank, the candidate up front.
 */
function outingScene(
  core: CoreState,
  personId: string,
  kind: CampaignDayKind,
  met: readonly string[],
) {
  const first = core.people.get(met[0] ?? "")?.householdId ?? "";
  const dwelling = (first && dwellingKind(coreAPI(core), first)) || "house";
  const doors = scenePlaces.doorKnockingPlaces as Record<string, string>;
  const place =
    kind === "canvass"
      ? (doors[dwelling] ?? doors.house!)
      : scenePlaces.phoneBankPlace;
  const ids = [personId, ...met].filter((id) => core.people.get(id)?.alive);
  return {
    place,
    backdrop: backdropFile(place, 16 * 60),
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
  const met = outingPeople(core, kind, result);
  return {
    ...(met.length ? { scene: outingScene(core, personId, kind, met) } : {}),
    households: [
      ...new Set(met.map((id) => core.people.get(id)?.householdId ?? "")),
    ].filter(Boolean),
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

/** What the speech screen shows: the parts said so far and the four to pick from, never the engine's internals. */
export function speechView(build: SpeechBuild) {
  const part = (row: { key: string; stage: string; text: string }) => ({
    key: row.key,
    stage: row.stage,
    text: row.text,
  });
  return {
    picked: build.picked.map(part),
    choices: build.choices.map(part),
    done: build.done,
  };
}

/** The player starts a speech: the opener's choices, from their own records. */
export function speechBegin(core: CoreState, personId: string): SpeechBuild {
  const build = beginSpeech(core, personId);
  if (!build) throw new Error("Only a living person can give a speech.");
  return build;
}

/** The player says one of the four parts offered; the next stage's follow. */
export function speechPick(
  core: CoreState,
  build: SpeechBuild,
  key: string,
): SpeechBuild {
  if (build.done) throw new Error("The speech is finished.");
  if (!build.choices.some((row) => row.key === key))
    throw new Error("That part is not on offer.");
  return chooseSpeechPart(core, build, key);
}

/**
 * The finished speech is given through the campaign engine like any speech:
 * each stand in it is a statement, the people who come hear it, and the speech
 * engine moves their views and lets them retell it.
 */
export function speechGive(
  core: CoreState,
  personId: string,
  build: SpeechBuild,
  input: { filingId: string; venue: string },
) {
  const api = coreAPI(core);
  const campaign = campaignFor(api, input.filingId);
  if (campaign.candidateId !== personId || build.speakerId !== personId)
    throw new Error("That is not your campaign.");
  if (!build.done) throw new Error("Finish the speech first.");
  const stands = new Map<string, Stance>();
  for (const part of build.picked)
    if (part.stand && !stands.has(part.stand.question))
      stands.set(part.stand.question, {
        question: part.stand.question,
        position: part.stand.desiredChange === "enact" ? 1 : -1,
      });
  const venue = scenePlaces.speechPlaces.includes(input.venue)
    ? input.venue
    : scenePlaces.speechPlaces[0]!;
  const causes = giveSpeech(api, {
    filingId: input.filingId,
    venue,
    statements: [...stands.values()],
  });
  // Those it reached heard it as a speech and each decided whether to retell it.
  const retold = retellingsOf(
    api,
    statementSpeechId(personId, core.date, { act: "speech", venue }),
  ).filter((row) => row.retold).length;
  return {
    ...summary(causes),
    text: speechText(build),
    retold,
    scene: speechScene(core, personId, venue, causes),
  };
}
