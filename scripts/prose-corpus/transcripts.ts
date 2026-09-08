import { createHash } from "node:crypto";
import {
  campaignForCandidate,
  electionContestResult,
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
import { openOrdinaryLife } from "../../src/presentation/ordinary-life";
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
  /** Run the campaign spine after the life beats. */
  readonly campaign?: "file-and-run" | null;
}

function setup(overrides: Partial<NewGameSetup>): NewGameSetup {
  return {
    ...DEFAULT_NEW_GAME_SETUP,
    questionnaire: "skipped",
    seed: "corpus",
    ...overrides,
  };
}

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
   * Null after a loss, and null after a win the capability layer does not
   * grant — a state reference without a playable room stays a placeholder
   * (PR #85), and the corpus reports that rather than opening a room the game
   * would not have opened.
   */
  readonly legislative: LegislativeTranscript | null;
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
  const sessions: string[] = [];
  for (let index = 0; index < 6; index += 1) {
    const offers = projectCampaign(current, personId)?.offers ?? [];
    const offer = offers.find((candidate) => candidate.unavailable === null);
    if (!offer) break;
    sessions.push(offer.label);
    current = spendAnAfternoon(current, personId, offer.kind);
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
  if (won) {
    const capabilities = resolvePlayerCapabilities(current);
    if (
      capabilities.legislation &&
      capabilities.legislativeScenarioKey &&
      capabilities.legislativeJurisdictionId
    ) {
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
  if (family.campaign === "file-and-run") {
    const outcome = runCampaign(world, personId);
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
  return [...shown].sort();
}

export function runTranscriptMatrix(
  inventory: ProseInventory,
): readonly SeedTranscript[] {
  return SEED_FAMILIES.map((family) => runSeedTranscript(family, inventory));
}
