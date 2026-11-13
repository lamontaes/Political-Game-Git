import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { viewOf, viewOn } from "../core2/modules/views";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import {
  newsStake,
  openConversation,
  say,
  type Conversation,
} from "./conversation";
import { expectUpToFourDifferent } from "./reply-set-check";
import { CONVERSATION_WORDS } from "../english/conversation-words";
import { viewKey } from "./view-learned";

// words-home-news-lines-are-composed (owner, Nov 11, 2026: "all the lines in
// the game need to be run through the English engine"): when someone passes
// on a story, the player's replies say what it has to do with them, from
// their own records, and the other person's answer is composed from theirs.
// In a place drawn from all 56, played day by day until someone the player
// knows raises a story.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "news-talk");
const MAX_DAYS = 120;

it(`a talk about a story offers replies from the player's own stake, and keeps a stand, in ${place.name} (${place.key}), seed ${seed}`, () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, "2025-01-20", {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const api = coreAPI(core);
  const playerId = world.playerId! as PersonId;
  const isNews = (talk: Conversation) =>
    /^news:/.test((talk.topics[0] ?? "").replace(/^[^>]*>/, ""));
  let talk: Conversation | null = null;
  for (let day = 0; !talk && day < MAX_DAYS; day += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const player = core.people.get(playerId)!;
    const circle = new Set([
      ...(core.households.get(player.householdId)?.memberIds ?? []),
      ...player.knownIds,
    ]);
    for (const otherId of circle) {
      if (otherId === playerId || !core.people.get(otherId)?.alive) continue;
      const opened = openConversation(core, playerId, otherId as PersonId, {
        director,
      });
      if (isNews(opened) && opened.choices.length) {
        talk = opened;
        break;
      }
    }
  }
  // A quiet town may pass no story around in four months: say so by name.
  if (!talk) {
    process.stdout.write(
      `NEWS TALK ${place.name} ${seed}: nobody raised a story in ${MAX_DAYS} days\n`,
    );
    return;
  }
  const subject = talk.last!.subject;
  const where = `${place.name} ${seed} ${core.date}`;
  expectUpToFourDifferent(talk.choices, where);
  // No two replies on one screen carry the same insert: each names a
  // different thing (the outlet, the question, the place, the town).
  const named = (text: string) =>
    Object.values(talk!.last!.facts)
      .map((fact) => fact.text)
      .filter((text) => text.length > 3 && text !== "yes")
      .filter((fact) => text.includes(fact));
  const inserts = talk.choices.flatMap((choice) => named(choice.text));
  expect(new Set(inserts).size, `${where}: ${inserts.join(" / ")}`).toBe(
    inserts.length,
  );
  // The player's own stake decides the reply that takes a side.
  const stake = newsStake(core, playerId, subject);
  const sides = talk.choices.filter((choice) =>
    ["for", "against"].includes(choice.move),
  );
  if (stake.reason === "stance")
    expect(
      sides.every((choice) => choice.move === stake.side),
      `${where}: ${sides.map((c) => c.text).join(" / ")}`,
    ).toBe(true);
  else expect(sides).toEqual([]);
  process.stdout.write(
    `NEWS TALK ${where}: "${talk.lines.at(-1)!.text}" replies: ${talk.choices.map((c) => `${c.move}: ${c.text}`).join(" | ")}\n`,
  );
  // People on opposite sides of the story's question take opposite stands.
  const question = subject.news?.question;
  if (question) {
    const lean = (id: string) => viewOf(api, id as PersonId)?.lean;
    const people = [...core.people.values()].filter(
      (row) => row.alive && row.tier !== "husk" && lean(row.id) !== undefined,
    );
    const at = (id: string) => viewOn(api, id as PersonId, question, lean(id)!);
    const yes = people.find((row) => at(row.id) > 0);
    const no = people.find((row) => at(row.id) < 0);
    if (yes && no) {
      expect(newsStake(core, yes.id as PersonId, subject)).toMatchObject({
        reason: "stance",
        side: "for",
      });
      expect(newsStake(core, no.id as PersonId, subject)).toMatchObject({
        reason: "stance",
        side: "against",
      });
    }
  }
  // A stand the player takes is learned by the other person, citing the
  // player's stance record, and they answer in composed words.
  const otherId = talk.otherId;
  const stand = sides[0];
  const knewBefore = api.knows(otherId, viewKey(playerId));
  const lines = talk.lines.length;
  say(core, talk, (stand ?? talk.choices[0]!).key);
  const back = talk.lines
    .slice(lines)
    .find((line) => line.speakerId === otherId);
  expect(
    back?.kind,
    `${where}: ${talk.lines.map((l) => l.text).join(" / ")}`,
  ).toBe("news-back");
  if (stand) {
    expect(api.knows(otherId, viewKey(playerId))).toBeTruthy();
    if (!knewBefore)
      expect(
        core.knowledgeByPerson.get(otherId)?.get(viewKey(playerId))?.value,
      ).toContain(playerId);
  }
}, 900_000);

it("names the place that closed when the player worked there (a hand-made change on the player's own employer)", () => {
  setBookkeeping(false);
  const drawn = drawPlace(seed, "news-talk-worked");
  const world = buildBenchWorld(drawn.seed, "2025-01-20", {
    twoLevel: true,
    placeKey: drawn.key,
  });
  const { core } = world;
  // The first grown resident with a job stands in for someone whose
  // workplace closed: the change itself is hand-made, the job is the record's.
  const worker = [...core.people.values()].find(
    (row) => row.alive && row.tier !== "husk" && row.jobId,
  )!;
  const job = core.jobs.get(worker.jobId!)!;
  const stake = newsStake(core, worker.id as PersonId, {
    news: { institutionId: job.organizationId },
  });
  expect(stake).toMatchObject({ reason: "worked-there", recordIds: [job.id] });
  const stranger = [...core.people.values()].find(
    (row) =>
      row.alive &&
      row.tier !== "husk" &&
      core.jobs.get(row.jobId ?? "")?.organizationId !== job.organizationId,
  )!;
  expect(
    newsStake(core, stranger.id as PersonId, {
      news: { institutionId: job.organizationId },
    }).reason,
  ).not.toBe("worked-there");
  // Every wording of the reply names the place.
  const worked = (CONVERSATION_WORDS.subjects.news?.answers ?? []).filter(
    (move) => move.key === "worked-there",
  );
  expect(worked.length).toBeGreaterThanOrEqual(6);
  for (const move of worked) expect(move.text).toContain("{{topic}}");
}, 600_000);
