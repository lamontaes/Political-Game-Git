/**
 * The dialogue report: every conversation seeded lives actually had.
 *
 *   npm run dialogue:report -- --lives 3 --days 30 --seed round-1 \
 *     [--ages 10,17,34,52] [--out test-results/dialogue-report/round-1.md]
 *
 * Each life starts through the ordinary new-game setup in a place drawn from
 * every state, D.C. and the territories, and moves time with the same Day
 * command the shell's Day button submits. Each day, every conversation the
 * world offers is opened through the same projection the conversation box
 * reads, a reply is chosen by seed from what the player is offered, and the
 * turn is committed through the same writer. The report then reads each turn
 * back from the saved record. Nothing is fabricated to make a conversation
 * available: a life with nobody to talk to reports that.
 *
 * This is a development tool for reviewing wording. It is never part of play.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { personName } from "../../src/simulation";
import type { EntityId, World } from "../../src/simulation";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { createOpeningLifeController } from "../../src/presentation/opening-life";
import { explicitNewGameSetup } from "../../src/presentation/new-game-geography";
import { openOrdinaryLife } from "../../src/presentation/ordinary-life";
import { submitTimeCommand } from "../../src/presentation/time-command";
import { DEFAULT_INTERRUPTIONS } from "../../src/presentation/shell-navigation";
import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "../../src/presentation/player-conversation";
import { commitConversationTurn } from "../../src/presentation/run-b-conversation";
import { conversationExchangeTurns } from "../../src/presentation/scene-conversation";
import { linePartsOf } from "../../src/presentation/english-composition";
import { placeFor, rng } from "../playtest/mass-play/driver";

/** The conversation box's own key for leaving; never chosen as a reply. */
const LEAVE = "leave";
/** Turns taken in one conversation before the report moves on. */
const TURNS_PER_CONVERSATION = 6;

export interface ReportOption {
  readonly key: string;
  readonly label: string;
  readonly spokenWords: string | null;
}

export interface ReportTurn {
  readonly options: readonly ReportOption[];
  readonly chosen: string;
  readonly playerLine: string | null;
  readonly speakerName: string | null;
  readonly reply: string;
  readonly heardBy: readonly string[];
  /** Bank and part keys saved with the line, when the engine wrote it. */
  readonly lineParts: readonly string[] | null;
}

export interface ReportConversation {
  readonly date: string;
  readonly subject: string;
  readonly topicLabel: string;
  readonly addressee: string;
  readonly turns: readonly ReportTurn[];
}

export interface ReportLife {
  readonly index: number;
  readonly seed: string;
  readonly place: string;
  readonly startAge: number;
  readonly playerName: string | null;
  readonly daysPlayed: number;
  readonly conversations: readonly ReportConversation[];
  readonly problem: string | null;
}

export interface DialogueReportOptions {
  readonly lives: number;
  readonly days: number;
  readonly seed: string;
  readonly ages: readonly number[];
}

export function runDialogueReport(
  options: DialogueReportOptions,
): readonly ReportLife[] {
  const states = lifePlaceStateIdentities();
  return Array.from({ length: options.lives }, (_unused, index) => {
    const random = rng(`${options.seed}:${index}`);
    // A state with no startable locality is skipped for the next draw.
    let place: ReturnType<typeof placeFor> = null;
    while (!place) {
      const state = states[Math.floor(random() * states.length)]!;
      place = placeFor(state.usps, random);
    }
    const startAge = options.ages[index % options.ages.length]!;
    const seed = `${options.seed}-${index}`;
    return playLife(
      index,
      seed,
      place.key,
      place.displayName,
      startAge,
      options.days,
      random,
    );
  });
}

function playLife(
  index: number,
  seed: string,
  placeKey: string,
  placeName: string,
  startAge: number,
  days: number,
  random: () => number,
): ReportLife {
  const conversations: ReportConversation[] = [];
  let world: World | null = null;
  let personId: EntityId = "";
  let daysPlayed = 0;
  try {
    const setup = explicitNewGameSetup({
      placeKey,
      seed,
      startAge: startAge as never,
      depth: "summarize-earlier-life",
    });
    const game = createOpeningLifeController(setup).finishTransition().game!;
    personId = game.playerPersonId;
    world = openOrdinaryLife(game.world, personId);
    for (let day = 0; day < days; day += 1) {
      world = talkToEveryone(world, personId, random, conversations);
      if (!world.people[personId]) break;
      const result = submitTimeCommand(world, {
        requestId: `${seed}-day-${day}`,
        personId,
        sourceMoment: world.currentMoment,
        command: { kind: "days", days: 1 },
        interruptions: DEFAULT_INTERRUPTIONS,
      });
      world = result.world;
      daysPlayed += 1;
      if (result.receipt.status !== "accepted") break;
    }
    return {
      index,
      seed,
      place: placeName,
      startAge,
      playerName: nameOf(world, personId),
      daysPlayed,
      conversations,
      problem: null,
    };
  } catch (error) {
    return {
      index,
      seed,
      place: placeName,
      startAge,
      playerName: world ? nameOf(world, personId) : null,
      daysPlayed,
      conversations,
      problem: String((error as Error)?.message ?? error),
    };
  }
}

function talkToEveryone(
  start: World,
  personId: EntityId,
  random: () => number,
  out: ReportConversation[],
): World {
  let world = start;
  for (const available of availablePlayerConversations(world, personId)) {
    if (available.settled) continue;
    const turns: ReportTurn[] = [];
    let addressee = "";
    for (let turn = 0; turn < TURNS_PER_CONVERSATION; turn += 1) {
      const view = projectPlayerConversation(
        world,
        personId,
        available.subject,
      );
      if (!view || view.settled) break;
      // Knowingly false replies sit behind the box's Lie toggle; the report
      // takes the replies a player sees without it.
      const offered = view.intents.filter((option) => !option.lieVariantOf);
      const speech = offered.filter((option) => option.key !== LEAVE);
      if (speech.length === 0) break;
      const chosen = speech[Math.floor(random() * speech.length)]!;
      const addresseeId =
        view.addressee === "everyone" ? null : (view.addressee as EntityId);
      addressee =
        addresseeId === null
          ? view.addressees.map((entry) => entry.label).join(" and ")
          : (nameOf(world, addresseeId) ?? "someone");
      const result = commitConversationTurn(world, {
        session: view.session,
        room: view.room,
        progress: view.progress,
        turnOrdinal: view.turnOrdinal,
        addressee: view.addressee,
        audibility: view.audibility,
        intent: chosen.key,
      });
      world = result.world;
      const recorded = conversationExchangeTurns(
        world,
        personId,
        available.subject,
        addresseeId,
      ).at(-1);
      const event = recorded
        ? world.history.events.find((entry) => entry.id === recorded.eventId)
        : undefined;
      turns.push({
        options: offered.map((option) => ({
          key: String(option.key),
          label: option.label,
          spokenWords: option.spokenWords ?? null,
        })),
        chosen: String(chosen.key),
        playerLine: recorded?.playerLine ?? null,
        speakerName: recorded?.speakerName ?? null,
        reply: recorded?.reply ?? "",
        heardBy: (recorded?.heardByPersonIds ?? []).map(
          (id) => nameOf(world, id) ?? "someone",
        ),
        lineParts: event ? linePartsOf(event.tags) : null,
      });
    }
    if (turns.length > 0)
      out.push({
        date: world.currentDate,
        subject: available.subject,
        topicLabel: available.topicLabel,
        addressee,
        turns,
      });
  }
  return world;
}

function nameOf(world: World, id: EntityId): string | null {
  const person = world.people[id];
  return person ? personName(person) : null;
}

// ---------------------------------------------------------------------------
// The readable report
// ---------------------------------------------------------------------------

interface RepeatedLine {
  readonly text: string;
  readonly count: number;
  readonly speakers: ReadonlySet<string>;
  readonly subjects: ReadonlySet<string>;
  readonly keys: ReadonlySet<string>;
}

export function repeatedLines(
  lives: readonly ReportLife[],
): readonly RepeatedLine[] {
  const rows = new Map<
    string,
    {
      count: number;
      speakers: Set<string>;
      subjects: Set<string>;
      keys: Set<string>;
    }
  >();
  const add = (
    text: string | null,
    speaker: string,
    subject: string,
    keys: readonly string[] | null,
  ) => {
    if (!text?.trim()) return;
    const row = rows.get(text) ?? {
      count: 0,
      speakers: new Set<string>(),
      subjects: new Set<string>(),
      keys: new Set<string>(),
    };
    row.count += 1;
    row.speakers.add(speaker);
    row.subjects.add(subject);
    for (const key of keys ?? []) row.keys.add(key);
    rows.set(text, row);
  };
  for (const life of lives)
    for (const conversation of life.conversations)
      for (const turn of conversation.turns) {
        add(turn.playerLine, "the player", conversation.subject, null);
        add(
          turn.reply,
          turn.speakerName ?? "the room",
          conversation.subject,
          turn.lineParts,
        );
      }
  return [...rows.entries()]
    .map(([text, row]) => ({ text, ...row }))
    .filter((row) => row.count > 1)
    .sort(
      (left, right) =>
        right.count - left.count || left.text.localeCompare(right.text),
    );
}

export function dialogueReportMarkdown(
  options: DialogueReportOptions,
  lives: readonly ReportLife[],
): string {
  const conversations = lives.flatMap((life) => life.conversations);
  const turns = conversations.flatMap((conversation) => conversation.turns);
  const replies = new Set(
    turns.map((turn) => turn.reply).filter((reply) => reply.trim()),
  );
  const keyed = turns.filter((turn) => turn.lineParts !== null).length;
  const lines: string[] = [
    `# Dialogue report — ${options.seed}`,
    "",
    `${lives.length} lives, up to ${options.days} days each. ${conversations.length} conversations, ${turns.length} turns, ${replies.size} different replies. ${keyed} of ${turns.length} turns carry engine part keys; the rest are not yet worded by the engine.`,
    "",
    "Acts are each conversation's own reply keys until every line is labeled with a speech act (Step 1).",
    "",
    "## Where variety is thin",
    "",
  ];
  const repeated = repeatedLines(lives);
  if (repeated.length === 0) lines.push("No line was said more than once.", "");
  for (const row of repeated)
    lines.push(
      `- **${row.count}×** "${row.text}" — ${[...row.speakers].join(", ")}; ${[...row.subjects].join(", ")}${row.keys.size ? `; keys ${[...row.keys].join(", ")}` : ""}`,
    );
  lines.push("");

  for (const life of lives) {
    lines.push(
      `## Life ${life.index + 1}: ${life.playerName ?? "(not created)"}, age ${life.startAge}, ${life.place}`,
      "",
      `Seed \`${life.seed}\`. ${life.daysPlayed} days played, ${life.conversations.length} conversations.${life.problem ? ` Stopped: ${life.problem}` : ""}`,
      "",
    );
    if (life.conversations.length === 0)
      lines.push("Nobody offered a conversation in this span.", "");
    for (const conversation of life.conversations) {
      lines.push(
        `### ${conversation.date} — ${conversation.topicLabel} (${conversation.subject}), with ${conversation.addressee}`,
        "",
      );
      conversation.turns.forEach((turn, index) => {
        lines.push(`**Turn ${index + 1}.** Options:`);
        for (const option of turn.options)
          lines.push(
            `- ${option.key === turn.chosen ? "**" : ""}${option.label}${option.spokenWords ? ` — "${option.spokenWords}"` : ""} \`${option.key}\`${option.key === turn.chosen ? "** ← chosen" : ""}`,
          );
        lines.push(
          "",
          `> **You:** ${turn.playerLine ?? "(nothing recorded)"}`,
          `> **${turn.speakerName ?? "The room"}:** ${turn.reply || "(no reply recorded)"}`,
          "",
          `Keys: ${turn.lineParts ? turn.lineParts.join(", ") : "none recorded (line not yet from the engine)"}.${turn.heardBy.length ? ` Also heard by ${turn.heardBy.join(", ")}.` : ""}`,
          "",
        );
      });
    }
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  const args = process.argv.slice(2);
  const opt = (name: string, fallback: string) => {
    const at = args.indexOf(`--${name}`);
    return at >= 0 ? args[at + 1]! : fallback;
  };
  const options: DialogueReportOptions = {
    lives: Number(opt("lives", "3")),
    days: Number(opt("days", "30")),
    seed: opt("seed", "dialogue-report"),
    ages: opt("ages", "10,17,34,52").split(",").map(Number),
  };
  if (
    !Number.isInteger(options.lives) ||
    options.lives < 1 ||
    !Number.isInteger(options.days) ||
    options.days < 0 ||
    options.ages.some((age) => !Number.isInteger(age) || age < 0)
  )
    throw new Error("Use --lives N (1 or more), --days N and --ages a,b,c.");
  const out = opt("out", `test-results/dialogue-report/${options.seed}.md`);
  const lives = runDialogueReport(options);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, dialogueReportMarkdown(options, lives));
  const count = lives.reduce(
    (total, life) => total + life.conversations.length,
    0,
  );
  console.log(`Wrote ${out}: ${lives.length} lives, ${count} conversations.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
