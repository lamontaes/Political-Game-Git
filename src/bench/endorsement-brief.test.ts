/**
 * An endorsement brief in News (Fable A's rule 15, Nov 13; P2, Fruitland,
 * Idaho, seed 6c66ce96-86ed-47d7-ad37-063de2ddc0bf: "The friends of policing
 * backs Clara Evans for Mayor. The friends of policing endorsed Clara Evans for
 * Mayor."). In a place drawn from all 56, a founded group (named the way the
 * drives engine names one, by its key and topic) backs a candidate in one of
 * the place's own contests, and the press's printed story is worded: the
 * group keeps its capitals, takes the verb its number needs, and the body
 * says the vote's day instead of the headline again.
 */
import { expect, it } from "vitest";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import { causeGroupForm, causeGroupName } from "../english/group-names";
import { allQuestions } from "../english/policy-names";
import { wordPrintedStory } from "./archive-words";
import { buildBenchWorld } from "./world";

// Pinned (lead's ruling, Nov 14: no run-time draws): Laurel, Montana, a world
// seed chosen from data, the place of the played proof in
// endorsement-played.test.ts.
const seed = "61920e6dab2c03e17ef5ac6f144609e87ba9b08f99dcf251c8f0ef6b7d82e6a4";
const placeKey = "3042700";

it(`an endorsement keeps the group's name and number, says what it works for and does not repeat its headline (seed ${seed})`, () => {
  setBookkeeping(false);
  const where = `place ${placeKey}, seed ${seed}`;
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const api = coreAPI(core);
  const contest = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  ).find((row) => row.electionDate > core.date);
  expect(contest, `${where}: a contest on record`).toBeTruthy();
  const candidate = [...core.people.values()].find(
    (row) => row.alive && row.tier !== "husk",
  )!;
  const topic = allQuestions()[0]!;
  // One group of each number, named by the English engine from its key.
  const groups = new Map<boolean, string>();
  for (let n = 0; groups.size < 2 && n < 200; n += 1) {
    const id = `organization:cause-group:fixture-${n}:cause:${topic}`;
    const form = causeGroupForm(causeGroupName(id, topic) ?? "");
    if (form && !groups.has(form.plural)) groups.set(form.plural, id);
  }
  expect(groups.size, where).toBe(2);
  for (const [plural, id] of groups) {
    api.addOrganization({
      id,
      placeId: candidate.placeId,
      name: id,
      kind: "cause-group",
      topic,
      liquidMinor: 0,
      source: {
        tag: "ESTIMATED",
        asOf: api.state.date,
        citation: "Test fixture: a cause group founded by a resident's drive",
        estimatedFrom: "the drives engine's found-cause-group act",
      },
    } as never);
    const name = causeGroupName(id, topic)!;
    const worded = wordPrintedStory(core, {
      id: `printed:${id}`,
      kind: "press.printed",
      date: core.date,
      facts: {
        sourceRecordId: `campaign-endorsed:${id}:${core.date}`,
        organizationId: id,
        candidateId: candidate.id,
        contestId: contest!.id,
        // The stance the group's yes stood on: the second sentence says what
        // the group works for, from its own record.
        stanceQuestion: topic,
        stancePosition: "1",
      },
    } as never);
    const body = worded?.paragraphs?.length
      ? worded.paragraphs
      : [worded?.lede ?? ""];
    const text = `${worded?.headline} | ${body.join(" ")}`;
    process.stdout.write(`${where}: ${text}\n`);
    expect(worded?.headline, where).toBeTruthy();
    expect(body.join(""), `${where}: a body`).toBeTruthy();
    // The name is said as its record names it, whole, with no article added.
    expect(worded?.headline?.startsWith(name), `${where}: ${text}`).toBe(true);
    // The verb its number needs.
    if (plural)
      expect(text, where).not.toMatch(/ backs | endorses | is backing /);
    else expect(text, where).not.toMatch(/ back | endorse | are backing /);
    // The body says what the group works for, the second sentence.
    expect(body.join(" "), `${where}: what the group works for`).toMatch(
      /works for|Its cause is/,
    );
    // The body says something the headline does not: the vote's day.
    expect(body.join(" "), where).toMatch(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December) \d/,
    );
  }
}, 600_000);
