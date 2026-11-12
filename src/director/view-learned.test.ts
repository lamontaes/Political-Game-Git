/**
 * Where a person stands politically, as the player learns it (the person's
 * card says "You don't know where they stand yet." until a talk or a story
 * teaches it). In places drawn from all 56:
 *
 * - someone close to the player who follows politics and carries a talk on
 *   says where they stand; the knowledge key is written, citing the views
 *   engine's record, with the talk as its source, and the card goes from the
 *   unknown line to their view;
 * - someone the player has no tie to says nothing of the kind, and the key is
 *   not written (the slide gives a stranger no weight);
 * - the same person weighs more with a closer tie, a keener follower of
 *   politics and a more outgoing temperament, never by a flip.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
// The bench world first: its modules load in the order play loads them.
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { knownCard } from "../bench/card";
import controls from "../bench/data/controls.json" with { type: "json" };
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { printStory, storiesHeard } from "../core2/modules/news";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import rules from "./data/conversation-rules.json" with { type: "json" };
import {
  composedLine,
  openConversation,
  say,
  subjectsBetween,
} from "./conversation";
import { expectUpToFourDifferent } from "./reply-set-check";
import { kinAddress } from "../english/journal-words";
import { familyFactsOf } from "../core2/closeness";
import { viewOf } from "../core2/modules/views";
import { answerInTalk } from "./scene-talk";
import {
  strongestQuestion,
  viewKey,
  viewRecordId,
  viewTopicWeight,
  viewWillingness,
} from "./view-learned";

/**
 * The cause a stand follows (lead, Nov 12: a stand never opens a talk; it
 * follows its cause): the person reads a story on their strongest question,
 * printed and delivered through the news engine's own route, the day before
 * the talk.
 */
function stageNews(
  core: Parameters<typeof coreAPI>[0],
  id: PersonId,
): string | null {
  const api = coreAPI(core);
  const top = strongestQuestion(api, id);
  const person = core.people.get(id);
  if (!top || !person) return null;
  const storyId = `fixture:view-news:${id}:${core.date}`;
  printStory(
    api,
    {
      id: storyId,
      kind: "press.printed",
      // Printed yesterday: the news engine hears a story printed before today
      // at once, and one printed today on the next day's run.
      date: addDays(makeIsoDate(core.date), -1),
      placeId: person.placeId,
      topic: top.question,
      desiredChange: "enact",
      facts: {},
    } as never,
    [id],
    [id],
  );
  // Delivered on the reader's own day (their reading habits): wait for it.
  for (
    let day = 0;
    day < WEEK_DAYS && !storiesHeard(api, id).some((row) => row.id === storyId);
    day += 1
  )
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  return storiesHeard(api, id).some((row) => row.id === storyId)
    ? storyId
    : null;
}

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const DRAWS = 4;
/** How long a staged story may take to reach its reader. */
const WEEK_DAYS = 7;
const TURNS = 3;
const AFTER_ADDRESS_DAYS = 28;
// Only some towns print letters the player's habits bring to them (about one
// in three of the draws), so the news test draws until one does.
const NEWS_DRAWS = 10;
const VIEW_MOVES = (rules.replyMoves as Record<string, unknown>)[
  "own-view"
] as Record<string, string>;

/** The card's political-view line as the screen shows it (play.mjs). */
const viewLine = (card: { view: string | null }) =>
  card.view
    ? ((controls.leanWords as Record<string, string>)[card.view] ?? card.view)
    : controls.who.viewUnknown;

it(`a close, outgoing person says where they stand and the card learns it; a stranger does not (seed ${seed})`, () => {
  setBookkeeping(false);
  const told: string[] = [];
  const notes: string[] = [];
  for (let draw = 0; draw < DRAWS && told.length < 2; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "view-learned");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const me = playerId as PersonId;
    const api = coreAPI(core);
    // Past the weeks the President's opening address leads every talk, which
    // is news before anything else.
    advanceCore(core, addDays(makeIsoDate(core.date), AFTER_ADDRESS_DAYS));
    const ranked = [...core.people.values()]
      .filter((p) => p.alive && p.id !== me)
      .map((p) => ({
        person: p,
        weight: viewTopicWeight(viewWillingness(core, p.id as PersonId, me)),
      }))
      .filter((row) => row.weight > 0)
      .sort((a, b) => b.weight - a.weight);
    notes.push(`${where}: ${ranked.length} willing`);
    for (const { person, weight } of ranked) {
      const id = person.id as PersonId;
      const before = knownCard(core, me, id);
      if (!before.viewUnknown) continue;
      expect(viewLine(before), where).toBe(
        "You don't know where they stand yet.",
      );
      expect(api.knows(me, viewKey(id)), where).toBeUndefined();
      // Changed (lead, Nov 12): the stand's cause is staged first.
      stageNews(core, id);
      const talk = openConversation(core, me, id, { director });
      const answers: string[] = [];
      for (let turn = 0; turn < TURNS && talk.choices.length; turn += 1) {
        const said = talk.lines.find((row) => row.kind === "own-view");
        // Every answer the player can give to it is met by a line written for
        // that answer.
        if (said && !answers.length)
          for (const choice of talk.choices.filter(
            // Asking why is answered in words the engine composes (below).
            (row) => row.answers === said.subjectId && row.move !== "why",
          )) {
            const reply = answerInTalk(core, {
              replyMove: VIEW_MOVES[choice.move] ?? "answer",
              answered: `own-view:${choice.move}`,
              key: "own-view",
              speakerId: id,
              momentKey: `${me}:${id}:${choice.key}`,
            });
            expect(reply, `${where}: "${choice.text}"`).toBeTruthy();
            answers.push(`"${choice.text}" / "${reply!.text}"`);
          }
        say(core, talk, talk.choices[0]!.key);
      }
      const line = talk.lines.find((row) => row.kind === "own-view");
      if (!line) {
        notes.push(
          `${where}: ${person.givenName} (${weight.toFixed(2)}) led with ${talk.lines[1]?.kind ?? talk.lines[0]?.kind}`,
        );
        continue;
      }
      expect(
        answers.length,
        `${where}: replies offered; lines ${talk.lines.map((row) => `${row.kind}:${row.text}`).join(" / ")}; choices ${talk.choices.map((row) => `${row.answers}:${row.text}`).join(" / ")}`,
      ).toBeGreaterThan(0);
      notes.push(`  replies: ${answers.join(" | ")}`);
      const learned = api.knows(me, viewKey(id));
      expect(learned, where).toBeTruthy();
      expect(learned!.value, where).toContain(viewRecordId(id));
      expect(learned!.access).toBe("told");
      expect(learned!.sourceId, where).toMatch(/^conversation:/);
      expect(line.sourceRecordIds, where).toContain(viewRecordId(id));
      const after = knownCard(core, me, id);
      expect(after.viewUnknown, where).toBe(false);
      expect(after.view, where).toBeTruthy();
      // They named the question they care most about, and the card names it.
      const top = strongestQuestion(api, id);
      if (top) {
        expect(line.text, where).toContain(top.about);
        expect(after.viewAbout, where).toBe(top.about);
      }
      told.push(
        `${where}: ${person.givenName} ${person.familyName} (${id}), weight ${weight.toFixed(2)}, said "${line.text}" -> card: "${viewLine(before)}" before, "${viewLine(after)}" after; key ${viewKey(id)} = ${learned!.value} from ${learned!.sourceId}`,
      );
      break;
    }
    // Someone with no tie to the player gives no weight, so the key stays unwritten.
    const stranger = [...core.people.values()].find(
      (p) =>
        p.alive &&
        p.id !== me &&
        viewTopicWeight(viewWillingness(core, p.id as PersonId, me)) === 0,
    );
    if (stranger) {
      const talk = openConversation(core, me, stranger.id as PersonId, {
        director,
      });
      for (let turn = 0; turn < TURNS && talk.choices.length; turn += 1)
        say(core, talk, talk.choices[0]!.key);
      expect(
        talk.lines.some((row) => row.kind === "own-view"),
        where,
      ).toBe(false);
      expect(
        api.knows(me, viewKey(stranger.id as PersonId)),
        where,
      ).toBeUndefined();
    }
  }
  process.stdout.write(`${notes.join("\n")}\n${told.join("\n")}\n`);
  expect(told.length, notes.join("; ")).toBeGreaterThan(0);
}, 1_800_000);

it(`a letter to the editor the player reads teaches where its writer stands, and one they do not read teaches nothing (seed ${seed})`, () => {
  setBookkeeping(false);
  const notes: string[] = [];
  let proved = 0;
  for (let draw = 0; draw < NEWS_DRAWS && !proved; draw += 1) {
    const place = drawPlace(`${seed}:news:${draw}`, "view-learned-news");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const me = playerId as PersonId;
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const letters = (
      api.moduleState("news").table("stories").rows() as unknown as {
        id: string;
        facts: Record<string, string>;
      }[]
    ).filter((row) => String(row.facts.sourceRecordId).startsWith("letter:"));
    const heard = new Set(storiesHeard(api, me).map((row) => row.id));
    notes.push(
      `${where}: ${letters.length} letters in the year, ${letters.filter((row) => heard.has(row.id)).length} read by the player`,
    );
    for (const letter of letters) {
      const writer = letter.facts.personId!;
      const key = api.knows(me, viewKey(writer));
      if (!heard.has(letter.id)) {
        // A letter nobody told the player of teaches them nothing, unless
        // another route did (a talk, an earlier letter by the same writer).
        if (key)
          expect(
            letters.some(
              (row) => row.facts.personId === writer && heard.has(row.id),
            ) || key.sourceId.startsWith("conversation:"),
            `${where}: ${writer} known without a letter read`,
          ).toBe(true);
        continue;
      }
      expect(key, `${where}: ${writer}`).toBeTruthy();
      expect(key!.access).toBe("told");
      expect(key!.value.split(" ")[0]).toBe(viewRecordId(writer));
      expect(letters.map((row) => row.id)).toContain(key!.sourceId);
      expect(heard.has(key!.sourceId)).toBe(true);
      proved += 1;
      const card = core.people.has(writer as PersonId)
        ? knownCard(core, me, writer)
        : undefined;
      if (proved <= 3)
        notes.push(
          `${where}: writer ${writer}, key ${viewKey(writer)} = "${key!.value}" from ${key!.sourceId}${card ? `; card says "${viewLine(card)}"` : ""}`,
        );
      if (card) expect(card.viewUnknown, where).toBe(false);
    }
  }
  process.stdout.write(`${notes.join("\n")}\n`);
  expect(proved, notes.join("; ")).toBeGreaterThan(0);
}, 3_000_000);

// words-home-own-view-lines-are-composed (owner, Nov 11, 2026: "all the lines
// in the game need to be run through the English engine"): someone who says
// where they stand names the question they care most about, which side they
// are on and, from their own life, why; the player's replies are up to four
// different moves, and a stand the player takes is learned by the speaker.
it(`where someone stands names their strongest question, from their own life, and the player's stand is kept (seed ${seed})`, () => {
  setBookkeeping(false);
  // A drawn place may have nobody close enough to the player to say where
  // they stand: draw until one does, and name the places passed over.
  const skipped: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    if (ownViewIn(`${seed}:own-view:${draw}`, skipped)) return;
  }
  throw new Error(
    `no drawn place had anyone say where they stand: ${skipped.join("; ")}`,
  );
}, 1_800_000);

/** The own-view checks in one drawn place; false when nobody there would say it. */
function ownViewIn(drawSeed: string, skipped: string[]): boolean {
  const place = drawPlace(drawSeed, "view-learned-own-view");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const { core, director, playerId } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    { twoLevel: true, placeKey: place.key },
  );
  const me = playerId as PersonId;
  const api = coreAPI(core);
  const people = [...core.people.values()].filter(
    (p) => p.alive && p.tier !== "husk" && p.id !== me,
  );
  // Two people with the same lean and different strongest questions say
  // different questions.
  const byLabel = new Map<string, { id: PersonId; question: string }[]>();
  for (const person of people) {
    const id = person.id as PersonId;
    const label = viewOf(api, id)?.label;
    const top = strongestQuestion(api, id);
    if (!label || !top) continue;
    byLabel.set(label, [
      ...(byLabel.get(label) ?? []),
      { id, question: top.question },
    ]);
  }
  const pair = [...byLabel.values()]
    .map((rows) => [
      rows[0]!,
      rows.find((row) => row.question !== rows[0]!.question),
    ])
    .find(([, other]) => other) as
    | [{ id: PersonId; question: string }, { id: PersonId; question: string }]
    | undefined;
  // (A place may have no such pair; the talk below is the check that must hold.)
  const said = (pair ?? []).map(({ id }) => {
    const subject = subjectsBetween(core, id, me, director).find(
      (row) => row.kind === "own-view",
    );
    const line = subject
      ? composedLine(
          core,
          id,
          "own-view-say",
          subject.facts,
          subject.stage!,
          `own-view:${id}`,
        )
      : null;
    // The question they name is the strongest one their own life gives a
    // reason for, else their strongest (words composer, Nov 12).
    return line && subject?.facts.about
      ? { text: line.text, about: subject.facts.about.text }
      : null;
  });
  if (said[0] && said[1]) {
    expect(said[0].text).not.toBe(said[1].text);
    expect(said[0].text).toContain(said[0].about);
    expect(said[1].text).toContain(said[1].about);
  }
  // Someone whose stand has a work reason says it from the job record.
  for (const person of people) {
    const subject = subjectsBetween(
      core,
      person.id as PersonId,
      me,
      director,
    ).find((row) => row.kind === "own-view" && row.facts.employer);
    if (!subject) continue;
    const line = composedLine(
      core,
      person.id as PersonId,
      "own-view-say",
      subject.facts,
      subject.stage!,
      `own-view-work:${person.id}`,
    );
    // The reason is said from the record (owner via the lead, Nov 12: "a
    // reason is said, not pointed at"): the hourly pay where the job has it,
    // else the employer.
    expect(line?.text, where).toContain(
      (subject.facts.wage ?? subject.facts.employer)!.text,
    );
    process.stdout.write(`OWN VIEW WORK ${where}: "${line!.text}"\n`);
    break;
  }
  // In a talk: up to four different replies, and a stand the player takes is learned.
  advanceCore(core, addDays(makeIsoDate(core.date), AFTER_ADDRESS_DAYS));
  const ranked = people
    .map((p) => ({
      id: p.id as PersonId,
      weight: viewTopicWeight(viewWillingness(core, p.id as PersonId, me)),
    }))
    .filter((row) => row.weight > 0)
    .sort((a, b) => b.weight - a.weight);
  let checked = 0;
  const passed: string[] = [];
  for (const { id } of ranked) {
    // The room's look at whether there is anything to say teaches nothing.
    const knew = api.knows(me, viewKey(id));
    openConversation(core, me, id, { director, look: true });
    if (!knew) expect(api.knows(me, viewKey(id)), where).toBeUndefined();
    // As in play: the first talk may be on something else (the day, the
    // address), and where they stand comes up in a later one, after its
    // cause (changed, lead, Nov 12: the news on their question is staged).
    stageNews(core, id);
    let talk = openConversation(core, me, id, { director });
    let line = talk.lines.find((row) => row.kind === "own-view");
    for (let again = 0; again < 3 && !line && talk.lines.length; again += 1) {
      for (let turn = 0; turn < 6 && talk.choices.length; turn += 1)
        say(core, talk, talk.choices[talk.choices.length - 1]!.key);
      talk = openConversation(core, me, id, { director });
      line = talk.lines.find((row) => row.kind === "own-view");
    }
    if (!line || !talk.choices.length) {
      passed.push(`${id}: ${talk.lines[0]?.kind ?? "nothing"}`);
      continue;
    }
    expectUpToFourDifferent(talk.choices, where);
    // A child never calls a parent or grandparent by their given name.
    const speaker = core.people.get(id)!;
    const kin = familyFactsOf(core.people.get(me)!).get(id);
    if (kin && kinAddress(kin.relation, speaker.looks?.gender ?? ""))
      for (const choice of talk.choices)
        expect(choice.text, where).not.toContain(`, ${speaker.givenName}.`);
    process.stdout.write(
      `OWN VIEW TALK ${where}: "${line.text}" replies: ${talk.choices.map((c) => `${c.move}: ${c.text}`).join(" | ")}\n`,
    );
    const stand = talk.choices.find(
      (c) => c.move === "agree" || c.move === "disagree",
    );
    if (stand) {
      say(core, talk, stand.key);
      expect(api.knows(id, viewKey(me)), where).toBeTruthy();
    }
    checked += 1;
    break;
  }
  if (!checked) {
    skipped.push(
      `${where}: passed over ${passed.join(", ") || "nobody willing"}`,
    );
    return false;
  }
  return true;
}
