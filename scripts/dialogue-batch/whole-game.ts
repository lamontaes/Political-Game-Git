/**
 * Batch 3, built to the owner's rules R1–R6 (October 8, 2026): the whole
 * game, conversations as whole exchanges, every item on the screen it
 * appears on, and every item different. No two items share more than two of
 * any kind of moment, screen, place, relationship or setup, the batch is
 * shuffled so neighbors differ, and a coverage table shows the spread.
 *
 *   node --import tsx scripts/dialogue-batch/whole-game.ts --seed batch3-oct9 \
 *     --worlds 16 --out data/english/batches/batch-3.json
 *
 * Every line is exactly what the game's own producer returned for a
 * generated life; nothing here words anything. Where the harness chooses
 * (which offered choice to take, which answer a lie gets), the item says so.
 * Lines no screen shows are left out, and so are screens with no words yet.
 *
 * Reads the Lie (#3843), the life story (#3834) and the government's form
 * (#3909) from their own composers, so it runs on main once those merge.
 *
 * A development tool. It writes to its own copy of each generated world,
 * never to a save.
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { drawRandomPlace } from "../../tests/support/random-place";
import type { EntityId, World } from "../../src/simulation";
import { personName } from "../../src/simulation";
import { stableHash } from "../../src/simulation/ids";
import { describePersonContext } from "../../src/simulation/person-context";
import { observedTraitLabels } from "../../src/simulation/people-traits";
import { municipalGovernmentForLifePlace } from "../../src/simulation/municipal-government";
import { governmentFormTerm } from "../../src/presentation/government-form-english";
import { composeLifeStory } from "../../src/presentation/journal-story";
import {
  composeLieAndTell,
  type LieReply,
} from "../../src/presentation/lie-and-tell-english";
import { lifeTalkContext } from "../../src/presentation/life-conversation";
import { composeConnectiveNarration } from "../../src/presentation/life-narration";
import { openNextLifeScene } from "../../src/presentation/life-scene-flow";
import { currentLifeTalkScene } from "../../src/presentation/life-talk-presence";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { projectWorld39Journal } from "../../src/presentation/world39-journal";
import { projectNewsFrontPage } from "../../src/presentation/news-front-page";
import { projectWorld39News } from "../../src/presentation/world39-news";
import { readWholeExchange, type ExchangeTurn } from "./exchanges";
import { coverageOf, selectByRule6, spread, type Rule6Item } from "./rule6";

export interface WholeGameItem extends Rule6Item {
  /** What one grade of this item teaches the engine. */
  readonly calibrates: readonly string[];
  readonly situation: string;
  /** A conversation, turn by turn; absent for a single line. */
  readonly exchange?: readonly ExchangeTurn[];
  /** A single line as the screen shows it. */
  readonly text?: string;
  readonly parts: readonly string[];
  readonly composer: string;
  readonly harness: string | null;
  readonly seed: string;
}

const AGES = [34, 19, 52, 27, 66, 41, 23, 58, 30, 47, 62, 38, 25, 55, 44, 70];
const LIE_ANSWERS: readonly LieReply[] = ["ask", "challenge", "accept"];

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1]! : fallback;
}

function inScene(world: World, playerId: EntityId): World {
  if (currentLifeTalkScene(world, playerId)) return world;
  try {
    return openNextLifeScene(world, playerId);
  } catch {
    return world;
  }
}

function temperamentOf(world: World, personId: EntityId): string {
  const labels = observedTraitLabels(world, personId).slice(0, 2);
  return labels.length ? labels.join(", ") : "no recorded temperament";
}

/** Everything one generated life offers the batch, before selection. */
function candidatesOf(
  world: World,
  playerId: EntityId,
  place: string,
  age: number,
  seed: string,
  index: number,
): WholeGameItem[] {
  const items: WholeGameItem[] = [];
  const date = world.currentDate;
  const player = world.people[playerId]!;
  const playerName = personName(player);
  const life = `${playerName}, ${age}, in ${place} on ${date}`;

  // Conversations, as whole exchanges with each person present.
  const scened = inScene(world, playerId);
  const scene = currentLifeTalkScene(scened, playerId);
  const present = (scene?.presentPersonIds ?? []).filter(
    (id) => id !== playerId,
  );
  const opened: { personId: EntityId; path: string; temperament: string }[] =
    [];
  for (const personId of present.slice(0, 3)) {
    const context = lifeTalkContext(scened, playerId, personId);
    const temperament = temperamentOf(scened, personId);
    // Someone whose temperament differs from the first person's takes the
    // same path, so the pair shows one moment from two temperaments (owner
    // rule R5); someone alike takes another path, so the items differ.
    const firstPerson = opened[0];
    const sameMoment =
      firstPerson !== undefined && firstPerson.temperament !== temperament;
    const exchange = readWholeExchange(
      scened,
      playerId,
      personId,
      3,
      index + (sameMoment ? 0 : opened.length),
    );
    if (!context || !exchange) continue;
    const relationship =
      describePersonContext(scened, playerId, personId)?.relationship ??
      "someone you have not met";
    const path = exchange.turns.map((turn) => turn.choice).join(" > ");
    const pair = opened.find(
      (other) => other.path === path && other.temperament !== temperament,
    );
    opened.push({ personId, path, temperament });
    const other = personName(scened.people[personId]!);
    const moment = pair
      ? `personality pair, conversation at ${context.setting}`
      : `conversation at ${context.setting}`;
    if (pair) {
      // The first of the pair becomes half of the same moment.
      const at = items.findIndex(
        (item) => item.id === `${seed}:talk:${pair.personId}`,
      );
      const firstItem = items[at];
      if (firstItem)
        items[at] = {
          ...firstItem,
          moment,
          setup: `pair:${seed}:${path}`,
          situation: `${firstItem.situation} The same path is graded with someone of a different temperament in the same room.`,
        };
    }
    items.push({
      id: `${seed}:talk:${personId}`,
      moment,
      screen: "Conversation box",
      place,
      relationship,
      // The path of choices is the setup: two exchanges that take the same
      // path teach the same thing.
      // The setting and the first two choices are the setup: two exchanges
      // that open the same way teach the same thing.
      setup: pair
        ? `pair:${seed}:${path}`
        : `${context.setting}: ${exchange.turns
            .slice(0, 2)
            .map((turn) => turn.choice)
            .join(" > ")}`,
      calibrates: [
        "register",
        `relationship (${relationship})`,
        `temperament (${temperament})`,
        "choices answering the last line",
      ],
      situation: `${life}. At ${context.placeLabel}, ${playerName} talks with ${other}, ${relationship}; their recorded temperament: ${temperament}.${pair ? " The same opening is graded with someone of a different temperament in the same room." : ""}`,
      exchange: exchange.turns,
      parts: exchange.turns.flatMap((turn) => [
        ...turn.saidParts,
        ...turn.replyParts,
      ]),
      composer:
        "projectLifeConversation and commitLifeConversation in life-conversation.ts; composeTalkChoice in talk-choice-english.ts",
      harness:
        "Each turn takes an offered choice not yet taken, counted from an offset that differs by life; a pair takes the same path.",
      seed,
    });
    // A Lie about the last thing just said, and the answer to it.
    const last = exchange.turns.at(-1)!;
    const answer = LIE_ANSWERS[index % LIE_ANSWERS.length]!;
    const lie = composeLieAndTell(
      exchange.world,
      playerId,
      personId,
      last.eventId,
      answer,
    );
    if (lie && items.filter((item) => item.moment === "lie").length === 0)
      items.push({
        id: `${seed}:lie:${personId}`,
        moment: "lie",
        // The Lie button sits in the conversation box (#3900, held).
        screen: "Conversation box",
        place,
        relationship,
        setup: `lie:${answer}`,
        calibrates: [
          "denial",
          `the answer to a lie (${answer})`,
          `relationship (${relationship})`,
        ],
        situation: `${life}. ${playerName} talks with ${other}, ${relationship}, then denies what ${other} just said. ${other} answers.`,
        // The exchange the lie follows, then the lie and its answer.
        exchange: [
          ...exchange.turns,
          {
            ...last,
            choice: "Lie",
            said: lie.lie.text,
            saidParts: lie.lie.parts,
            reply: lie.reply.text,
            replyParts: lie.reply.parts,
            offered: [],
          },
        ],
        parts: [...lie.lie.parts, ...lie.reply.parts],
        composer: "composeLieAndTell in lie-and-tell-english.ts (#3843)",
        harness: `The Lie button and the listener's decision are not built yet; the harness chose the answer "${answer}".`,
        seed,
      });
  }

  // The first moment over the room, from the opening narration (#3906).
  const narration = composeConnectiveNarration({
    world,
    personId: playerId,
    since: date,
    opening: true,
  }).sentences.join(" ");
  if (narration)
    items.push({
      id: `${seed}:first-moment`,
      moment: "first moment of a new life",
      screen: "The first moment over the room (#3906)",
      place,
      relationship: null,
      setup: `first-moment:${age < 25 ? "young" : age < 55 ? "adult" : "older"}`,
      calibrates: ["second person", "what the records say about a life", "age"],
      situation: `${life}. The first thing the game tells a new life, when the introduction closes.`,
      text: narration,
      parts: [],
      composer: "composeConnectiveNarration in life-narration.ts",
      harness: null,
      seed,
    });

  // A journal entry about something that happened.
  const entries = projectWorld39Journal(world, playerId).entries.filter(
    (entry) => entry.kind !== "life" && !/^You are\b/.test(entry.text),
  );
  const entry =
    entries[
      parseInt(stableHash(seed).slice(0, 8), 16) % Math.max(1, entries.length)
    ];
  if (entry)
    items.push({
      id: `${seed}:journal:${entry.id}`,
      moment: `journal entry (${entry.kind})`,
      screen: "Journal",
      place,
      relationship: null,
      setup: `journal:${entry.kind}`,
      calibrates: ["past tense", "second person", "what a record says"],
      situation: `${life}. One entry in the Journal, from ${entry.at}.`,
      text: entry.text,
      parts: [],
      composer: "projectWorld39Journal in world39-journal.ts",
      harness: "The entry is picked by the seed.",
      seed,
    });

  // A chapter of the life told as a story (#3834).
  const chapter = composeLifeStory(world, playerId)[0];
  if (chapter)
    items.push({
      id: `${seed}:story:${chapter.key}`,
      moment: "life story chapter",
      // The story opens the Journal (#3834); it is the same screen.
      screen: "Journal",
      place,
      relationship: null,
      setup: `story:${age < 30 ? "short life" : "long life"}`,
      calibrates: ["narrative voice", "joining events", "age"],
      situation: `${life}. The first chapter of the story the Journal tells, ${chapter.heading}.`,
      text: chapter.text,
      parts: chapter.parts,
      composer: "composeLifeStory in journal-story.ts (#3834)",
      harness: null,
      seed,
    });

  // The lead story on the News front page.
  const front = projectNewsFrontPage(world, "front", null, playerId);
  if (front.lead)
    items.push({
      id: `${seed}:news-lead:${front.lead.id}`,
      moment: "a news story",
      screen: "News, front page",
      place,
      relationship: null,
      setup: `news-lead:${front.lead.outletKey}`,
      calibrates: ["headline register", "reporting voice", "place"],
      situation: `${life}. The lead story on the front page, from ${front.lead.outletName}, published ${front.lead.publishedAt}: the headline, then the story.`,
      text: `${front.lead.readerHeadline} — ${front.lead.body}`,
      parts: [],
      composer: "projectNewsFrontPage in news-front-page.ts",
      harness: null,
      seed,
    });

  // How the town's government is organized, on News (#3909).
  const news = projectWorld39News(world, playerId).standing.find(
    (item) => item.kind === "government" && item.formTerm,
  ) as { name: string; bodyName: string | null; formTerm: string } | undefined;
  if (news) {
    const government = municipalGovernmentForLifePlace(drawnPlaces.get(seed)!);
    items.push({
      id: `${seed}:news-form`,
      moment: "a standing fact on News",
      screen: "News, Around you",
      place,
      relationship: null,
      setup: `news-form:${news.formTerm}`,
      calibrates: ["record values on News", "public terms"],
      situation: `${life}. In News, under the town's government: "${news.name}"${news.bodyName ? `, then "${news.bodyName}"` : ""}, then this line.`,
      text: news.formTerm,
      parts: government ? (governmentFormTerm(government)?.parts ?? []) : [],
      composer: "governmentFormTerm in government-form-english.ts (#3909)",
      harness: null,
      seed,
    });
  }
  return items;
}

const drawnPlaces = new Map<
  string,
  Parameters<typeof municipalGovernmentForLifePlace>[0]
>();

/**
 * The fields batch 2 carried, so the Grade tab shows a batch-3 item the way
 * it showed batch 2's: the exchange so far, the line graded last, and the
 * choices offered next. The whole exchange stays in `exchange`.
 */
function asBatch2(item: WholeGameItem) {
  const turns = item.exchange ?? [];
  const who = item.relationship
    ? item.relationship.replace(/^your /, "Your ")
    : "They";
  const transcript = turns.flatMap((turn, index) => [
    `You: ${turn.said ?? turn.choice}`,
    ...(index < turns.length - 1 ? [`${who}: ${turn.reply}`] : []),
  ]);
  return {
    axis: item.moment,
    kind: item.exchange ? "conversation" : item.moment,
    prior: transcript.join("\n"),
    reply: turns.length ? `${who}: ${turns.at(-1)!.reply}` : (item.text ?? ""),
    part: item.parts[0] ?? null,
    choices: turns.at(-1)?.offered ?? [],
  };
}

/** Kinds the owner asked for that no life in this run produced, counted. */
function absentFromCandidates(
  candidates: readonly WholeGameItem[],
): { kind: string; reason: string }[] {
  const absent: { kind: string; reason: string }[] = [];
  const talks = candidates.filter(
    (item) => item.exchange && item.moment !== "lie",
  );
  const settings = new Set(
    talks.map((item) => item.moment.replace(/^.*conversation at /, "")),
  );
  const talkLives = new Set(talks.map((item) => item.seed)).size;
  // Every life built gives the batch at least its first moment, so the lives
  // with any candidate are the lives built.
  const built = new Set(candidates.map((item) => item.seed)).size;
  if (!settings.has("home"))
    absent.push({
      kind: "conversation at home or with family",
      reason: `Of ${built} new lives built, ${talkLives} opened in a room with someone to talk to, all at ${[...settings].join(" or ")}; none opened at home with anyone present.`,
    });
  if (!talks.some((item) => item.moment.startsWith("personality pair"))) {
    const rooms = new Map<string, number>();
    for (const item of talks)
      rooms.set(item.seed, (rooms.get(item.seed) ?? 0) + 1);
    const shared = [...rooms.values()].filter((count) => count >= 2).length;
    const written = talks.filter(
      (item) => !item.situation.includes("no recorded temperament"),
    ).length;
    absent.push({
      kind: "personality pair",
      reason: `${rooms.size} rooms held ${talks.length} people to talk to, ${shared} of the rooms two or more. ${written} of the ${talks.length} people had a personality trait written down, so no room held two people of different temperaments.`,
    });
  }
  if (!candidates.some((item) => item.moment === "a news story"))
    absent.push({
      kind: "news front page",
      reason: `None of the ${built} new lives built had a story on the News front page yet.`,
    });
  return absent;
}

function lifeCandidates(
  worldSeed: string,
  place: Parameters<typeof municipalGovernmentForLifePlace>[0] & {
    readonly key: string;
    readonly displayName: string;
  },
  age: number,
  index: number,
): WholeGameItem[] {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: worldSeed,
      placeKey: place.key,
      startAge: age,
      questionnaire: "skipped",
    }),
  ).game!;
  return candidatesOf(
    game.world,
    game.playerPersonId,
    place.displayName,
    age,
    worldSeed,
    index,
  );
}

function main() {
  const seed = arg("seed", "batch3-oct9");
  const worlds = Number(arg("worlds", "16"));
  const out = arg("out", "test-results/dialogue-batch/batch-3.json");
  const head = execSync("git rev-parse HEAD").toString().trim();
  const statesUsed = new Set<string>();
  const candidates: WholeGameItem[] = [];
  const failed: string[] = [];
  // Re-select from saved candidates instead of rebuilding the lives.
  const from = arg("from", "");
  if (from)
    candidates.push(
      ...(JSON.parse(readFileSync(from, "utf8")) as WholeGameItem[]),
    );
  for (let index = 0; !from && index < worlds; index += 1) {
    const worldSeed = `${seed}:${index}`;
    // Two worlds are drawn from the towns whose government has a recorded
    // form, so News can show its term; the rest from all 56 places, one
    // world per state or territory until all 56 are used.
    const wantsForm = index < 2;
    const place = drawRandomPlace(worldSeed, (candidate) => {
      if (
        statesUsed.size < 56 &&
        statesUsed.has(candidate.stateJurisdictionKey ?? "")
      )
        return false;
      if (!wantsForm) return true;
      const government = municipalGovernmentForLifePlace(candidate);
      return government !== null && governmentFormTerm(government) !== null;
    });
    statesUsed.add(place.stateJurisdictionKey ?? "");
    drawnPlaces.set(worldSeed, place);
    const age = AGES[index % AGES.length]!;
    try {
      const found = lifeCandidates(worldSeed, place, age, index);
      candidates.push(...found);
      console.log(
        `${worldSeed} ${place.displayName} (${age}): ${found.length} candidates`,
      );
    } catch (error) {
      const reason = (error as Error).message;
      failed.push(`${worldSeed} ${place.displayName}: ${reason}`);
      console.log(`${worldSeed} ${place.displayName}: failed, ${reason}`);
    }
  }
  const chosen = spread(
    selectByRule6(candidates, (item) => stableHash(`${seed}:${item.id}`)),
  );
  const batch = {
    id: "batch-3",
    title: `Batch 3 to the owner's rules R1–R6 (${chosen.length} items from ${worlds} new lives)`,
    at: new Date().toISOString(),
    head,
    // The commits the lines came from, when the run is not on a pushed head.
    builtOn: arg("built-on", head),
    status: "open",
    rules: "R1–R6, data/english/grades/batch-2.json",
    absent: [
      {
        kind: "campaign door",
        reason:
          "Only a candidate knocks on doors, and no new life starts as a candidate, so no life reached the doors.",
      },
      {
        kind: "court",
        reason:
          "The legal record shows only a sentence's term, worded in code (src/presentation/legal-record.ts:122); a judge's reasons never reach a screen.",
      },
      {
        kind: "council meeting",
        reason:
          "The meeting screen needs a meeting on the calendar (src/presentation/ordinary-meeting-scene.ts:21), and this tool does not schedule one.",
      },
      ...absentFromCandidates(candidates),
    ],
    lives: worlds,
    failed,
    candidates: candidates.length,
    coverage: coverageOf(chosen),
    items: chosen.map((item, i) => ({ i, ...item, ...asBatch2(item) })),
  };
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(batch, null, 2)}\n`);
  // Every candidate, for re-selecting without rebuilding the lives.
  const kept = arg("candidates-out", "");
  if (kept) writeFileSync(kept, `${JSON.stringify(candidates, null, 2)}\n`);
  console.log(
    `${chosen.length} items of ${candidates.length} candidates → ${out}`,
  );
}

main();
