import { RegularSessionUnavailableError } from "../../src/presentation/legislative-session-window";
import { createHash } from "node:crypto";
import {
  campaignForCandidate,
  createCampaignElectionTransitionRegistry,
  electionContestResult,
  performScheduledActivity,
  scheduledActivityState,
} from "../../src/simulation";
import type { EntityId, World } from "../../src/simulation";
import {
  fileForOffice,
  projectCampaign,
  spendAnAfternoon,
} from "../../src/presentation/campaign-projection";
import {
  chooseStoryOption,
  letStoryTimePass,
  projectStoryMoment,
  type StoryMoment,
} from "../../src/presentation/life-story";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../../src/presentation/ordinary-life";
import { openLegislativeWork } from "../../src/presentation/legislation-world";
import { projectMeasureBriefing } from "../../src/presentation/legislation-projection";
import { resolvePlayerCapabilities } from "../../src/presentation/player-capabilities";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
  type NewGameSetup,
} from "../../src/presentation/new-game";
import { normalizeForMatch } from "./coverage";
import type { ProseInventory } from "./inventory";
import type { ProseRealizationRecord } from "./types";

/**
 * Fixed-seed lives, played through the real player seams.
 *
 * The old #92 harness had a life runner of its own, which meant its
 * transcripts described a life the game does not actually project. This drives
 * `projectStoryMoment` and `chooseStoryOption` — the same functions the player
 * surface calls — plus `fileForOffice` and `spendAnAfternoon` for the campaign
 * spine merged in PR #85. If a surface cannot be reached through those, it is
 * not reached here either, and the run says so rather than fabricating state
 * to make a scene eligible.
 *
 * A seed is evidence, not a constant. Each entry below records what it is
 * meant to expose; `proveSeeds` reports what each one actually exposed, so a
 * seed that stops demonstrating its surface is visible instead of quietly
 * passing.
 */

export interface SeedFamily {
  readonly key: string;
  /** What this seed is here to demonstrate. */
  readonly intent: string;
  readonly setup: NewGameSetup;
  readonly steps: number;
  /** Option keys to prefer, in order, when they are on offer. */
  readonly prefer: readonly string[];
  /**
   * Run the campaign spine after the life beats.
   *
   * `file-and-run` files and then works the campaign for the afternoons the
   * clock will give it. `file-only` files and does nothing else, which is a
   * thing a player can actually do and a thing the game has an answer to.
   */
  readonly campaign?: "file-and-run" | "file-only" | null;
}

function setup(overrides: Partial<NewGameSetup>): NewGameSetup {
  return {
    ...DEFAULT_NEW_GAME_SETUP,
    questionnaire: "skipped",
    seed: "corpus",
    ...overrides,
  };
}

/**
 * Afternoons a campaigning transcript will work, if the clock gives them.
 *
 * Six is the figure `runCampaign` has always named. It is a budget, not a
 * guarantee: the loop stops early when election day arrives or when time
 * refuses to move, and it reports how many it actually got.
 */
const CAMPAIGN_AFTERNOONS = 6;

export const SEED_FAMILIES: readonly SeedFamily[] = [
  {
    key: "early-childhood",
    intent:
      "Early childhood: the 92C age-five-to-seven kernels and their household and school context.",
    setup: setup({
      seed: "corpus-early-childhood",
      startAge: 6,
      placeKey: "lexington-fayette",
      depth: "play-formative-years",
      startingLife: "ordinary-life",
      household: "shares-a-home",
    }),
    steps: 14,
    prefer: ["say-something", "speak-up", "ask", "help"],
  },
  {
    key: "adolescence",
    intent:
      "Adolescence: school, household load and the first work-standing situations.",
    setup: setup({
      seed: "corpus-adolescence",
      startAge: 15,
      placeKey: "lexington-fayette",
      depth: "play-formative-years",
      startingLife: "ordinary-life",
      household: "shares-a-home",
    }),
    steps: 16,
    prefer: ["speak-up", "take-it-on", "say-nothing"],
  },
  {
    key: "ordinary-adulthood",
    intent:
      "Ordinary adult life: adult situations, quiet stretches and connective narration between them.",
    setup: setup({
      seed: "corpus-ordinary-adult",
      startAge: 34,
      placeKey: "kentucky",
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "shares-a-home",
    }),
    steps: 20,
    prefer: ["take-it-on", "hold-back"],
  },
  {
    key: "long-tail-callback",
    intent:
      "Persistent cast across years: a family that binds one canonical person and returns to them in later beats. This lane does NOT claim the 92C childhood-pact callback specifically — that claim is only made when the pact stage and a later stage of the same instance are both actually played, which `demonstrated` reports separately.",
    setup: setup({
      seed: "corpus-long-tail",
      startAge: 7,
      placeKey: "lexington-fayette",
      depth: "play-formative-years",
      startingLife: "ordinary-life",
      household: "shares-a-home",
    }),
    steps: 40,
    prefer: ["agree", "say-yes", "promise", "speak-up"],
  },
  {
    key: "campaign-and-office",
    intent:
      "The PR #85 spine: filing a candidacy, running the campaign, and whatever the contest resolves to.",
    setup: setup({
      seed: "p85c-owner-clock",
      startAge: 34,
      placeKey: "lexington-fayette",
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      gender: "male",
      pronouns: "he-him",
    }),
    steps: 6,
    prefer: ["take-it-on"],
    campaign: "file-and-run",
  },
  {
    key: "campaign-alternate",
    intent:
      "A second candidacy on a different seed, so a contest outcome is not read from one run.",
    // `corpus-campaign-b`, the original control, restored.
    //
    // P2R1 re-seeded this lane to `corpus-campaign-c` because the old seed had
    // stopped resolving the way the matrix wanted. Renaming a control until it
    // gives the answer is not a repair, and it was covering for something real:
    // every transcript candidate was spending all six afternoons on the phones,
    // because the session loop took whichever offer came first. Money moves no
    // canonical support, so both contests were being settled inside the bounded
    // keyed swing — at accepted main this matrix's only win was seven tenths of
    // a point wide.
    //
    // With the candidate actually canvassing (see `runCampaign`), support moves
    // for reasons rather than by the swing alone.
    //
    // P-UI8 correction: the sentence that used to stand here said these two
    // seeds demonstrate "one contest each", `p85c-owner-clock` losing and
    // `corpus-campaign-b` winning. That was measured while the session loop was
    // silently taking two afternoons instead of six, which put both contests
    // within two points of the line — so the split was a property of the
    // truncation, not of the two seeds. Both original controls are kept, and
    // both now win by ten points or more once the campaign is actually worked.
    // The loss is demonstrated where it can be attributed: by the lane below
    // that files and does not campaign. No outcome is written anywhere; every
    // one is read off the resolved contest.
    setup: setup({
      seed: "corpus-campaign-b",
      startAge: 41,
      placeKey: "lexington-fayette",
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "lives-alone",
    }),
    steps: 6,
    prefer: ["take-it-on"],
    campaign: "file-and-run",
  },
  {
    key: "campaign-without-the-work",
    intent:
      "A filed candidacy that is never worked: the same control seed and the same life as `campaign-and-office`, with the campaign left alone. It is here so the matrix demonstrates a defeat for a reason it can name.",
    // Deliberately the SAME seed and setup as `campaign-and-office`.
    //
    // That is the point of the lane. Two lanes that campaign identically can
    // only differ by the swing, and reading a defeat off that is reading it off
    // luck — which is how this matrix lost its `election-lost` claim in the
    // first place, when a legitimate change to the opening's time model moved
    // the campaign to a different month of the cycle and both borderline
    // contests landed on the other side of the line.
    //
    // Holding the seed, the person and the beats fixed and changing only
    // whether the candidate did the work makes the outcome attributable to the
    // work. Measured across accepted main ec437eda and this branch, a candidate
    // who works no afternoon loses by between three and a half and seven and a
    // half points, and the same candidate working six wins by ten or more. The
    // defeat is still read off the resolved contest and is still free to stop
    // happening — if it does, that is a finding about the game, which is what
    // this matrix is for.
    setup: setup({
      seed: "p85c-owner-clock",
      startAge: 34,
      placeKey: "lexington-fayette",
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      gender: "male",
      pronouns: "he-him",
    }),
    steps: 6,
    prefer: ["take-it-on"],
    campaign: "file-only",
  },
];

export interface TranscriptBeat {
  readonly ordinal: number;
  readonly date: string;
  readonly age: number;
  readonly sceneKind: StoryMoment["scene"]["kind"];
  readonly episodeKey: string | null;
  readonly stageKey: string | null;
  readonly instanceKey: string | null;
  readonly connective: readonly string[];
  readonly prose: string;
  readonly options: readonly { key: string; label: string }[];
  readonly chosen: string;
  readonly people: readonly string[];
  readonly openThreads: readonly string[];
  /** Canonical grounding the beat itself carries, for interpreting the prose. */
  readonly causalInputs: readonly string[];
}

export interface CampaignTranscript {
  readonly filed: boolean;
  readonly office: string | null;
  readonly sessions: readonly string[];
  readonly resolved: boolean;
  readonly outcome: string | null;
  readonly lines: readonly string[];
  /**
   * The legislative surface, when winning actually opened one.
   *
   * Null after a loss or an explicit session refusal, and after a win the capability layer does not
   * grant — a state reference without a playable room stays a placeholder
   * (PR #85), and the corpus reports that rather than opening a room the game
   * would not have opened.
   */
  readonly legislative: LegislativeTranscript | null;
  readonly legislativeRefusal: string | null;
}

export interface LegislativeTranscript {
  readonly scenarioKey: string;
  readonly designation: string;
  readonly headline: string;
  readonly stage: string;
  readonly lines: readonly string[];
  readonly openQuestions: readonly string[];
}

export interface SeedTranscript {
  readonly key: string;
  readonly intent: string;
  readonly seed: string;
  readonly startAge: number;
  readonly personName: string;
  readonly beats: readonly TranscriptBeat[];
  readonly campaign: CampaignTranscript | null;
  /** What this seed actually demonstrated, as opposed to what it intended. */
  readonly demonstrated: readonly string[];
  readonly realizations: readonly ProseRealizationRecord[];
}

function preferChooser(
  wanted: readonly string[],
): (moment: StoryMoment) => string {
  return (moment) => {
    for (const key of wanted) {
      if (moment.scene.options.some((option) => option.key === key)) return key;
    }
    return moment.scene.options[0]?.key ?? "";
  };
}

function hash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}

/**
 * Link a realized line back to the template it came from.
 *
 * Exact text after whitespace normalization, because a realized line whose
 * slots were filled no longer matches its template character for character.
 * A line that matches nothing is recorded with a null template rather than
 * guessed at — an unlinked realization is a finding, not something to paper
 * over.
 */
function linkRealization(
  text: string,
  byText: ReadonlyMap<string, string>,
  seedKey: string,
  ordinal: number,
): ProseRealizationRecord {
  return {
    templateId: byText.get(normalizeForMatch(text)) ?? null,
    text,
    textHash: hash(text),
    seedKey,
    beatOrdinal: ordinal,
  };
}

function runCampaign(
  world: World,
  personId: EntityId,
  afternoons: number,
): { world: World; transcript: CampaignTranscript } {
  const lines: string[] = [];
  let current = fileForOffice(openOrdinaryLife(world, personId), personId);
  const campaign = campaignForCandidate(current, personId);
  if (!campaign) {
    return {
      world: current,
      transcript: {
        filed: false,
        office: null,
        sessions: [],
        resolved: false,
        outcome: null,
        lines: ["No candidacy was filed; the seed did not reach the spine."],
        legislative: null,
        legislativeRefusal: null,
      },
    };
  }
  const view = projectCampaign(current, personId);
  if (view) {
    if (view.officeTitle) lines.push(view.officeTitle);
    if (view.officeAuthority) lines.push(view.officeAuthority);
    lines.push(...view.openQuestions);
    lines.push(...view.offers.map((offer) => offer.label));
  }
  // Afternoons spent talking to people, where there are any to spend.
  //
  // The loop used to take whichever offer came first in the list, which is
  // always fundraising, so every transcript candidate in the corpus ran a
  // campaign consisting entirely of phone calls and never once knocked on a
  // door. Money is not support — the campaign suite pins that raising it moves
  // no canonical support at all — so the contests were being decided by the
  // bounded keyed swing rather than by anything the candidate did. Preferring
  // outreach is not a thumb on the scale: it is the transcript playing the
  // game rather than taking the first button on the screen.
  //
  // P-UI8: the loop asked for six afternoons and silently took two.
  //
  // A day holds two campaign slots. When the third ask came back "The rest of
  // today is already spoken for. Get on with the day and pick this up
  // tomorrow.", the loop simply stopped, so every campaigning transcript ran a
  // two-afternoon campaign while its comment described six. Two afternoons is
  // exactly the crossover: measured on this matrix, each canvassed afternoon
  // is worth roughly three points of final margin, a candidate who works one
  // afternoon loses and one who works two wins by under two points. Both
  // contests were therefore being decided inside the residual swing, on
  // accepted main as much as here, and any legitimate shift of the campaign's
  // position in the calendar could flip either of them.
  //
  // So the loop now does what the refusal tells a player to do: pass the day
  // through `passOrdinaryDays` — the same seam the player's own control on the
  // game screen calls — and canvass again tomorrow. Nothing is scaled and no
  // outcome is written; the candidate just stops being cut off mid-campaign.
  const sessions: string[] = [];
  // A single calendar crossing may stop at several authored commitments before
  // it reaches the next morning. Count those interruptions as progress, not as
  // campaign afternoons spent; otherwise a busy diary can exhaust the loop's
  // guard while the transcript still contains only the first day's sessions.
  for (let step = 0; sessions.length < afternoons && step < 256; step += 1) {
    if (electionContestResult(current, campaign.contestId)) break;
    const offers = (projectCampaign(current, personId)?.offers ?? []).filter(
      (candidate) => candidate.unavailable === null,
    );
    const offer =
      offers.find((candidate) => candidate.kind === "outreach") ?? offers[0];
    if (offer) {
      sessions.push(offer.label);
      current = spendAnAfternoon(current, personId, offer.kind);
      continue;
    }
    // Today is spent. Tomorrow is a real day the campaign has to reach. If a
    // confirmed commitment stops the clock, this scripted corpus player
    // explicitly performs that exact activity before asking time to move
    // again; it never relies on the removed whole-day bypass.
    const tomorrow = passOrdinaryDays(current);
    if (tomorrow === current) {
      const blocker = current.history.scheduledActivities.find((activity) => {
        const state = scheduledActivityState(current, activity.id);
        return (
          state.status === "scheduled" &&
          state.start.date === current.currentMoment.date &&
          state.start.minuteOfDay === current.currentMoment.minuteOfDay &&
          activity.responsiblePersonId === personId
        );
      });
      if (!blocker) break;
      const performed = performScheduledActivity(
        current,
        blocker.id,
        createCampaignElectionTransitionRegistry(),
      );
      if (performed === current) break;
      current = performed;
      continue;
    }
    current = tomorrow;
  }
  // Let the clock reach the contest rather than writing a result.
  for (let index = 0; index < 60; index += 1) {
    if (electionContestResult(current, campaign.contestId)) break;
    current = letStoryTimePass(current, personId);
  }
  const result = electionContestResult(current, campaign.contestId);
  const after = projectCampaign(current, personId);
  if (after?.afterword) lines.push(after.afterword);

  const won = Boolean(result) && result?.winnerPersonId === personId;
  let legislative: LegislativeTranscript | null = null;
  let legislativeRefusal: string | null = null;
  if (won) {
    const capabilities = resolvePlayerCapabilities(current);
    if (
      capabilities.legislation &&
      capabilities.legislativeScenarioKey &&
      capabilities.legislativeJurisdictionId
    ) {
      try {
        const opened = openLegislativeWork(current, {
          playerPersonId: personId,
          scenarioKey: capabilities.legislativeScenarioKey,
          jurisdictionId: capabilities.legislativeJurisdictionId,
        });
        current = opened.world;
        const briefing = projectMeasureBriefing(
          current,
          opened.assignment.measureId,
        );
        legislative = {
          scenarioKey: capabilities.legislativeScenarioKey,
          designation: briefing.designation,
          headline: briefing.shortTitle,
          stage: briefing.whereItStands,
          lines: [
            briefing.summary,
            briefing.whereItStands,
            ...(briefing.whatJustHappened ? [briefing.whatJustHappened] : []),
            briefing.whoDecidesNext,
            briefing.whatHappensNext,
            ...(briefing.requirementNote ? [briefing.requirementNote] : []),
            ...briefing.options.map((option) => option.label),
            ...briefing.deadlines,
          ],
          openQuestions: [...briefing.uncertainties],
        };
      } catch (error) {
        if (!(error instanceof RegularSessionUnavailableError)) throw error;
        legislativeRefusal = error.message;
        lines.push(legislativeRefusal);
      }
    }
  }

  return {
    world: current,
    transcript: {
      filed: true,
      office: view?.officeTitle ?? null,
      sessions,
      resolved: Boolean(result),
      outcome: result ? (won ? "won" : "lost") : null,
      lines,
      legislative,
      legislativeRefusal,
    },
  };
}

export function runSeedTranscript(
  family: SeedFamily,
  inventory: ProseInventory,
): SeedTranscript {
  const byText = new Map<string, string>();
  for (const record of inventory.records) {
    const key = normalizeForMatch(record.text);
    if (!byText.has(key)) byText.set(key, record.id);
  }

  const created = createNewGameWorld(family.setup);
  let world = created.world;
  const personId = created.playerPersonId;
  const choose = preferChooser(family.prefer);
  const beats: TranscriptBeat[] = [];
  const realizations: ProseRealizationRecord[] = [];
  let personName = "";

  for (let ordinal = 0; ordinal < family.steps; ordinal += 1) {
    const moment = projectStoryMoment(world, personId);
    personName = moment.personName;
    const wanted = choose(moment);
    const option =
      moment.scene.options.find((candidate) => candidate.key === wanted) ??
      moment.scene.options[0];
    if (!option) break;

    const scene = moment.scene;
    beats.push({
      ordinal,
      date: world.currentDate,
      age: moment.age,
      sceneKind: scene.kind,
      episodeKey: scene.kind === "episode" ? scene.beat.episodeKey : null,
      stageKey: scene.kind === "episode" ? scene.beat.stageKey : null,
      instanceKey: scene.kind === "episode" ? scene.beat.instanceKey : null,
      connective: moment.connective.sentences,
      prose: scene.prose,
      options: scene.options.map((entry) => ({
        key: entry.key,
        label: entry.label,
      })),
      chosen: option.key,
      people: scene.presentPeople.map((person) => person.introduction),
      openThreads: moment.openThreads.map((thread) => thread.sentence),
      causalInputs:
        scene.kind === "episode"
          ? scene.beat.causalInputs.map((input) => input.detail)
          : [],
    });

    realizations.push(
      linkRealization(scene.prose, byText, family.key, ordinal),
      ...moment.connective.sentences.map((sentence) =>
        linkRealization(sentence, byText, family.key, ordinal),
      ),
      ...scene.options.map((entry) =>
        linkRealization(entry.label, byText, family.key, ordinal),
      ),
    );

    world = chooseStoryOption(world, {
      personId,
      scene,
      optionKey: option.key,
    });
  }

  let campaign: CampaignTranscript | null = null;
  if (family.campaign === "file-and-run" || family.campaign === "file-only") {
    const outcome = runCampaign(
      world,
      personId,
      family.campaign === "file-only" ? 0 : CAMPAIGN_AFTERNOONS,
    );
    world = outcome.world;
    campaign = outcome.transcript;
  }

  return {
    key: family.key,
    intent: family.intent,
    seed: family.setup.seed,
    startAge: family.setup.startAge,
    personName,
    beats,
    campaign,
    demonstrated: demonstratedBy(beats, campaign),
    realizations,
  };
}

/** What the run actually reached, read off the beats rather than assumed. */
function demonstratedBy(
  beats: readonly TranscriptBeat[],
  campaign: CampaignTranscript | null,
): readonly string[] {
  const shown = new Set<string>();
  for (const beat of beats) {
    shown.add(`scene:${beat.sceneKind}`);
    if (beat.age < 13) shown.add("age-band:childhood");
    else if (beat.age < 18) shown.add("age-band:adolescence");
    else shown.add("age-band:adult");
    if (beat.episodeKey) shown.add(`episode:${beat.episodeKey}`);
    if (beat.connective.length > 0) shown.add("connective-narration");
    if (beat.openThreads.length > 0) shown.add("thread-recap");
    if (beat.people.length > 0) shown.add("person-introduction");
  }
  // Continuation is claimed from the record, and at three different strengths,
  // because they are three different claims. An instance appearing twice is not
  // the same evidence as the same bound person years apart, and neither is
  // proof of the particular 92C childhood pact returning — an audit asked for
  // that distinction and it is worth keeping.
  const instanceBeats = new Map<string, TranscriptBeat[]>();
  for (const beat of beats) {
    if (!beat.instanceKey) continue;
    const list = instanceBeats.get(beat.instanceKey) ?? [];
    list.push(beat);
    instanceBeats.set(beat.instanceKey, list);
  }
  for (const [instanceKey, played] of instanceBeats) {
    if (played.length < 2) continue;
    shown.add("persistent-instance-continuation");

    const ages = played.map((beat) => beat.age);
    const span = Math.max(...ages) - Math.min(...ages);
    // The instance key carries its bound role, so a family that binds a person
    // says so; one that does not cannot claim a person returned.
    if (span >= 5 && instanceKey.includes("=")) {
      shown.add("persistent-cast-across-years");
    }

    // The 92C pact callback, claimed only on an actual matching trace: the
    // pact stage played, and a later stage of that same instance after it.
    const pact = played.find((beat) => beat.stageKey === "best-friend-pact");
    if (!pact) continue;
    const later = played.find(
      (beat) => beat.ordinal > pact.ordinal && beat.age > pact.age,
    );
    if (later) shown.add("92c-childhood-pact-callback");
  }
  if (campaign?.filed) shown.add("candidacy-filed");
  if ((campaign?.sessions.length ?? 0) > 0) shown.add("campaign-sessions");
  if (campaign?.resolved) shown.add(`election-${campaign.outcome}`);
  if (campaign?.legislative) shown.add("legislative-measure-briefing");
  if (campaign?.legislativeRefusal)
    shown.add("legislative-session-unavailable");
  return [...shown].sort();
}

export function runTranscriptMatrix(
  inventory: ProseInventory,
): readonly SeedTranscript[] {
  return SEED_FAMILIES.map((family) => runSeedTranscript(family, inventory));
}
