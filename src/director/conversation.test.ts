import { describe, expect, it } from "vitest";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { buildDeepPast } from "../core2/deep-past";
import { initialFocusPeople } from "../core2/focus";
import { advanceCore, createLifeCore } from "../core2/life";
import { newsKey, newsModule } from "../core2/modules/news";
import { viewsModule } from "../core2/modules/views";
import { P } from "../core2/parameters";
import { buildPopulation } from "../core2/population";
import { decisionLean } from "../core2/trait-decisions";
import { applyCoreEvent, coreAPI } from "../core2/state";
import {
  beliefsModule,
  beliefsOf,
  CONVERSATION_DATA,
  doubtsClaim,
  openConversation,
  say,
  subjectsBetween,
  sayNothing,
  type Conversation,
} from "./conversation";
import { createDirector, DEFAULT_DIRECTOR_DATA } from "./ledger";
import {
  CONVERSATION_RULES,
  MINED_CONVERSATION,
} from "./mined/conversation-bank";
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
const recentDays =
  DEFAULT_DIRECTOR_DATA.parameters.directorTalkRecentDays!.value;
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
        // An acknowledgment ("Okay.", "All right.") takes in a statement; it
        // is never a reply to a question, which every reply moves on
        // (owner, Oct 15). Where a question has fewer than four real
        // wordings in its stage ("Where did you go to school?"), it gets
        // fewer, never a filler.
        const questioned = last.act === "ask" || /\?$/.test(last.text);
        if (questioned) {
          for (const choice of talk.choices)
            expect(choice.move, choice.text).not.toMatch(/^ack:/);
          expect(texts.length).toBeGreaterThanOrEqual(P.two);
        } else expect(texts).toHaveLength(four);
        expect(texts.length).toBeLessThanOrEqual(four);
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
    // Relatives talk personal subjects only and often have nothing to say
    // (owner, Oct 15, evening), so fewer turns run than before.
    expect(turns).toBeGreaterThan(8);
  });

  it("lets the player say nothing, and the other person carries on or the talk ends", () => {
    // Someone the talk is still open with (a talk can end at its opening
    // when the topic is done, or was their last talk's).
    const otherId = others.find(
      (id) => openConversation(core, player.id, id).choices.length,
    )!;
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
    // A lie about work is a denial or a believable false alternative; a lie
    // about where the player is from always names another place (owner, Oct 15).
    const kinds = new Set(talk.lies.map((row) => row.key.split(":")[2]));
    if (opening(talk).kind.startsWith("own-work")) expect(kinds.size).toBe(2);
    else expect([...kinds]).toEqual(["elsewhere"]);
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

  it("talks personal subjects only between relatives: no work, school, home or mutual friends", () => {
    const dropped = CONVERSATION_RULES.familyTalk.dropped;
    const kin = [...me.familyIds].filter((id) => core.people.get(id)?.alive);
    expect(kin.length).toBeGreaterThan(0);
    for (const id of kin) {
      for (const [from, to] of [
        [me.id, id],
        [id, me.id],
      ] as const)
        for (const row of subjectsBetween(core, from, to))
          expect(dropped).not.toContain(row.kind);
      const talk = openConversation(core, me.id, id);
      for (const line of talk.lines)
        expect(line.text).not.toMatch(/Have you talked to|Where do you work/);
    }
    // Outside the family the same subjects are still there.
    expect(
      strangers
        .flatMap((row) => subjectsBetween(core, me.id, row.id))
        .some((row) => dropped.includes(row.kind)),
    ).toBe(true);
  });

  it("names another place when the player lies about where they are from, and says no calendar date", () => {
    const home = strangers
      .map((row) => openConversation(core, player.id, row.id))
      .find((talk) => !opening(talk).kind.startsWith("own-work"));
    if (home) {
      expect(home.lies.length).toBeGreaterThan(0);
      for (const lie of home.lies) {
        expect(lie.text).not.toMatch(/not here|^no\b/i);
        expect(lie.claim?.value).not.toBe(me.placeId);
      }
    }
    // Nobody says a date in speech: "I talked to Diana on November 13".
    const spoken = (talk: Conversation) =>
      [
        ...talk.lines.map((row) => row.text),
        ...talk.choices.map((row) => row.text),
        ...talk.lies.map((row) => row.text),
      ].join(" ");
    const months =
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}\b/;
    for (const row of strangers.slice(0, 6))
      expect(spoken(openConversation(core, player.id, row.id))).not.toMatch(
        months,
      );
    for (const id of others.slice(0, 6))
      expect(spoken(openConversation(core, player.id, id))).not.toMatch(months);
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
  it("talks of someone not in the room only when something recorded happened to them", () => {
    for (const otherId of others.slice(0, 15)) {
      // With no ledger to read, no one absent is asked after at all.
      expect(
        subjectsBetween(core, player.id, otherId).filter((row) =>
          ["mutual", "family"].includes(row.kind),
        ),
      ).toEqual([]);
      const since = addDays(makeIsoDate(core.date), -recentDays);
      for (const row of subjectsBetween(core, player.id, otherId, director))
        if (row.kind === "mutual" || row.kind === "family") {
          const about = row.aboutId!;
          // Something that happened to them, never only news they read.
          const happened = (label: string) =>
            CONVERSATION_DATA.happenings!.prefixes.some((prefix) =>
              label.startsWith(prefix),
            );
          const theirs = director.ledger.people
            .get(about)
            ?.moments.some(
              (moment) => moment.date > since && happened(moment.label),
            );
          const mine = director.ledger.people
            .get(player.id)
            ?.moments.some(
              (moment) =>
                moment.date > since &&
                happened(moment.label) &&
                moment.counterpartIds.includes(about),
            );
          expect(theirs || mine, row.id).toBe(true);
        }
    }
  });
  it("keeps to one topic, may lead to one related topic, and the other person closes it", () => {
    let closed = 0;
    for (const otherId of others.slice(0, 15)) {
      const talk = openConversation(core, player.id, otherId, { director });
      for (let turn = 0; turn < 8 && talk.choices.length; turn += 1)
        say(core, talk, talk.choices[0]!.key);
      expect(talk.topics.length).toBeLessThanOrEqual(2);
      if (talk.topics.length === 2) {
        const kindOf = (id: string) => id.replace(/^[^>]*>/, "").split(":")[0]!;
        expect(CONVERSATION_DATA.related[kindOf(talk.topics[0]!)]).toContain(
          kindOf(talk.topics[1]!),
        );
      }
      if (!talk.choices.length) {
        expect(talk.lines.at(-1)?.speakerId).toBe(otherId);
        closed += 1;
      }
    }
    expect(closed).toBeGreaterThan(0);
  });
  it("opens a reunion scene's talk on what the two share, ahead of any other event", () => {
    const book = director.ledger.people.get(player.id)!;
    const template = book.moments[0]!;
    let checked = 0;
    for (const otherId of others) {
      // Not one whose last talk with the player was already about it.
      const remembered = core.knowledgeByPerson
        .get(otherId)
        ?.get(`talk:${player.id}:topic`)?.value;
      if (
        !subjectsBetween(core, player.id, otherId, director).some(
          (row) =>
            (row.kind === "shared-school" || row.kind === "shared-work") &&
            row.id !== remembered,
        )
      )
        continue;
      // Edge case by hand: a re-entry moment whose cause no subject is about.
      const occasion = {
        ...template,
        id: `test-reunion:${otherId}`,
        causeId: `test-cause:${otherId}`,
        counterpartIds: [otherId],
      };
      book.momentsById.set(occasion.id, occasion);
      const talk = openConversation(core, player.id, otherId, {
        director,
        occasionId: occasion.id,
      });
      book.momentsById.delete(occasion.id);
      expect(talk.topics[0], otherId).toMatch(/(?:^|>)shared-(?:school|work):/);
      checked += 1;
      if (checked >= 3) break;
    }
    expect(checked).toBeGreaterThan(0);
  });
  it("never asks the player what the asker already knows (a relative, where they live)", () => {
    const kin = [...me.familyIds].filter((id) => core.people.get(id)?.alive);
    for (const otherId of kin) {
      const talk = openConversation(core, player.id, otherId, { director });
      for (const line of talk.lines)
        if (line.speakerId === otherId && line.act === "ask")
          expect(line.subjectId, `${otherId}: ${line.text}`).not.toMatch(
            new RegExp(`^(?:home|school):${player.id}$`),
          );
    }
    expect(kin.length).toBeGreaterThan(0);
  });
  it("remembers the last talk's topic and opens the next one with something else", () => {
    let checked = 0;
    for (const otherId of others.slice(0, 15)) {
      const first = openConversation(core, player.id, otherId, { director });
      if (!first.choices.length || !first.topics[0]) continue;
      say(core, first, first.choices[0]!.key);
      const next = openConversation(core, player.id, otherId, { director });
      if (next.topics[0]) expect(next.topics[0]).not.toBe(first.topics[0]);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
  });
  it("answers a question about the player's relative, and may ask back about theirs", () => {
    // Neighbors who know one of the player's relatives and have a relative
    // the player knows, the two relatives being different people (a
    // neighbor missing either is introduced, as the fixtures above do).
    const alive = (id: string) =>
      core.people.get(id)?.alive && core.people.get(id)!.tier !== "husk";
    const introduce = (aId: string, bId: string) => {
      if (!core.people.get(aId)!.knownIds.has(bId))
        api.meet(aId, bId, {
          placeId: me.placeId,
          sourceId: "fixture-meeting",
          cause: "met-in-group",
          hours: 1,
        });
    };
    const pairs = others.slice(0, 15).flatMap((otherId) => {
      const other = core.people.get(otherId)!;
      const mine = [...me.familyIds].find((id) => id !== otherId && alive(id));
      const theirs = [...other.familyIds].find(
        (id) => id !== me.id && id !== mine && alive(id),
      );
      if (!mine || !theirs) return [];
      introduce(otherId, mine);
      introduce(me.id, theirs);
      return [{ otherId, mine, theirs }];
    });
    expect(
      pairs.length,
      "a neighbor with a relative each side knows",
    ).toBeGreaterThan(0);
    // Something recorded happens to each relative, so both can be asked after.
    for (const relativeId of new Set(pairs.flatMap((p) => [p.mine, p.theirs])))
      applyCoreEvent(core, {
        id: `person.moved-away:${relativeId}:${core.date}`,
        date: core.date,
        kind: "person.moved-away",
        personIds: [relativeId],
        witnessIds: [player.id],
        placeId: core.people.get(relativeId)!.placeId,
        publicRecord: false,
        topic: core.people.get(relativeId)!.placeId,
        source: {
          tag: "ESTIMATED",
          asOf: core.date,
          citation: "Fixture shaped like the moves engine.",
          estimatedFrom: "SG-P15-moves-weights",
        },
        facts: { [`person:${relativeId}:residence`]: "elsewhere" },
      });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    // Asked back only about the neighbor's own relatives, whom the player knows.
    for (const pair of pairs) {
      const other = core.people.get(pair.otherId)!;
      for (const row of subjectsBetween(
        core,
        player.id,
        pair.otherId,
        director,
      ).filter((r) => r.kind === "their-family")) {
        expect(other.familyIds.has(row.aboutId!), row.id).toBe(true);
        expect(me.knownIds.has(row.aboutId!), row.id).toBe(true);
      }
    }
    // A talk the neighbor opens by asking after the player's relative: the
    // player's answer may turn it back, and the neighbor answers in turn.
    let turned = 0;
    for (const pair of pairs) {
      const talk = openConversation(core, player.id, pair.otherId, {
        director,
      });
      if (talk.lines.find((row) => row.kind !== "greet")?.kind !== "family")
        continue;
      const asked = talk.last!.subject.aboutId!;
      const back = talk.choices.find((row) =>
        row.raises?.startsWith("their-family:"),
      );
      if (!back) continue;
      const aboutId = back.raises!.slice("their-family:".length);
      // The neighbor's relative, never the one just asked after.
      expect(aboutId).not.toBe(asked);
      expect(core.people.get(pair.otherId)!.familyIds.has(aboutId)).toBe(true);
      const before = talk.lines.length;
      say(core, talk, back.key);
      const [said, reply] = talk.lines.slice(before);
      expect(said!.speakerId).toBe(player.id);
      expect(reply!.speakerId).toBe(pair.otherId);
      expect(reply!.kind).toBe("family-reply");
      expect(reply!.subjectId).toBe(back.raises);
      // Why: the player's line cites the neighbor's family record for that
      // relative, and the reply cites it too.
      const relativeFact = core.people
        .get(pair.otherId)!
        .pastFacts!.find(
          (fact) =>
            fact.kind.startsWith("family:") &&
            fact.facts?.otherPersonId === aboutId,
        )!.id;
      expect(back.sourceRecordIds).toContain(relativeFact);
      expect(reply!.sourceRecordIds).toContain(relativeFact);
      // The question names the relative the record says, never another.
      const word = reply!.text.match(/\b(he|she)\b/i)?.[1]?.toLowerCase();
      const gender = core.people.get(aboutId)!.looks?.gender;
      if (word) expect(word).toBe(gender === "male" ? "he" : "she");
      turned += 1;
    }
    // A player who carries talk on sees the turned question among their four
    // replies; one who keeps it short sees plain answers first.
    const carriesOn =
      decisionLean(
        core,
        me,
        "conversation.reply-reach",
        "carry-on",
        "keep-short",
      ) >= 0;
    if (carriesOn) expect(turned).toBeGreaterThan(0);
  });
  it("tells a job the worker chose to leave apart from a lost one, by the end's own record", () => {
    // Last: it ends the player's job. A quit (hired elsewhere) is a job left,
    // never "I lost my job."; any other end stays a job lost.
    const jobId = core.people.get(player.id)!.jobId!;
    // An end takes effect on a day the job wasn't worked yet.
    for (let tries = 0; tries < 7; tries += 1) {
      if (core.work.lastAttendanceByJob.get(jobId)?.date !== core.date) break;
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    }
    const day = core.date;
    api.endJob(jobId, `jobs:quit:${day}`);
    advanceCore(core, addDays(makeIsoDate(day), 1));
    const labels = director.ledger.people
      .get(player.id)!
      .moments.filter((row) => row.date >= day)
      .map((row) => row.label);
    expect(labels).toContain("money:job-left");
    expect(labels).not.toContain("money:job-ended");
    // Nothing about a lost job to talk about.
    for (const otherId of others.slice(0, 5))
      expect(
        subjectsBetween(core, player.id, otherId, director).filter((row) =>
          row.kind.startsWith("job-"),
        ),
      ).toEqual([]);
  });
});

describe("the answers to a question fit it", () => {
  it('never answers "Where did you go to school?" with "It\'s okay."', () => {
    const school = MINED_CONVERSATION.subjects.school!;
    const keys = new Set((school.answers ?? []).map((move) => move.key));
    // Where, or that they are done: nothing about how it is going.
    expect([...keys].sort()).toEqual(["at", "done"]);
    for (const move of school.answers ?? [])
      expect(move.text).not.toMatch(/^It'?s (okay|fine|good|hard|going well)/);
    // The reply to the same question, from their own record, is where.
    expect(
      (MINED_CONVERSATION.subjects["school-reply"]?.reply ?? []).every(
        (move) => move.key === "at",
      ),
    ).toBe(true);
  });

  it("never parts with a word the talk already said", () => {
    let talks = 0;
    for (const otherId of others.slice(0, 25)) {
      const talk = openConversation(core, player.id, otherId);
      for (let turn = 0; turn < 8 && talk.choices.length; turn += 1)
        say(core, talk, talk.choices[turn % talk.choices.length]!.key);
      const farewell = talk.lines.find((row) => row.kind === "farewell");
      if (!farewell) continue;
      talks += 1;
      // The farewell is never a line this talk already had from the same speaker.
      const before = talk.lines
        .slice(0, talk.lines.indexOf(farewell))
        .filter((row) => row.speakerId === farewell.speakerId)
        .map((row) => row.text);
      expect(before, `${otherId}: ${farewell.text}`).not.toContain(
        farewell.text,
      );
    }
    expect(talks).toBeGreaterThan(0);
  });
});
