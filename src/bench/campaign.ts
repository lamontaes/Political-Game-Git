import { spokenDate } from "../core2/kernel/dates";
import { coreAPI } from "../core2/state";
import {
  askForDonation,
  askForEndorsement,
  contributeOwnMoney,
  askToVolunteer,
  campaignFor,
  commissionPoll,
  endorsementsOf,
  giveSpeech,
  runAd,
  sendMail,
  statementSpeechId,
  type CauseRow,
} from "../core2/modules/campaigns";
import type { Stance } from "../core2/campaign-views";
import {
  campaignDayChoices,
  contestStanding,
  takeCampaignDayChoice,
  whyNotToday,
  type CandidateStanding,
  type CampaignDayKind,
} from "../core2/campaign-day";
import type { ContestRow, FilingRow } from "../core2/modules/elections";
import type { CoreAPI, CoreState } from "../core2/types";
import { dwellingKind } from "../core2/modules/housing";
import { retellingsOf } from "../core2/modules/speech";
import {
  answerDebate,
  debatesIn,
  type DebateRow,
} from "../core2/modules/meetings";
import {
  interviewsFor,
  outletsHere,
  type InterviewAnswer,
} from "../core2/modules/press";
import {
  beginSpeech,
  chooseSpeechPart,
  speechText,
  type SpeechBuild,
} from "../director/speech-builder";
import { campaignParameter } from "../core2/campaign-views";
import { backdropFor, homeOf, stagePeople } from "./scene";
import { dollarsOf, nameList, standingLine } from "./race-words";
import scenePlaces from "./data/scene-places.json" with { type: "json" };

/** The voters a poll asks when the player commissions one from the Campaigns screen. */
const POLL_SAMPLE = campaignParameter("pollSampleSize");

const ELECTIONS = "core2-elections-v1";
const CAMPAIGNS = "core2-campaigns-v1";

/** The campaign day's acts that open as a scene, by the name the screen's control carries. */
const OUTINGS: Partial<
  Record<
    CampaignDayKind,
    "doors" | "calls" | "event" | "forum" | "interview" | "party"
  >
> = {
  canvass: "doors",
  "raise-money": "calls",
  event: "event",
  forum: "forum",
  interview: "interview",
  "donor-meeting": "party",
};

/** The outlet to ask first: the town's own before a regional or national one. */
function townFirst(api: CoreAPI, outletIds: readonly string[]) {
  const tier = new Map(outletsHere(api).map((o) => [o.id, o.tier]));
  return outletIds.find((id) => tier.get(id) === "local") ?? outletIds[0];
}

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
      const causes = contestStanding(api, filing.contestId, personId);
      // The race by its own record: the office and the day it is decided.
      const contest = api
        .moduleState(ELECTIONS)
        .table("contests")
        .get(filing.contestId) as unknown as ContestRow | undefined;
      return {
        filing,
        // The other candidates on the contest's filings, by name: what the
        // standing's opponents sentence names.
        opponents: causes.filter((who) => !who.you).map((who) => who.name),
        contest: contest
          ? {
              title: contest.district
                ? `${contest.title} (${contest.district})`
                : contest.title,
              electionDate: contest.electionDate,
            }
          : null,
        campaign: {
          ...campaign,
          volunteers: campaign.volunteerIds.length,
          doors: campaign.doorsKnockedCount ?? 0,
          // The people and groups who said yes, from the endorsement records.
          endorsements: endorsementsOf(api, filing.id).filter(
            (row) => row.answer === "yes",
          ).length,
        },
        polls: polls.slice(-3),
        // What the contest turns on: each candidate's acts and how the people they reached came to feel.
        causes,
        // The sample a poll asks, so the screen's Poll button and the price below agree.
        pollSample: POLL_SAMPLE,
        // Where the race stands, in the English engine's words, from the contest's records.
        standing: raceStanding(core, filing, polls.at(-1), causes),
        // Where the player can go out and meet people today: a street of doors, the phone bank.
        outings: campaignDayChoices(api, filing.id).flatMap((choice) => {
          const outing = OUTINGS[choice.kind];
          if (!outing) return [];
          // An interview is asked of an outlet: the one that invited the candidate, else the first with room.
          const outletId =
            choice.kind === "interview"
              ? (interviewsFor(api, filing.personId).find(
                  (i) => i.id === choice.facts.invitedInterviewIds[0],
                )?.outletId ??
                townFirst(
                  api,
                  choice.facts.outlets.map((o) => o.outletId),
                ))
              : undefined;
          const why = choice.available ? undefined : whyNotToday(choice);
          return [
            {
              outing,
              hours: choice.hours,
              available: choice.available,
              ...(outletId ? { outletId } : {}),
              ...(why ? { why } : {}),
            },
          ];
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
 * Where the race stands, as sentences from the English engine's
 * campaign-standing bank: the voters the player reached and how many moved,
 * the opponents on the contest's filings and how many voters each reached,
 * the last poll's answers, and what a poll would cost (the Poll action's
 * sample at the campaign engine's price per interview).
 */
export function raceStanding(
  core: CoreState,
  filing: FilingRow,
  lastPoll:
    | { date: string; contacted: number; answers: Record<string, number> }
    | undefined,
  causes: readonly CandidateStanding[],
): string[] {
  const mine = causes.find((who) => who.you);
  const others = causes.filter((who) => !who.you);
  const id = filing.id;
  const perInterview = campaignParameter("pollCostPerInterviewMinor");
  const line = (
    move: string,
    recordId: string,
    slots: Readonly<Record<string, string | number>>,
  ) => standingLine(core.seed, filing.personId, move, recordId, slots);
  return [
    mine && mine.reached > 0
      ? line(mine.reached === 1 ? "reached-one" : "reached", id, {
          reached: mine.reached,
        })
      : line("reached-none", id, {}),
    ...(mine && mine.reached > 0
      ? [
          line(
            mine.warmer > 0 && mine.cooler > 0
              ? "moved-both"
              : mine.warmer > 0
                ? "moved-warmer"
                : mine.cooler > 0
                  ? "moved-cooler"
                  : "moved-none",
            id,
            { warmer: mine.warmer, cooler: mine.cooler },
          ),
        ]
      : []),
    others.length
      ? line(others.length === 1 ? "opponent-one" : "opponents", id, {
          opponents: nameList(others.map((who) => who.name)),
        })
      : line("opponents-none", id, {}),
    ...others
      .filter((who) => who.reached > 0)
      .map((who) =>
        line(
          who.reached === 1 ? "opponent-reached-one" : "opponent-reached",
          `${id}|${who.candidateId}`,
          { name: who.name, reached: who.reached },
        ),
      ),
    ...(lastPoll
      ? [
          line(
            lastPoll.contacted === 1 ? "poll-result-one" : "poll-result",
            id,
            {
              date: spokenDate(lastPoll.date),
              contacted: lastPoll.contacted,
              // The candidates' answers, by name; the bank has no words for
              // the undecided yet, so they are left out of the tally.
              tally: Object.entries(lastPoll.answers)
                .flatMap(([who, n]) => {
                  const name = causes.find((c) => c.candidateId === who)?.name;
                  return name ? [[name, n] as const] : [];
                })
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                .map(([name, n]) => `${name} ${n}`)
                .join(", "),
            },
          ),
        ]
      : []),
    line("poll-cost", id, {
      sample: POLL_SAMPLE,
      cost: dollarsOf(POLL_SAMPLE * perInterview),
    }),
  ];
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
    case "volunteer": {
      const answers = known.map((id) => ({
        personId: id,
        yes: askToVolunteer(api, input.filingId, id),
      }));
      // The count shown is the campaign record's, the one the header reads.
      return {
        answers,
        volunteers: campaignFor(api, input.filingId).volunteerIds.length,
      };
    }
    case "donation":
      return {
        answers: known.map((id) => ({
          personId: id,
          givenMinor: askForDonation(api, input.filingId, id),
        })),
      };
    case "contribute":
      // The player's own money, the amount they chose.
      return {
        answers: [
          {
            personId,
            givenMinor: contributeOwnMoney(
              api,
              input.filingId,
              input.amountMinor ?? 0,
            ),
          },
        ],
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
    case "mail": {
      // Mailers to the town's next households, as many as the amount the
      // player chose buys (never past what the campaign holds).
      const before = campaign.spentMinor;
      const read = sendMail(api, input.filingId, input.amountMinor ?? 0);
      return {
        ...summary(read),
        spentMinor: campaignFor(api, input.filingId).spentMinor - before,
      };
    }
    case "poll":
      return commissionPoll(api, {
        filingId: input.filingId,
        sampleSize: input.sampleSize ?? POLL_SAMPLE,
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
  const backdrop = backdropFor(core, place, 18 * 60);
  return {
    place,
    backdrop,
    ...stagePeople(
      core,
      backdrop.file,
      ids.map((id) => {
        const row = core.people.get(id)!;
        return {
          id,
          name: `${row.givenName} ${row.familyName}`,
          reason: id === personId ? ("you" as const) : ("reached" as const),
        };
      }),
    ),
  };
}

/** The people an outing reached: who answered the doors, who was asked for money, who was in the room (the host first). */
function outingPeople(
  core: CoreState,
  kind: CampaignDayKind,
  result: {
    causeIds: readonly string[];
    giftIds: readonly string[];
    donorMeeting: { hostId: string; guestIds: readonly string[] } | null;
  },
): string[] {
  // A donor meeting's room: the host, then the guests who came.
  if (kind === "donor-meeting" && result.donorMeeting)
    return [result.donorMeeting.hostId, ...result.donorMeeting.guestIds].filter(
      (id) => core.people.get(id)?.alive,
    );
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
        : kind === "event" || kind === "forum"
          ? result.causeIds.map(
              (id) =>
                (
                  api
                    .moduleState(CAMPAIGNS)
                    .table("causes")
                    .get(id) as unknown as CauseRow | undefined
                )?.voterId ?? "",
            )
          : [];
  return [...new Set(ids)].filter((id) => core.people.get(id)?.alive);
}

/**
 * Doors and calls where they happen: the street the first household that answered
 * lives on (by its kind of dwelling) or the phone bank, the candidate up front;
 * a donor meeting in the host's (the first person met's) living room, in the evening.
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
  const party = kind === "donor-meeting" && !!met[0];
  // A house party is an evening in the living room (homeRoomByHour).
  const minute = party ? 20 * 60 : 16 * 60;
  const place = party
    ? homeOf(core, met[0]!, minute)
    : kind === "canvass"
      ? (doors[dwelling] ?? doors.house!)
      : kind === "event"
        ? scenePlaces.speechPlaces[0]!
        : kind === "forum"
          ? scenePlaces.sceneSettings.venue[0]!
          : scenePlaces.phoneBankPlace;
  const ids = [personId, ...met].filter((id) => core.people.get(id)?.alive);
  const backdrop = backdropFor(core, place, minute, party ? met[0] : undefined);
  return {
    place,
    backdrop,
    ...stagePeople(
      core,
      backdrop.file,
      ids.map((id) => {
        const row = core.people.get(id)!;
        return {
          id,
          name: `${row.givenName} ${row.familyName}`,
          reason: id === personId ? ("you" as const) : ("reached" as const),
        };
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
    "forum",
    "interview",
    "raise-money",
    "donor-meeting",
    "rest",
  ];
  const kind = kinds.find((k) => k === input.kind);
  if (!kind) throw new Error("Unknown campaign day choice.");
  const result = takeCampaignDayChoice(api, input.filingId, kind, {
    ...(input.outletId ? { outletId: input.outletId } : {}),
  });
  const met = outingPeople(core, kind, result);
  // Each person asked for money: their name, what they gave or why not, in words.
  const calls = result.answers.map((answer) => {
    const person = core.people.get(answer.personId);
    const name = person ? `${person.givenName} ${person.familyName}` : "";
    const recordId = `${input.filingId}|${answer.personId}`;
    return {
      personId: answer.personId,
      name,
      givenMinor: answer.givenMinor,
      why: answer.why,
      line: standingLine(
        core.seed,
        personId,
        answer.why === "gave" ? "gave" : answer.why,
        recordId,
        { name, amount: dollarsOf(answer.givenMinor) },
      ),
    };
  });
  const gave = calls.filter((c) => c.givenMinor > 0).length;
  const callsLine =
    (kind !== "raise-money" && kind !== "donor-meeting") || calls.length === 0
      ? ""
      : gave > 0
        ? standingLine(core.seed, personId, "total", input.filingId, {
            amount: dollarsOf(result.raisedMinor),
            gave,
            asked: calls.length,
          })
        : standingLine(core.seed, personId, "none-gave", input.filingId, {
            asked: calls.length,
          });
  return {
    calls,
    callsLine,
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
    // A forum's town hall: the meetings engine's row, who came and what they asked.
    townHallId: result.townHall?.id ?? null,
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
