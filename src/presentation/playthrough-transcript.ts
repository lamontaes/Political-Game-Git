import {
  narrativeThreads,
  type EntityId,
  type NarrativeThread,
  type World,
} from "../simulation";
import { lifeShapeReport, type LifeShapeReport } from "./life-diagnostics";
import {
  chooseStoryOption,
  projectStoryMoment,
  traceStorySelection,
  type StoryMoment,
  type StoryScene,
} from "./life-story";
import { createNewGameWorld, type NewGameSetup } from "./new-game";
import {
  answerQuestionnaire,
  questionnaireScreenFor,
} from "./setup-questionnaire-flow";

/**
 * A whole life, played to a readable transcript.
 *
 * This is the deterministic playthrough harness the overnight audit asks for.
 * It exists BESIDE `life-diagnostics.ts`, which answers a different question:
 * that file reports the calibration and the selection maths for a developer;
 * this one renders the lived story the way a player reads it, so that sequence,
 * continuity, age-fit, people-presence and consequence can be judged across a
 * whole life rather than one screenshot.
 *
 * It writes nothing to a player surface and it is not imported by one. It reads
 * the same functions the play surface reads — `projectStoryMoment`,
 * `chooseStoryOption` — so a transcript is what a player would actually get,
 * not a second rendering that could drift from the game.
 *
 * Determinism is the whole point. A run is a pure function of (setup, beats,
 * chooser): same inputs, byte-identical transcript, on any machine and on any
 * day. Nothing here reads the clock or a random source; where variety is
 * wanted, it comes from a seeded hash of the run's own strings.
 */

/* -------------------------------------------------------------------------- */
/* Choosing, deterministically                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Which option a simulated player takes at a scene or a calibration question.
 *
 * A chooser is a pure function of the beat index and the options on offer, so
 * it is reproducible. `vary` spreads choices across the run to cover more of
 * the content bank; `fixed` pins one column for before/after comparisons.
 */
export type Chooser = (
  beatIndex: number,
  optionKeys: readonly string[],
  seed: string,
) => string;

function hashInt(text: string): number {
  let total = 0;
  for (const character of text) {
    total = (total * 31 + character.charCodeAt(0)) % 2_147_483_647;
  }
  return total;
}

/** Take the same column every time (clamped to what the scene offers). */
export function fixedChooser(index: number): Chooser {
  return (_beat, keys) => keys[Math.min(index, keys.length - 1)] ?? keys[0]!;
}

/** Spread choices across the run, deterministically, to widen coverage. */
export function varyingChooser(): Chooser {
  return (beat, keys, seed) =>
    keys[hashInt(`${seed}:${beat}:${keys.join(",")}`) % keys.length] ??
    keys[0]!;
}

/* -------------------------------------------------------------------------- */
/* Shapes                                                                      */
/* -------------------------------------------------------------------------- */

export interface TranscriptSentence {
  readonly text: string;
  readonly kind: string;
  /** True when a canonical record stands behind the sentence's claim. */
  readonly recordBacked: boolean;
  readonly note: string;
}

export interface TranscriptPerson {
  readonly name: string;
  readonly relationship: string | null;
  readonly introduction: string;
}

export interface TranscriptConsequence {
  /** Canonical event summaries the choice (and the time after it) produced. */
  readonly eventSummaries: readonly string[];
  /** Threads that did not exist before this beat and do now. */
  readonly newThreadTitles: readonly string[];
  /** Threads whose standing changed across the beat. */
  readonly movedThreadTitles: readonly string[];
  /** True when the beat changed nothing a later beat could surface. */
  readonly inert: boolean;
}

export interface TranscriptBeat {
  readonly index: number;
  readonly age: number;
  readonly date: string;
  readonly isoDate: string;
  readonly place: string | null;
  readonly formativeYears: boolean;
  readonly sceneKind: StoryScene["kind"];
  readonly connective: readonly TranscriptSentence[];
  readonly authoredProse: string;
  readonly presentPeople: readonly TranscriptPerson[];
  readonly openThreads: readonly string[];
  readonly options: readonly {
    readonly key: string;
    readonly label: string;
    readonly description: string;
  }[];
  readonly chosenKey: string | null;
  readonly chosenLabel: string | null;
  /** The selector's own account — developer-only, never shown to a player. */
  readonly selection: {
    readonly reason: string | null;
    readonly candidateCount: number;
    readonly episodeCandidates: number;
    readonly bankCandidates: number;
    readonly continuedThreadKey: string | null;
  };
  readonly consequence: TranscriptConsequence;
}

export interface Transcript {
  readonly label: string;
  readonly setup: NewGameSetup;
  readonly personName: string;
  readonly startAge: number;
  readonly beats: readonly TranscriptBeat[];
  readonly finalShape: LifeShapeReport;
}

/* -------------------------------------------------------------------------- */
/* Running a life                                                              */
/* -------------------------------------------------------------------------- */

export interface PlaythroughConfig {
  readonly label: string;
  /** The base setup. When it names a questionnaire path, it is walked here. */
  readonly setup: NewGameSetup;
  readonly beats: number;
  readonly choose: Chooser;
}

/**
 * Walks the calibration to completion, so the world is built with the priors a
 * real player would have produced along the chosen path. Mirrors the loop in
 * `life-diagnostics.ts` rather than reaching into its internals.
 */
function calibrate(setup: NewGameSetup, choose: Chooser): NewGameSetup {
  let calibrated = setup;
  for (let asked = 0; asked < 80; asked += 1) {
    const screen = questionnaireScreenFor(calibrated);
    if (!screen) break;
    const keys = screen.options.map((option) => option.key);
    if (keys.length === 0) break;
    const key = choose(1000 + asked, keys, `${setup.seed}:calibration`);
    calibrated = answerQuestionnaire(calibrated, key);
  }
  return calibrated;
}

function threadSignature(
  threads: readonly NarrativeThread[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const thread of threads) map.set(thread.key, thread.standing);
  return map;
}

function playerEventSummaries(
  world: World,
  personId: EntityId,
  afterSequence: number,
): readonly string[] {
  return world.history.events
    .filter(
      (event) =>
        event.sequence > afterSequence &&
        event.involvedEntityIds.includes(personId) &&
        event.occurredAt <= world.currentDate,
    )
    .sort((left, right) => left.sequence - right.sequence)
    .map((event) => event.summary)
    .filter((summary) => summary.trim().length > 0);
}

function maxPlayerSequence(world: World, personId: EntityId): number {
  return world.history.events
    .filter((event) => event.involvedEntityIds.includes(personId))
    .reduce((max, event) => Math.max(max, event.sequence), 0);
}

export function runPlaythrough(config: PlaythroughConfig): Transcript {
  const calibrated = calibrate(config.setup, config.choose);
  const game = createNewGameWorld(calibrated);
  const personId = game.playerPersonId;

  let world = game.world;
  const beats: TranscriptBeat[] = [];

  for (let index = 0; index < config.beats; index += 1) {
    const moment: StoryMoment = projectStoryMoment(world, personId);
    const trace = traceStorySelection(world, personId);

    const beforeThreads = threadSignature(narrativeThreads(world, personId));
    const beforeSequence = maxPlayerSequence(world, personId);

    const optionKeys = moment.scene.options.map((option) => option.key);
    const chosenKey =
      optionKeys.length > 0
        ? config.choose(index, optionKeys, config.setup.seed)
        : null;
    const chosenOption = moment.scene.options.find(
      (option) => option.key === chosenKey,
    );

    // Apply the choice, which also lets the appropriate amount of time pass.
    if (chosenKey) {
      world = chooseStoryOption(world, {
        personId,
        scene: moment.scene,
        optionKey: chosenKey,
      });
    }

    const newThreadTitles: string[] = [];
    const movedThreadTitles: string[] = [];
    for (const thread of narrativeThreads(world, personId)) {
      const before = beforeThreads.get(thread.key);
      if (before === undefined) newThreadTitles.push(thread.title);
      else if (before !== thread.standing) movedThreadTitles.push(thread.title);
    }
    const eventSummaries = playerEventSummaries(
      world,
      personId,
      beforeSequence,
    ).slice(0, 6);

    beats.push({
      index,
      age: moment.age,
      date: moment.dateLabel,
      isoDate: momentIso(world),
      place: moment.placeName,
      formativeYears: moment.formativeYears,
      sceneKind: moment.scene.kind,
      connective: moment.connective.sentences.map((text, sentenceIndex) => {
        const source = moment.connective.sources.find(
          (candidate) => candidate.sentenceIndex === sentenceIndex,
        );
        return {
          text,
          kind: source?.kind ?? "unknown",
          recordBacked: (source?.anchors.length ?? 0) > 0,
          note: source?.note ?? "",
        };
      }),
      authoredProse: moment.scene.prose,
      presentPeople: moment.scene.presentPeople.map((person) => ({
        name: person.name,
        relationship: person.relationship,
        introduction: person.introduction,
      })),
      openThreads: moment.openThreads.map((recap) => recap.sentence),
      options: moment.scene.options.map((option) => ({
        key: option.key,
        label: option.label,
        description: option.description,
      })),
      chosenKey,
      chosenLabel: chosenOption?.label ?? null,
      selection: {
        reason: trace.reason,
        candidateCount: trace.candidateCount,
        episodeCandidates: trace.episodeCandidates,
        bankCandidates: trace.bankCandidates,
        continuedThreadKey: trace.continuedThreadKey,
      },
      consequence: {
        eventSummaries,
        newThreadTitles,
        movedThreadTitles,
        inert:
          moment.scene.kind !== "ordinary-stretch" &&
          eventSummaries.length === 0 &&
          newThreadTitles.length === 0 &&
          movedThreadTitles.length === 0,
      },
    });

    if (!chosenKey) break;
  }

  return {
    label: config.label,
    setup: calibrated,
    personName: projectStoryMoment(game.world, personId).personName,
    startAge: config.setup.startAge,
    beats,
    finalShape: lifeShapeReport(world, personId),
  };
}

function momentIso(world: World): string {
  return world.currentDate;
}

/* -------------------------------------------------------------------------- */
/* Rendering a transcript for a reader                                         */
/* -------------------------------------------------------------------------- */

/**
 * The transcript as the owner asked to read it: age, date, place, who is
 * there, what the player is told, what they can do, what was chosen, and what
 * came of it — with a compact developer footer that stays clearly separate
 * from the story.
 */
export function transcriptToMarkdown(transcript: Transcript): string {
  const lines: string[] = [];
  const setup = transcript.setup;
  lines.push(`## ${transcript.label}`);
  lines.push("");
  lines.push(
    `**${transcript.personName || "(unnamed)"}** — starts at age ${transcript.startAge} in ${
      setup.placeKey
    }. Household: ${setup.household}. Depth: ${setup.depth}. Questionnaire: ${
      setup.questionnaire ?? "skipped"
    } (${setup.priors?.length ?? 0} answered). Gender: ${setup.gender ?? "unstated"}. Seed: \`${setup.seed}\`.`,
  );
  lines.push("");

  for (const beat of transcript.beats) {
    lines.push(
      `### Beat ${beat.index + 1} — age ${beat.age}, ${beat.date}${
        beat.place ? `, ${beat.place}` : ""
      }`,
    );
    if (beat.presentPeople.length > 0) {
      lines.push(
        `*Present:* ${beat.presentPeople
          .map((person) => person.introduction)
          .join("; ")}`,
      );
    }
    if (beat.connective.length > 0) {
      lines.push("");
      for (const sentence of beat.connective) {
        lines.push(`> ${sentence.text}`);
      }
    }
    if (beat.authoredProse.trim().length > 0) {
      lines.push("");
      lines.push(beat.authoredProse.trim());
    } else if (beat.sceneKind === "ordinary-stretch") {
      lines.push("");
      lines.push("*(nothing needs deciding — an ordinary stretch)*");
    }
    if (beat.options.length > 0) {
      lines.push("");
      lines.push("**Choices:**");
      for (const option of beat.options) {
        const mark = option.key === beat.chosenKey ? "→ " : "  ";
        lines.push(
          `${mark}- **${option.label}**${
            option.description ? ` — ${option.description}` : ""
          }`,
        );
      }
    }
    if (beat.openThreads.length > 0) {
      lines.push("");
      lines.push(
        `*Open in this life:* ${beat.openThreads.map((t) => `“${t}”`).join(" ")}`,
      );
    }
    const consequence = beat.consequence;
    lines.push("");
    if (consequence.inert) {
      lines.push(`*Consequence:* **none the world recorded.**`);
    } else {
      const parts: string[] = [];
      if (consequence.eventSummaries.length > 0) {
        parts.push(consequence.eventSummaries.map((s) => `“${s}”`).join(" "));
      }
      if (consequence.newThreadTitles.length > 0) {
        parts.push(`opens: ${consequence.newThreadTitles.join(", ")}`);
      }
      if (consequence.movedThreadTitles.length > 0) {
        parts.push(`moves: ${consequence.movedThreadTitles.join(", ")}`);
      }
      lines.push(
        `*Consequence:* ${parts.length > 0 ? parts.join(" · ") : "time passed"}`,
      );
    }
    lines.push("");
    lines.push(
      `<sub>dev: scene=${beat.sceneKind} · selector=${
        beat.selection.reason ?? "—"
      } · candidates=${beat.selection.candidateCount} (${
        beat.selection.episodeCandidates
      } composed / ${beat.selection.bankCandidates} authored)${
        beat.selection.continuedThreadKey
          ? ` · continues ${beat.selection.continuedThreadKey}`
          : ""
      }</sub>`,
    );
    lines.push("");
  }
  return lines.join("\n");
}

/* -------------------------------------------------------------------------- */
/* Prose inventory, for the owner review packet                                */
/* -------------------------------------------------------------------------- */

export type ProseItemKind =
  "connective" | "authored-scene" | "choice" | "thread-recap";

export interface ProseInventoryItem {
  /** Stable within a transcript; the corpus driver prefixes a durable F-id. */
  readonly localKey: string;
  readonly kind: ProseItemKind;
  readonly text: string;
  readonly age: number;
  readonly date: string;
  readonly place: string | null;
  readonly sceneKind: string;
  readonly present: readonly string[];
  readonly configLabel: string;
  readonly personName: string;
  /** For connective sentences only: whether a canonical record backs it. */
  readonly recordBacked: boolean | null;
}

/** Every distinct player-facing string a transcript produced, with context. */
export function transcriptToInventory(
  transcript: Transcript,
): readonly ProseInventoryItem[] {
  const items: ProseInventoryItem[] = [];
  const base = {
    configLabel: transcript.label,
    personName: transcript.personName,
  };
  for (const beat of transcript.beats) {
    const context = {
      age: beat.age,
      date: beat.date,
      place: beat.place,
      sceneKind: beat.sceneKind,
      present: beat.presentPeople.map((person) => person.introduction),
      ...base,
    };
    beat.connective.forEach((sentence, ordinal) => {
      items.push({
        localKey: `b${beat.index}.connective.${ordinal}`,
        kind: "connective",
        text: sentence.text,
        recordBacked: sentence.recordBacked,
        ...context,
      });
    });
    if (beat.authoredProse.trim().length > 0) {
      items.push({
        localKey: `b${beat.index}.scene`,
        kind: "authored-scene",
        text: beat.authoredProse.trim(),
        recordBacked: null,
        ...context,
      });
    }
    beat.options.forEach((option, ordinal) => {
      const text = option.description
        ? `${option.label} — ${option.description}`
        : option.label;
      items.push({
        localKey: `b${beat.index}.choice.${ordinal}`,
        kind: "choice",
        text,
        recordBacked: null,
        ...context,
      });
    });
    beat.openThreads.forEach((thread, ordinal) => {
      items.push({
        localKey: `b${beat.index}.thread.${ordinal}`,
        kind: "thread-recap",
        text: thread,
        recordBacked: null,
        ...context,
      });
    });
  }
  return items;
}

/* -------------------------------------------------------------------------- */
/* Narrative lint — diagnostic, never canonical                                */
/* -------------------------------------------------------------------------- */

export type LintCategory =
  | "repeated-adjacent"
  | "repeated-run"
  | "machine-cadence"
  | "empty-beat"
  | "no-consequence"
  | "unbacked-connective"
  | "vocative-binding"
  | "unintroduced-person"
  | "age-vocabulary"
  | "vague-referent";

export interface LintFinding {
  readonly category: LintCategory;
  readonly beatIndex: number;
  readonly detail: string;
  readonly text: string;
}

const MACHINE_CADENCE =
  /\b(carried on being|went on being|went on as it does|kept (?:happening|going|meeting)|most (?:evenings|of them).*unremarkable|carried on|the same shifts, the same people)\b/i;

/** Words a pre-teen character has no business being offered or told about. */
const ADULT_VOCABULARY =
  /\b(mortgage|tuition|candidacy|the ballot|lease|licence|license fee|committee vote|floor vote|the bill\b|campaign\b|escrow|401k|refinance|zoning board|city council seat)\b/i;

const NAME_PATTERN = /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g;

/**
 * A scenario that names its stakes only as "the thing" or "the plan" gives the
 * player nothing concrete to picture or reason about. Deliberately narrow so it
 * catches the abstract formative-bank setups without flagging a scene that is
 * vague on purpose because the character genuinely does not yet know (e.g. the
 * corridor incident, where "something got broken" is the point).
 */
const VAGUE_REFERENT =
  /\bthe thing (?:that|you)\b|\bthe thing that was planned\b|\bthe plan (?:changed|is)\b|\bthe thing you signed up for\b/i;

export function narrativeLint(transcript: Transcript): readonly LintFinding[] {
  const findings: LintFinding[] = [];
  const seenCounts = new Map<string, number[]>();
  let previousSentences = new Set<string>();

  for (const beat of transcript.beats) {
    const prose = beat.authoredProse.trim();
    const rendered = [
      ...beat.connective.map((sentence) => sentence.text),
      ...(prose.length > 0 ? [prose] : []),
    ];

    for (const text of rendered) {
      const normalized = text.trim();
      if (previousSentences.has(normalized)) {
        findings.push({
          category: "repeated-adjacent",
          beatIndex: beat.index,
          detail: "Same sentence as the immediately preceding beat.",
          text: normalized,
        });
      }
      const list = seenCounts.get(normalized) ?? [];
      list.push(beat.index);
      seenCounts.set(normalized, list);
      if (MACHINE_CADENCE.test(normalized)) {
        findings.push({
          category: "machine-cadence",
          beatIndex: beat.index,
          detail: "Reads as state-not-changing filler rather than observation.",
          text: normalized,
        });
      }
    }
    previousSentences = new Set(rendered.map((text) => text.trim()));

    for (const sentence of beat.connective) {
      if (
        !sentence.recordBacked &&
        sentence.kind !== "elapsed" &&
        sentence.kind !== "place"
      ) {
        findings.push({
          category: "unbacked-connective",
          beatIndex: beat.index,
          detail: `A '${sentence.kind}' connective sentence with no record behind it.`,
          text: sentence.text,
        });
      }
    }

    // A truly empty beat is one where nothing rendered a decision at all. A
    // story-ranking of zero is NOT that: the formative bank is asked directly
    // when the ranking is empty and usually returns a real scene, so flagging
    // candidates===0 mislabels a working fallback as dead time.
    if (beat.sceneKind === "ordinary-stretch") {
      findings.push({
        category: "empty-beat",
        beatIndex: beat.index,
        detail: "Nothing to decide — an ordinary stretch with no scene.",
        text: "(ordinary stretch)",
      });
    }

    if (VAGUE_REFERENT.test(prose)) {
      findings.push({
        category: "vague-referent",
        beatIndex: beat.index,
        detail:
          "Scenario names its stakes only as 'the thing'/'the plan' — nothing concrete to picture.",
        text: prose,
      });
    }

    if (beat.consequence.inert) {
      findings.push({
        category: "no-consequence",
        beatIndex: beat.index,
        detail:
          "A decided beat that changed nothing a later beat could surface.",
        text: beat.authoredProse.trim(),
      });
    }

    // Vocative binding: "<Person Name>, your ..." where the name is present but
    // is not the player — the scene addresses a bound peer by name.
    const presentNames = new Set(
      beat.presentPeople.map((person) => person.name),
    );
    const vocative = prose.match(/^([A-Z][a-z]+ [A-Z][a-z]+), your\b/);
    if (vocative && presentNames.has(vocative[1]!)) {
      findings.push({
        category: "vocative-binding",
        beatIndex: beat.index,
        detail: `Scene opens by addressing '${vocative[1]}' then says 'your' — a bound-role vocative smell.`,
        text: prose,
      });
    }

    // Unintroduced person: a full name appears in scene prose that is not in
    // the present-people list and is not the player.
    const introduced = new Set<string>([
      transcript.personName,
      ...presentNames,
    ]);
    for (const match of prose.matchAll(NAME_PATTERN)) {
      const name = match[1]!;
      if (!introduced.has(name)) {
        findings.push({
          category: "unintroduced-person",
          beatIndex: beat.index,
          detail: `'${name}' appears in scene prose but is not among the present people.`,
          text: prose,
        });
        introduced.add(name); // one report per name per beat
      }
    }

    // Age vocabulary: adult-only terms offered to a young child.
    if (beat.age < 13) {
      const haystack = [
        prose,
        ...beat.options.map(
          (option) => `${option.label} ${option.description}`,
        ),
      ].join(" ");
      const hit = haystack.match(ADULT_VOCABULARY);
      if (hit) {
        findings.push({
          category: "age-vocabulary",
          beatIndex: beat.index,
          detail: `Adult vocabulary '${hit[0]}' offered to a ${beat.age}-year-old.`,
          text: prose,
        });
      }
    }
  }

  for (const [text, indices] of seenCounts) {
    if (indices.length >= 3) {
      findings.push({
        category: "repeated-run",
        beatIndex: indices[0]!,
        detail: `Appears in ${indices.length} beats (${indices.join(", ")}).`,
        text,
      });
    }
  }

  return findings;
}
