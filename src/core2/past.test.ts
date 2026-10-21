import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { promisesOf, votesOf } from "./modules/record";
import { LAWS_MODULE_ID } from "./modules/laws";
import { NEWS_MODULE_ID } from "./modules/news";
import { outletsHere, PRESS_MODULE_ID, townOutlet } from "./modules/press";
import { ARCHIVE_STORY_KIND } from "./press-desk";
import {
  lawHistory,
  PAST_MODULE_ID,
  type PastElectionRow,
  type PublicFigureRow,
} from "./past-module";
import type { PastClosureRow } from "./past-business";
import { businessesIn, stateExitShare } from "./modules/business";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { publicKnowledgeOf } from "./past-public";
import { openThePast } from "./past";
import { coreAPI } from "./state";

// The world has a past (owner, Oct 14, 2026), in the world the owner plays:
// the bench world on a seed nobody chose, every module installed. Every
// check reads records other engines read.
const seed = process.env.PAST_SEED ?? randomBytes(8).toString("hex");
const opening = gameStartDate();
const world = buildBenchWorld(seed, opening, { twoLevel: true });
const api = coreAPI(world.core);
const rows = <T>(table: string) =>
  api.moduleState(PAST_MODULE_ID).table(table).rows() as unknown as T[];

describe(`the world has a past (${world.place.key}, seed ${seed})`, () => {
  it("gives every law in force a history passed before day one", () => {
    const laws = api.moduleState(LAWS_MODULE_ID).table("laws").rows();
    expect(laws.length).toBeGreaterThan(0);
    for (const law of laws) {
      const history = lawHistory(api, law.id as string);
      if (!history) {
        // Rows of one enactment share the history of its first row.
        const shared = rows<{ lawIds: string[] }>("laws").some((h) =>
          h.lawIds.includes(law.id as string),
        );
        expect(shared, law.id as string).toBe(true);
        continue;
      }
      expect(history.enactedOn < opening).toBe(true);
      expect(history.enactedOn <= history.effectiveDate).toBe(true);
      for (const call of history.rollCalls)
        expect(call.yes, `${history.id} ${call.body}`).toBeGreaterThan(call.no);
    }
  });

  it("seats every elected officeholder by an election with votes that add up", () => {
    const elections = rows<PastElectionRow>("elections");
    expect(elections.length).toBeGreaterThan(0);
    for (const election of elections) {
      expect(election.date < opening).toBe(true);
      const [winner, challenger] = election.candidates;
      expect(winner!.votes).toBeGreaterThan(challenger!.votes);
      expect(winner!.votes + challenger!.votes).toBe(election.totalVotes);
    }
  });

  it("gives officeholders a prior-term voting record the record engine reads", () => {
    const elections = rows<PastElectionRow>("elections");
    // A territory's delegate casts no floor vote; a place with any chamber
    // covering it has members with a record.
    if (rows("bills").length) {
      const withVotes = elections.filter(
        (e) => votesOf(api, e.winnerId).length > 0,
      );
      expect(withVotes.length).toBeGreaterThan(0);
      for (const election of withVotes)
        for (const vote of votesOf(api, election.winnerId))
          expect(vote.date < opening).toBe(true);
    }
    // The record engine reads every winner's campaign promises.
    const promised = elections.filter((e) => e.promiseIds.length);
    for (const election of promised)
      expect(promisesOf(api, election.winnerId).length).toBeGreaterThan(0);
  });

  it("has a news archive from the year before day one", () => {
    const stories = api
      .moduleState(NEWS_MODULE_ID)
      .table("stories")
      .rows()
      .filter((s) => (s.date as string) < opening);
    expect(stories.length).toBeGreaterThanOrEqual(5);
  });

  it("archives the businesses that closed in the year before day one", () => {
    const closures = rows<PastClosureRow>("closures");
    const expected = Math.round(
      businessesIn(api, world.placeId).length * stateExitShare(api),
    );
    expect(closures.length).toBeLessThanOrEqual(expected);
    // A year's expected closures happen unless no one past retirement age is left to have closed one.
    if (expected > 0) {
      const retired = [...world.core.people.values()].some(
        (p) =>
          p.alive &&
          ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(opening)) >=
            api.parameter("jobsEarliestRetirementAge"),
      );
      if (retired) expect(closures.length).toBeGreaterThan(0);
    }
    for (const closure of closures) {
      expect(closure.date < opening, closure.id).toBe(true);
      const owner = world.core.people.get(closure.ownerId)!;
      expect(owner.alive).toBe(true);
      // The former owner heard of it the day it happened, from the printed story.
      const story = api
        .moduleState(NEWS_MODULE_ID)
        .table("stories")
        .rows()
        .find(
          (row) =>
            (row.facts as Record<string, string>).recordId === closure.id,
        );
      expect(story, closure.id).toBeTruthy();
      expect(story!.facts).toMatchObject({
        ownerId: closure.ownerId,
        recordKind: "business.closed",
      });
      expect(
        api
          .moduleState(NEWS_MODULE_ID)
          .table("heard")
          .get(`${closure.ownerId}:${story!.id}`),
        closure.id,
      ).toBeTruthy();
    }
    process.stdout.write(
      `${world.place.key} seed ${seed}: ${closures.map((c) => c.id).join(", ") || "no closures"}\n`,
    );
  });

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

  it("gives the player's household its own history", () => {
    const player = world.core.people.get(world.playerId!)!;
    const kinds = new Set((player.pastFacts ?? []).map((f) => f.kind));
    expect(kinds.has("household:livelihood")).toBe(true);
    const parents = (player.pastFacts ?? []).filter(
      (f) => f.kind === "family:parent",
    );
    const home = world.core.households.get(player.householdId)!;
    const parentsAtHome = parents.filter((f) =>
      home.memberIds.includes(f.facts?.otherPersonId ?? ""),
    );
    const partners = parentsAtHome.some((f) =>
      (world.core.people.get(f.facts!.otherPersonId!)?.pastFacts ?? []).some(
        (g) =>
          g.kind === "family:partner" &&
          parentsAtHome.some(
            (h) => h.facts?.otherPersonId === g.facts?.otherPersonId,
          ),
      ),
    );
    if (partners) expect(kinds.has("household:parents-met")).toBe(true);
  });

  it("opens once", () => {
    const summary = openThePast(world.core, seed);
    expect(summary.elections).toBe(rows("elections").length);
  });
});
