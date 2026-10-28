import { preStartHistory } from "./pre-start";
import { FAMILY_PARTNERED } from "./modules/people";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { promisesOf, votesOf } from "./modules/record";
import { LAWS_MODULE_ID } from "./modules/laws";
import { NEWS_MODULE_ID } from "./modules/news";
import { outletsHere, PRESS_MODULE_ID, townOutlet } from "./modules/press";
import { ARCHIVE_STORY_KIND } from "./press-desk";
import { CAMPAIGNS_MODULE_ID, type PromiseRow } from "./modules/campaigns";
import {
  OFFICES_MODULE_ID,
  pastElections,
  type TermRow,
} from "./modules/offices";
import {
  lawHistory,
  PAST_MODULE_ID,
  type PublicFigureRow,
} from "./past-module";
import { businessesIn, stateExitShare } from "./modules/business";
import { publicKnowledgeOf } from "./past-public";
import { openThePast } from "./past";
import { POLICY_QUESTIONS } from "./policy-answers";
import { coreAPI } from "./state";

// The world has a past (owner, Oct 14, 2026), in the world the owner plays:
// the bench world on a seed nobody chose, every module installed. Every
// check reads records other engines read.
const seed = process.env.PAST_SEED ?? randomBytes(8).toString("hex");
const opening = gameStartDate();
const world = buildBenchWorld(seed, opening, { twoLevel: true });
const api = coreAPI(world.core);
/** Places drawn, at most, for one with a closure in its past. */
const CLOSURE_PLACES = 6;
const rows = <T>(table: string) =>
  api.moduleState(PAST_MODULE_ID).table(table).rows() as unknown as T[];

describe(`the world has a past (${world.place.key}, seed ${seed})`, () => {
  it("gives every law in force a history passed before day one", () => {
    const laws = api.moduleState(LAWS_MODULE_ID).table("laws").rows();
    expect(laws.length).toBeGreaterThan(0);
    const histories = rows<{ id: string; lawIds: string[] }>("laws");
    // The recorded answer behind a starting law row, read from the research
    // file by the state and question in the row's id, not from the engine's
    // own idea of which rows are absent.
    const recorded = (id: string) => {
      const match =
        /^law:([^:]+):(?:federal|state):(.+):general:starting$/.exec(id);
      return match
        ? POLICY_QUESTIONS[match[2]!]?.answers[match[1]!]?.answer
        : undefined;
    };
    const noAnswers: string[] = [];
    let yesAnswers = 0;
    for (const law of laws) {
      const id = law.id as string;
      const history = lawHistory(api, id);
      const shared = histories.some((h) => h.lawIds.includes(id));
      // A recorded answer of no: the place has no such law, so nothing
      // records its passage, a roll call or a signer.
      if (recorded(id) === "no") {
        expect(history, id).toBeUndefined();
        expect(shared, id).toBe(false);
        noAnswers.push(id);
        continue;
      }
      // A recorded answer of yes is a real law with a history, its own or
      // that of the enactment its row shares.
      if (recorded(id) === "yes") {
        yesAnswers += 1;
        expect(history !== undefined || shared, id).toBe(true);
      }
      if (!history) {
        // Rows of one enactment share the history of its first row.
        expect(shared, id).toBe(true);
        continue;
      }
      expect(history.enactedOn < opening).toBe(true);
      expect(history.enactedOn <= history.effectiveDate).toBe(true);
      for (const call of history.rollCalls)
        expect(call.yes, `${history.id} ${call.body}`).toBeGreaterThan(call.no);
    }
    // Every state answers some policy questions no and some yes.
    expect(noAnswers.length).toBeGreaterThan(0);
    expect(yesAnswers).toBeGreaterThan(0);
    process.stdout.write(
      `past laws: ${noAnswers.length} recorded answers of no, none with a history (for example ${noAnswers.slice(0, 2).join(", ")}); ${yesAnswers} of yes, each with one\n`,
    );
  });

  // The past's elections, as the paper printed them: the archive's stories
  // of the races in the year before day one.
  const printedElections = () =>
    api
      .moduleState(NEWS_MODULE_ID)
      .table("stories")
      .rows()
      .map((row) => row.facts as Record<string, string>)
      .filter((facts) => facts.recordKind === "election-result");
  // Every prior race's campaign promises, as the campaigns engine keeps them.
  const pastPromises = () =>
    (
      api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("promises")
        .rows() as unknown as PromiseRow[]
    ).filter((p) => p.contestId.startsWith("prior-election:"));

  it("seats every elected officeholder by the one election the offices engine recorded", () => {
    // The offices engine is the one writer of how each holder was elected
    // (wire-opening line 31): every elected term carries its race, won.
    const elected = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .rows() as unknown as TermRow[]
    ).filter((t) => t.elected);
    expect(elected.length).toBeGreaterThan(0);
    for (const term of elected) {
      expect(term.elected!.date < opening, term.id).toBe(true);
      expect(term.elected!.date <= term.startDate, term.id).toBe(true);
      expect(term.elected!.share, term.id).toBeGreaterThan(0.5);
      expect(term.elected!.share, term.id).toBeLessThan(1);
    }
    // The paper prints those same races: the winner's votes are the share
    // the offices engine recorded, in whole votes, and add up to a win.
    const printed = printedElections();
    expect(printed.length).toBeGreaterThan(0);
    let matched = 0;
    for (const facts of printed) {
      const winner = Number(facts.winnerVotes);
      const total = Number(facts.totalVotes);
      expect(winner * 2, facts.contestId).toBeGreaterThan(total);
      expect(winner, facts.contestId).toBeLessThanOrEqual(total);
      const date = facts.contestId!.slice(-10);
      const race = pastElections(api, facts.seatId!).find(
        (e) => e.date === date,
      );
      // Only the federal executive's race has no seat record of its own.
      if (!race) continue;
      matched += 1;
      expect(winner, facts.contestId).toBe(
        Math.min(
          total,
          Math.max(Math.round(total * race.share), Math.floor(total / 2) + 1),
        ),
      );
    }
    expect(matched).toBeGreaterThan(0);
  });

  it("gives officeholders a prior-term voting record the record engine reads", () => {
    const promises = pastPromises();
    expect(promises.length).toBeGreaterThan(0);
    const winners = [...new Set(promises.map((p) => p.candidateId))];
    // A territory's delegate casts no floor vote; a place with any chamber
    // covering it has members with a record.
    if (rows<PublicFigureRow>("figures").some((f) => f.votesOnRecord > 0)) {
      const withVotes = winners.filter((id) => votesOf(api, id).length > 0);
      expect(withVotes.length).toBeGreaterThan(0);
      for (const id of withVotes)
        for (const vote of votesOf(api, id))
          expect(vote.date < opening).toBe(true);
    }
    // The record engine reads every winner's campaign promises.
    for (const id of winners)
      expect(promisesOf(api, id).length, id).toBeGreaterThan(0);
  });

  it("has a news archive from the year before day one", () => {
    const stories = api
      .moduleState(NEWS_MODULE_ID)
      .table("stories")
      .rows()
      .filter((s) => (s.date as string) < opening);
    expect(stories.length).toBeGreaterThanOrEqual(5);
  });

  it(
    "archives the businesses that closed in the year before day one, each told and heard",
    () => {
      // The world above first, then other drawn places (bounded), until one
      // has a closure in its past: it is checked in full, story and hearing.
      const tried: string[] = [];
      for (let attempt = 0; attempt < CLOSURE_PLACES; attempt += 1) {
        const here =
          attempt === 0
            ? world
            : buildBenchWorld(`${seed}:closures:${attempt}`, opening, {
                twoLevel: true,
              });
        const a = coreAPI(here.core);
        const where = `${here.place.key} seed ${attempt === 0 ? seed : `${seed}:closures:${attempt}`}`;
        // The closures are the archive's own stories of kind business.closed.
        const closureStories = a
          .moduleState(NEWS_MODULE_ID)
          .table("stories")
          .rows()
          .filter(
            (row) =>
              (row.facts as Record<string, string>).recordKind ===
              "business.closed",
          );
        const closures = closureStories.map((row) => ({
          id: (row.facts as Record<string, string>).recordId!,
          ownerId: (row.facts as Record<string, string>).ownerId!,
          date: row.date as string,
        }));
        const expected = Math.round(
          businessesIn(a, here.placeId).length * stateExitShare(a),
        );
        // No more closures than the state's exit share of the town's firms.
        expect(closures.length, where).toBeLessThanOrEqual(expected);
        for (const closure of closures) {
          expect(closure.date < opening, closure.id).toBe(true);
          const owner = here.core.people.get(closure.ownerId)!;
          expect(owner.alive, closure.id).toBe(true);
          // The former owner heard of it the day it happened, from the printed story.
          const story = closureStories.find(
            (row) =>
              (row.facts as Record<string, string>).recordId === closure.id,
          );
          expect(story, closure.id).toBeTruthy();
          expect(story!.facts).toMatchObject({
            ownerId: closure.ownerId,
            recordKind: "business.closed",
          });
          expect(
            a
              .moduleState(NEWS_MODULE_ID)
              .table("heard")
              .get(`${closure.ownerId}:${story!.id}`),
            closure.id,
          ).toBeTruthy();
        }
        tried.push(`${where}: ${closures.length} of ${expected} expected`);
        if (!closures.length) continue;
        process.stdout.write(
          `PAST CLOSURES ${where}: ${closures.map((c) => c.id).join(", ")}\n`,
        );
        return;
      }
      throw new Error(
        `no drawn place had a closure in its past in ${CLOSURE_PLACES} places: ${tried.join("; ")}`,
      );
      // An opening build took 13 to 46 seconds on a 4-core container; up to CLOSURE_PLACES of them.
    },
    CLOSURE_PLACES * 120_000,
  );

  it("carries the archive on the press's own list of outlets", () => {
    const paper = townOutlet(api)!;
    expect(paper).not.toBeNull();
    const archived = api
      .moduleState(NEWS_MODULE_ID)
      .table("stories")
      .rows()
      .filter((s) => (s.date as string) < opening);
    expect(archived.length).toBeGreaterThan(0);
    for (const story of archived)
      expect(story.outletId, `${story.id}`).toBe(paper.organizationId);
    expect(
      outletsHere(api).some((o) => o.organizationId === paper.organizationId),
    ).toBe(true);
    // One list of outlets: the news engine keeps none of its own.
    expect(() => api.moduleState(NEWS_MODULE_ID).table("outlets")).toThrow();
  });

  it("has the press write every archive story, with its source record and framing", () => {
    const paper = townOutlet(api)!;
    const archived = api
      .moduleState(NEWS_MODULE_ID)
      .table("stories")
      .rows()
      .filter((s) => (s.date as string) < opening);
    expect(archived.length).toBeGreaterThan(0);
    const printed = api
      .moduleState(PRESS_MODULE_ID)
      .table("archive")
      .rows() as unknown as { id: string; slant: number }[];
    for (const story of archived) {
      const where = `${world.place.key}, seed ${seed}, ${story.id}`;
      // One writer: no story keeps a kind of the news archive's own.
      expect(story.kind, where).toBe(ARCHIVE_STORY_KIND);
      const facts = story.facts as Record<string, string>;
      expect(facts.recordId, where).toBeTruthy();
      expect(facts.recordKind, where).toBeTruthy();
      // The paper's reporter slanted it, and the story carries that framing.
      const row = printed.find((p) => p.id === story.id);
      if (row) expect(story.framing, where).toBe(row.slant);
      else expect(paper.reporterIds?.length ?? 0, where).toBe(0);
    }
    // The desk's own stories stay the desk's: no archive row is among them.
    const desk = api.moduleState(PRESS_MODULE_ID).table("stories").rows();
    for (const row of printed)
      expect(desk.some((d) => d.id === row.id)).toBe(false);
  });

  it("lets the player know the president without having met them", () => {
    const president = rows<PublicFigureRow>("figures").find((f) =>
      f.officeId.endsWith(":president"),
    )!;
    expect(president).toBeDefined();
    const known = publicKnowledgeOf(api, world.playerId!, president.personId);
    expect(known).not.toBeNull();
    expect(known!.met).toBe(false);
    expect(known!.positions.length).toBeGreaterThan(0);
    expect(known!.reputation.length).toBeGreaterThan(0);
  });

  it("gives the player's household its own history, from the year the player was born", () => {
    const player = world.core.people.get(world.playerId!)!;
    // The history starts in the player's birth year (owner, Oct 28, 2026),
    // so the player's birth is a record of the run, where their records put
    // their parents that day.
    const birth = preStartHistory(world.core, {
      kind: "person.birth",
      personId: player.id,
    });
    expect(birth.map((row) => row.id)).toEqual([
      `person-history:${player.id}:birth`,
    ]);
    expect(birth[0]!.placeId).toBeDefined();
    // Every couple whose home began inside the run has its record, naming
    // both partners.
    for (const row of preStartHistory(world.core, { kind: FAMILY_PARTNERED }))
      expect(row.personIds?.length, row.id).toBe(2);
  });

  it("opens once", () => {
    const stories = api.moduleState(NEWS_MODULE_ID).table("stories").size;
    const promises = pastPromises().length;
    const summary = openThePast(world.core, seed);
    expect(summary.elections).toBeGreaterThan(0);
    expect(summary.elections).toBeGreaterThanOrEqual(printedElections().length);
    // A second opening reads the first one's summary and writes nothing.
    expect(openThePast(world.core, seed)).toEqual(summary);
    expect(api.moduleState(NEWS_MODULE_ID).table("stories").size).toBe(stories);
    expect(pastPromises().length).toBe(promises);
  });
});
