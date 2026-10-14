import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { buildDeepPast } from "../core2/deep-past";
import { initialFocusPeople } from "../core2/focus";
import { advanceCore, createLifeCore } from "../core2/life";
import { newsKey, newsModule } from "../core2/modules/news";
import { viewsModule } from "../core2/modules/views";
import { buildPopulation } from "../core2/population";
import { applyCoreEvent, coreAPI } from "../core2/state";
import {
  beliefsModule,
  beliefsOf,
  CONVERSATION_DATA,
  doubtsClaim,
  openConversation,
  say,
  sayNothing,
  type Conversation,
} from "./conversation";
import { createDirector, DEFAULT_DIRECTOR_DATA } from "./ledger";
import { REGISTER_CARDS } from "../english/speech-registers";

// M4-02, conversations (audit 1, Oct 12): at least four distinct choices
// every turn, each answering the last line from real records; talking is
// time together and passes news; a lie is believed by everyone present whose
// traits give it the benefit of the doubt, and
// is found out when someone who knows the truth talks to them.
const seed = process.env.GOLDEN_PATH_SEED ?? "conversation-test";
const base = enrichCivicInputs(
  buildDeepPast(
    buildPopulation({
      seed,
      ...(process.env.GOLDEN_PATH_SEED
        ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
        : {}),
      startedAt: "2021-01-01",
      minimumPeople: 500,
    }),
  ),
);
const age = (birth: string) =>
  ageOnDate(makeIsoDate(birth), makeIsoDate(base.startedAt));
const orgOf = (jobId: string | undefined) =>
  base.jobs.find((row) => row.id === jobId)?.organizationId;
const player = base.people.find(
  (person) =>
    person.tier !== "husk" &&
    age(person.birthDate) >= 25 &&
    age(person.birthDate) < 60 &&
    person.jobId &&
    person.knownIds.length > 4 &&
    base.households.find((row) => row.id === person.householdId)!.memberIds
      .length > 1 &&
    base.jobs.some(
      (job) =>
        job.personId !== person.id &&
        job.organizationId === orgOf(person.jobId),
    ),
)!;
const input = { ...base, playerId: player.id };
const director = createDirector({ watch: [...initialFocusPeople(input)] });
const core = createLifeCore(input, {
  modules: [viewsModule, newsModule, beliefsModule, director.module],
});
director.start(core);
advanceCore(core, "2021-01-03");
const api = coreAPI(core);
const me = core.people.get(player.id)!;
const myOrg = () =>
  core.jobs.get(core.people.get(player.id)!.jobId!)?.organizationId;
const strangers = [...core.people.values()].filter(
  (row) =>
    row.alive &&
    row.tier !== "husk" &&
    row.id !== me.id &&
    !me.knownIds.has(row.id) &&
    row.householdId !== me.householdId &&
    row.jobId !== undefined &&
    core.jobs.get(row.jobId)!.organizationId !== myOrg() &&
    age(row.birthDate) >= 18,
);
// The people already known, before the player meets three strangers: the
// first, then two whose traits give a claim the benefit of the doubt (a hearer
// who leans hard toward doubt keeps no belief; see the last test).
const others = [...me.knownIds].filter((id) => core.people.get(id)?.alive);
const believing = strangers
  .slice(1)
  .filter((row) => !doubtsClaim(core, row))
  .slice(0, 2);
const doubter = strangers.find((row) => doubtsClaim(core, row));
for (const row of [strangers[0]!, ...believing])
  api.meet(me.id, row.id, {
    placeId: me.placeId,
    sourceId: "fixture-meeting",
    cause: "met-in-group",
    hours: 1,
  });

/** The other person's first question, after any greeting. */
const opening = (talk: Conversation) =>
  talk.lines.find((row) => row.kind !== "greet")!;

describe(`conversations in ${base.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("offers four distinct replies every turn, each answering the last line and only following on from it", () => {
    const four = DEFAULT_DIRECTOR_DATA.parameters.directorChoicesPerTurn!.value;
    let turns = 0;
    for (const otherId of others.slice(0, 15)) {
      const talk = openConversation(core, player.id, otherId);
      // A greeting at most, then one question.
      expect(talk.lines.filter((row) => row.kind !== "greet").length).toBe(1);
      for (let turn = 0; turn < 4 && talk.choices.length; turn += 1) {
        const last = talk.lines.at(-1)!;
        expect(last.speakerId).toBe(otherId);
        expect(last.kind).not.toBe("ack");
        // Four replies, always (owner, Oct 14), each saying something else.
        const texts = talk.choices.map((row) => row.text);
        expect(texts).toHaveLength(four);
        expect(new Set(texts).size).toBe(texts.length);
        // A second move only follows from the first (owner, batch 6): the
        // same question turned back, or their work after yours.
        const follows =
          CONVERSATION_DATA.follows[last.kind.replace(/-new$/, "")] ?? [];
        // A how-is question is answered, never with whether they were seen
        // (batch 10: "How's Stephen doing?" offered "No, I haven't.").
        const howIs = /^How(?:'s| is)\b/.test(last.text);
        for (const choice of talk.choices) {
          if (howIs)
            expect(choice.text).not.toMatch(
              /\bhaven't\b|\btalked to\b|\bI saw\b/,
            );
          expect(choice.answers).toBe(last.subjectId);
          expect(choice.sourceRecordIds.length).toBeGreaterThan(0);
          expect(choice.text).not.toMatch(/\b(goodbye|leave|bye)\b/i);
          if (choice.raises)
            expect(follows).toContain(choice.raises.split(":")[0]);
        }
        say(core, talk, talk.choices[turn % talk.choices.length]!.key);
        turns += 1;
      }
    }
    expect(turns).toBeGreaterThan(15);
  });

  it("lets the player say nothing, and the other person carries on or the talk ends", () => {
    const otherId = others[0]!;
    const talk = openConversation(core, player.id, otherId);
    const said = talk.lines.length;
    sayNothing(core, talk);
    // Nothing is said for the player; the other person speaks next, or leaves.
    expect(
      talk.lines.slice(said).every((row) => row.speakerId === otherId),
    ).toBe(true);
    expect(talk.lines.length).toBeGreaterThan(said);
  });

  it("records talking as time together, and passes news the other hasn't heard", () => {
    const otherId = others.find((id) => !me.familyIds.has(id))!;
    applyCoreEvent(core, {
      id: "fixture-story",
      date: core.date,
      kind: "election.result",
      personIds: [player.id],
      placeId: me.placeId,
      publicRecord: true,
      source: { tag: "SOURCED", citation: "Fixture story.", asOf: core.date },
    });
    const knewBefore = api.knows(otherId, newsKey("fixture-story"));
    const talk = openConversation(core, player.id, otherId);
    say(core, talk, talk.choices[0]!.key);
    const tie = [...(core.relationshipsByPerson.get(player.id) ?? [])]
      .map((id) => core.relationships.get(id)!)
      .find((row) => row.actorId === otherId || row.otherId === otherId)!;
    expect(tie.lastContactDate).toBe(core.date);
    if (!knewBefore)
      expect(api.knows(otherId, newsKey("fixture-story"))?.access).toBe("told");
  });

  it("strangers ask what they don't know, and the scales dim for what they already know", () => {
    const talk = openConversation(core, player.id, strangers[0]!.id);
    expect(opening(talk).text).toMatch(/\?$/);
    expect(talk.lies.length).toBeGreaterThan(0);
    const coworker = [...core.jobs.values()].find(
      (job) => job.personId !== player.id && job.organizationId === myOrg(),
    )!.personId;
    const known = openConversation(core, player.id, coworker);
    if (opening(known).kind === "own-work") expect(known.lies).toEqual([]);
  });

  it("turns every choice false with the scales: different moves, each contradicting the player's record", () => {
    const talk = openConversation(core, player.id, strangers[0]!.id);
    expect(talk.lies.length).toBeGreaterThan(1);
    const moves = talk.lies.map((row) => row.move);
    expect(new Set(moves).size).toBe(moves.length);
    const texts = talk.lies.map((row) => row.text);
    expect(new Set(texts).size).toBe(texts.length);
    // Both kinds of lie: a denial and a believable false alternative.
    expect(new Set(talk.lies.map((row) => row.key.split(":")[2])).size).toBe(2);
    const own = opening(talk).kind.startsWith("own-work")
      ? { key: `person:${player.id}:employer`, value: myOrg() }
      : { key: `person:${player.id}:place`, value: me.placeId };
    for (const lie of talk.lies) {
      expect(lie.lie).toBe(true);
      expect(lie.claim?.key).toBe(own.key);
      expect(lie.claim?.value).not.toBe(own.value);
      expect(lie.wording?.parts.length).toBeGreaterThan(0);
      expect(talk.choices.map((row) => row.text)).not.toContain(lie.text);
    }
  });

  it("leaves a lie as a belief in everyone present, until someone who knows the truth tells them", () => {
    const [hearerId, bystanderId] = [believing[0]!.id, believing[1]!.id];
    for (const id of [hearerId, bystanderId]) director.watch(core, id);
    const talk = openConversation(core, player.id, hearerId, {
      presentIds: [bystanderId],
    });
    expect(talk.lies.length).toBeGreaterThan(0);
    const key = opening(talk).kind.startsWith("own-work")
      ? `person:${player.id}:employer`
      : `person:${player.id}:place`;
    say(core, talk, talk.lies[0]!.key);
    for (const id of [hearerId, bystanderId]) {
      expect(beliefsOf(api, id).map((row) => row.key)).toContain(key);
      expect(api.knows(id, key)?.access).toBe("told");
    }
    const lie = [
      ...director.ledger.people.get(player.id)!.keptFacts.values(),
    ].find((row) => row.kind === "lie" && row.otherId === hearerId)!;
    expect(lie.endedAt).toBeUndefined();
    // Later, someone who knows the truth talks with the hearer.
    advanceCore(core, "2021-01-05");
    const knower = key.endsWith(":employer")
      ? [...core.jobs.values()].find(
          (job) => job.personId !== player.id && job.organizationId === myOrg(),
        )!.personId
      : core.households
          .get(me.householdId)!
          .memberIds.find((id) => id !== player.id)!;
    api.relationship(knower, hearerId, "contact", 1, undefined, {
      cause: "fixture-talk",
    });
    expect(beliefsOf(api, hearerId).map((row) => row.key)).not.toContain(key);
    expect(api.knows(hearerId, key)?.access).not.toBe("told");
    expect(lie.endedAt).toBe(core.date);
    // The bystander, who hasn't talked with anyone who knows, still believes it.
    expect(beliefsOf(api, bystanderId).map((row) => row.key)).toContain(key);
  });

  it("talks like small talk: short turns, as in the counted corpus", () => {
    const card = REGISTER_CARDS["small-talk"];
    const median = card.checks.find((row) => row.key === "median-words")!.value;
    const short = card.checks.find((row) => row.key === "short-turns")!.value;
    const lengths: number[] = [];
    for (const otherId of others.slice(0, 20)) {
      const talk = openConversation(core, player.id, otherId);
      for (let turn = 0; turn < 4 && talk.choices.length; turn += 1)
        say(core, talk, talk.choices[(turn * 3) % talk.choices.length]!.key);
      for (const line of talk.lines)
        lengths.push(line.text.split(/\s+/).length);
    }
    lengths.sort((a, b) => a - b);
    expect(lengths.length).toBeGreaterThan(20);
    expect(
      Math.abs(lengths[Math.floor(lengths.length / 2)]! - median),
    ).toBeLessThanOrEqual(2);
    const shortShare = lengths.filter((n) => n <= 3).length / lengths.length;
    expect(Math.abs(shortShare - short)).toBeLessThan(0.2);
  });
  it("leaves no belief in a hearer whose traits lean hard toward doubt", () => {
    expect(doubter).toBeDefined();
    api.meet(me.id, doubter!.id, {
      placeId: me.placeId,
      sourceId: "fixture-meeting",
      cause: "met-in-group",
      hours: 1,
    });
    const talk = openConversation(core, player.id, doubter!.id);
    expect(talk.lies.length).toBeGreaterThan(0);
    const key = opening(talk).kind.startsWith("own-work")
      ? `person:${player.id}:employer`
      : `person:${player.id}:place`;
    say(core, talk, talk.lies[0]!.key);
    expect(beliefsOf(api, doubter!.id).map((row) => row.key)).not.toContain(
      key,
    );
  });
});
