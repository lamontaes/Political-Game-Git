import { withPublicSchoolDistrict } from "../core2/opening-public-schools";
import { defaultPreStart } from "../core2/saves";
import { preStartWindow, runPreStart } from "../core2/pre-start";
import { describe, expect, it } from "vitest";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { financeIndex } from "../core2/finance-state";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { initialFocusPeople } from "../core2/focus";
import { advanceCore, createLifeCore } from "../core2/life";
import { CONVERSATION_WORDS } from "../english/conversation-words";
import { newsKey, newsModule } from "../core2/modules/news";
import { viewsModule } from "../core2/modules/views";
import { buildPopulation } from "../core2/population";
import { decisionLean } from "../core2/trait-decisions";
import { applyCoreEvent, coreAPI } from "../core2/state";
import {
  beliefsModule,
  beliefsOf,
  CONVERSATION_DATA,
  CONVERSATION_RULES,
  composedLine,
  doubtsClaim,
  noteHeard,
  openConversation,
  say,
  subjectsBetween,
  sayNothing,
  type Conversation,
} from "./conversation";
import { createDirector, DEFAULT_DIRECTOR_DATA } from "./ledger";
import { REGISTER_CARDS } from "../english/speech-registers";
import { kinAddress, relationPhrase } from "../english/journal-words";
import type { PersonId } from "../core2/types";
import { expectUpToFourDifferent } from "./reply-set-check";
import { properName } from "./words";

// M4-02, conversations (audit 1, Oct 12; the count is up to four since Nov 10,
// "So just up to 4"): one to four distinct choices every turn, each answering the last line from real records; talking is
// time together and passes news; a lie is believed by everyone present whose
// traits give it the benefit of the doubt, and
// is found out when someone who knows the truth talks to them.
const seed = process.env.GOLDEN_PATH_SEED ?? "conversation-test";
// With the town's public school district, as a played world opens.
const base = withSchools(
  buildPopulation({
    seed,
    ...(process.env.GOLDEN_PATH_SEED
      ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
      : {}),
    startedAt: "2021-01-01",
    minimumPeople: 500,
  }),
);
function withSchools(input: Parameters<typeof enrichCivicInputs>[0]) {
  return withPublicSchoolDistrict(enrichCivicInputs(input)).input;
}
const age = (birth: string) =>
  ageOnDate(makeIsoDate(birth), makeIsoDate(base.startedAt));
const orgOf = (jobId: string | undefined) =>
  base.jobs.find((row) => row.id === jobId)?.organizationId;
const byId = new Map(base.people.map((row) => [row.id, row]));
const fullAlive = (id: string) => {
  const row = byId.get(id);
  return !!row && row.alive !== false && row.tier !== "husk";
};
/** A relative the person's own family record names by a relation that has a word. */
const recordedRelative = (personId: string, id: string) => {
  const fact = byId
    .get(personId)
    ?.pastFacts?.find(
      (row) =>
        row.kind.startsWith("family:") && row.facts?.otherPersonId === id,
    );
  return (
    !!fact &&
    !!relationPhrase(
      fact.kind.slice("family:".length),
      byId.get(id)?.looks?.gender ?? "other",
      "scene",
    )
  );
};
/**
 * Whether someone the person knows has a recorded relative the person does
 * not share and the person has one the other does not, so the tests that ask
 * after relatives have a pair to start from. Read from the opening records,
 * never from a conversation's output.
 */
/** Everyone the person may know at the opening: who they know, and their employer's staff. */
const peersOf = (person: (typeof base.people)[number]) => [
  ...new Set([
    ...person.knownIds,
    ...base.jobs
      .filter(
        (job) =>
          job.personId !== person.id &&
          person.jobId !== undefined &&
          job.organizationId === orgOf(person.jobId),
      )
      .map((job) => job.personId),
  ]),
];
const hasRelativePair = (person: (typeof base.people)[number]) =>
  peersOf(person).some((otherId) => {
    const other = byId.get(otherId);
    if (!other || !fullAlive(otherId)) return false;
    const mine = person.familyIds.find(
      (id) =>
        id !== otherId &&
        fullAlive(id) &&
        !other.familyIds.includes(id) &&
        recordedRelative(person.id, id),
    );
    return (
      !!mine &&
      other.familyIds.some(
        (id) =>
          id !== person.id &&
          id !== mine &&
          fullAlive(id) &&
          !person.familyIds.includes(id) &&
          recordedRelative(otherId, id),
      )
    );
  });
const fitPlayers = base.people.filter(
  (person) =>
    person.tier !== "husk" &&
    hasRelativePair(person) &&
    age(person.birthDate) >= 25 &&
    age(person.birthDate) < 60 &&
    person.jobId &&
    peersOf(person).length > 4 &&
    base.households.find((row) => row.id === person.householdId)!.memberIds
      .length > 1 &&
    base.jobs.some(
      (job) =>
        job.personId !== person.id &&
        job.organizationId === orgOf(person.jobId),
    ),
);
/** The world as a played one starts for this player: pre-start years, director, first days. */
function startWorld(playerId: PersonId) {
  const worldInput = { ...base, playerId };
  const started = createDirector({
    watch: [...initialFocusPeople(worldInput)],
  });
  const world = createLifeCore(worldInput, {
    modules: [viewsModule, newsModule, beliefsModule, started.module],
  });
  // The years before the start, run from the player's birth year as a new game
  // runs them (the school years people talk about are the school engine's).
  const history = defaultPreStart(world);
  if (history)
    runPreStart(world, preStartWindow(world, history.from, history.step));
  started.start(world);
  advanceCore(world, "2021-01-03");
  return { core: world, director: started };
}
// The opening records list only a few of the people each person knows; the
// rest are added as the world starts. So the player is chosen from the people
// each fitting person knows once a world has started (the core's knownIds, a
// record, not a talk's output): the one who knows the most full people, the
// first of them in the population's order. A world starts once to read those
// records and again for the chosen player.
const probeWorld = startWorld(fitPlayers[0]!.id);
const probe = probeWorld.core;
const knownFull = (id: PersonId) =>
  [...(probe.people.get(id)?.knownIds ?? [])].filter((otherId) => {
    const row = probe.people.get(otherId);
    return row?.alive && row.tier !== "husk";
  }).length;
const player = fitPlayers.reduce((best, person) =>
  knownFull(person.id) > knownFull(best.id) ? person : best,
)!;
const played =
  player.id === fitPlayers[0]!.id ? probeWorld : startWorld(player.id);
const { core, director } = played;
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
// Counted people (the "husk" tier) have no full record to talk from.
const others = [...me.knownIds].filter((id) => {
  const row = core.people.get(id);
  return row?.alive && row.tier !== "husk";
});
const believing = strangers
  .slice(1)
  .filter((row) => !doubtsClaim(core, row))
  .slice(0, 2);
// A doubter is looked for among every full adult the player does not know,
// not only the unrelated workers: a town may hold none among those 38.
const doubter = [...core.people.values()].find(
  (row) =>
    row.alive &&
    row.tier !== "husk" &&
    row.id !== me.id &&
    !me.knownIds.has(row.id) &&
    age(row.birthDate) >= 18 &&
    doubtsClaim(core, row),
);
for (const row of [strangers[0]!, ...believing])
  api.meet(me.id, row.id, {
    placeId: me.placeId,
    sourceId: "fixture-meeting",
    cause: "met-in-group",
    hours: 1,
  });

// A first meeting asks where you work and live once, so the people the first
// test talks to have little left to ask afterward. The two tests that need a
// talk with something left to ask also meet a few more strangers, and talk to
// the people they know first, then these.
const reserve = strangers
  .filter((row) => row !== strangers[0] && !believing.includes(row))
  .filter((row) => row.id !== doubter?.id)
  .slice(0, 8);
for (const row of reserve)
  api.meet(me.id, row.id, {
    placeId: me.placeId,
    sourceId: "fixture-meeting",
    cause: "met-in-group",
    hours: 1,
  });
const talkers = [...others, ...reserve.map((row) => row.id)];
/** The fewest small-talk turns the short-turn check reads before it means anything. */
const SMALL_TALK_TURNS = 40;
/** The other person's first question, after any greeting. */
const recentDays =
  DEFAULT_DIRECTOR_DATA.parameters.directorTalkRecentDays!.value;
const opening = (talk: Conversation) =>
  talk.lines.find((row) => row.kind !== "greet")!;

// Owner, Nov 11, 2026: "all the lines in the game need to be run through the
// English engine ... a ton of different inserts". Meeting someone new, the
// talk turns to work: both employers are named, the job from its record, and
// nothing is asked that no record answers (words-home-work-lines-are-composed).
describe(`work talk names the employer and the job (${base.placeMetadata?.placeName}, seed ${seed})`, () => {
  it("names both employers and a job, asks how long only when the years are on record, and offers up to four different replies", () => {
    // Work for the outside buyers that stand in for work out of town has no
    // employer to name.
    const fresh = strangers
      .filter((row) => !me.knownIds.has(row.id))
      .filter(
        (row) =>
          !core.organizations.get(core.jobs.get(row.jobId!)!.organizationId)
            ?.outsideFlow,
      )
      .slice(0, 8);
    expect(fresh.length).toBeGreaterThan(0);
    const myJob = core.people.get(player.id)!.jobId;
    const mine = myJob
      ? properName(
          core.organizations.get(core.jobs.get(myJob)!.organizationId)!.name,
        ).toLowerCase()
      : "";
    let both = 0;
    let named = 0;
    const passed: string[] = [];
    for (const row of fresh) {
      api.meet(me.id, row.id, {
        placeId: me.placeId,
        sourceId: "fixture-meeting",
        cause: "met-in-group",
        hours: 1,
      });
      const talk = openConversation(core, player.id, row.id);
      const job = core.jobs.get(row.jobId!)!;
      // A government's payroll is said as the government.
      const theirs = properName(
        core.organizations.get(job.organizationId)!.name,
      )
        .replace(/\s+treasury$/i, "")
        .toLowerCase();
      for (let turn = 0; turn < 5 && talk.choices.length; turn += 1) {
        expectUpToFourDifferent(talk.choices, `${row.givenName}, turn ${turn}`);
        const pick =
          talk.choices.find((c) => c.move === "tenure") ??
          talk.choices.find((c) => c.move === "turn") ??
          talk.choices.find((c) => c.move === "detail") ??
          talk.choices[0]!;
        say(core, talk, pick.key);
        // How long is asked only where the years are on record, and answered with them.
        if (pick.move === "tenure")
          expect(talk.lines.at(-1)!.text).toMatch(/\d/);
      }
      const said = talk.lines
        .map((line) => line.text)
        .join(" ")
        .toLowerCase();
      expect(said).not.toMatch(/\bbusy\b|like it there/);
      if (said.includes(mine) && said.includes(theirs)) both += 1;
      else passed.push(`${row.givenName} (${theirs})`);
      if (job.title && said.includes(job.title.toLowerCase())) named += 1;
    }
    process.stdout.write(
      `work talk: ${both} of ${fresh.length} named both employers, ${named} named a job; passed over ${passed.join(", ") || "none"}\n`,
    );
    expect(both).toBeGreaterThan(0);
    expect(named).toBeGreaterThan(0);
  });

  it("keeps no work line that asks or says how busy a place is, or whether someone likes it there", () => {
    const work = new Set([
      "own-work",
      "other-work",
      "heard-work",
      "shared-work",
    ]);
    const bad = Object.entries(CONVERSATION_WORDS.subjects)
      .filter(([subject]) => work.has(subject))
      .flatMap(([, roles]) => Object.values(roles).flat())
      .filter((move) =>
        /\bbusy\b|like it there|how do you like it/i.test(move.text),
      )
      .map((move) => move.text);
    expect(bad).toEqual([]);
  });
});

describe(`conversations in ${base.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("offers up to four distinct replies every turn (one to four, the scene sets it), each answering the last line and only following on from it", () => {
    const four = DEFAULT_DIRECTOR_DATA.parameters.directorChoicesPerTurn!.value;
    let turns = 0;
    // Fifteen people, then on through the people met for these tests until
    // more than 8 turns are read: at home nobody with nothing on record
    // today offers a talk (owner, Oct 24), so a draw can hold few talks
    // (Baywood, New York, seed 6e36e4e6527696143009: 8 turns in 15 people).
    // The strangers kept for the later tests are left alone.
    const drawn = [
      ...others,
      ...[...core.people.values()]
        .filter(
          (row) =>
            row.alive &&
            row.tier !== "husk" &&
            row.id !== player.id &&
            row.householdId !== me.householdId &&
            !talkers.includes(row.id as PersonId),
        )
        .map((row) => row.id as PersonId),
    ];
    let read = 0;
    for (const otherId of drawn) {
      if (read >= Math.min(15, others.length) && turns > 8) break;
      read += 1;
      const talk = openConversation(core, player.id, otherId);
      // With nothing on record to say, nothing is said: never a hello and a
      // goodbye with nothing between (owner, Oct 24).
      if (!talk.lines.length) {
        expect(talk.choices).toEqual([]);
        continue;
      }
      // A greeting at most, then one question.
      expect(talk.lines.filter((row) => row.kind !== "greet").length).toBe(1);
      for (let turn = 0; turn < 4 && talk.choices.length; turn += 1) {
        const last = talk.lines.at(-1)!;
        expect(last.speakerId).toBe(otherId);
        expect(last.kind).not.toBe("ack");
        // Up to four replies, each a different move: never one answer
        // reworded (owner, Oct 27, 4 PM Eastern: "four replies are four
        // different answers"), so a stage with fewer moves offers fewer.
        const texts = talk.choices.map((row) => row.text);
        const moves = talk.choices.map((row) =>
          row.move.startsWith("ack:") ? "ack" : row.move,
        );
        expect(new Set(moves).size, texts.join(" / ")).toBe(moves.length);
        // An acknowledgment ("Okay.", "All right.") takes in a statement; it
        // is never a reply to a question, which every reply moves on
        //. Where a question has fewer than four real
        // wordings in its stage ("Where did you go to school?"), it gets
        // fewer, never a filler.
        const questioned = last.act === "ask" || /\?$/.test(last.text);
        if (questioned) {
          for (const choice of talk.choices)
            expect(choice.move, choice.text).not.toMatch(/^ack:/);
          expect(texts.length).toBeGreaterThanOrEqual(1);
        } else expect(texts.length).toBeGreaterThanOrEqual(1);
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
    //, so fewer turns run than before.
    expect(turns, `${read} people talked to`).toBeGreaterThan(8);
  });

  it("lets the player say nothing, and the other person carries on or the talk ends", () => {
    // Someone the talk is still open with (a talk can end at its opening
    // when the topic is done, or was their last talk's).
    // At home nobody with nothing on record today offers a talk (owner,
    // Oct 24), so the people met in town are looked at too.
    const otherId = talkers.find(
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
    const otherId = talkers.find(
      (id) =>
        !me.familyIds.has(id) &&
        openConversation(core, player.id, id).choices.length,
    )!;
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
    // A coworker already knows where the player works: they ask nothing
    // about it, and where they do talk, the scales are dim.
    const known = openConversation(core, player.id, coworker);
    if (opening(known)?.kind === "own-work") expect(known.lies).toEqual([]);
  });

  it("turns every choice false with the scales: different moves, each contradicting the player's record", () => {
    const talk = openConversation(core, player.id, strangers[0]!.id);
    expect(talk.lies.length).toBeGreaterThan(1);
    const moves = talk.lies.map((row) => row.move);
    expect(new Set(moves).size).toBe(moves.length);
    const texts = talk.lies.map((row) => row.text);
    expect(new Set(texts).size).toBe(texts.length);
    // A lie about work is a denial or a believable false alternative; a lie
    // about where the player is from always names another place.
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
    // Lead's ruling (Nov 12): the card at src/english/speech-registers.ts:282
    // is the Santa Barbara Corpus's count for small talk. A turn that tells or
    // answers from a record (work, home, news, a case) is not small talk, and
    // the owner's bar forbids padding it with bare short replies (non-replies
    // are faults, not turns). So the check measures only turns in the
    // small-talk register: hellos, goodbyes, and turns of the small-talk
    // subject. The bound stays 0.2 against the card's 0.45 and the card is
    // not changed.
    const card = REGISTER_CARDS["small-talk"];
    const median = card.checks.find((row) => row.key === "median-words")!.value;
    const short = card.checks.find((row) => row.key === "short-turns")!.value;
    const smallTalk = (line: Conversation["lines"][number]) =>
      line.kind === "greet" ||
      line.kind === "farewell" ||
      line.subjectId.startsWith("quiet:");
    const lengths: number[] = [];
    const passedOver: string[] = [];
    // The people the first test talked to have little left to ask; the
    // strangers met for the later tests still have their questions. Talks
    // are drawn until enough small-talk turns are measured to mean anything.
    // After the people met for these tests, anyone else in town, in the
    // order the population keeps them.
    const drawn = [
      ...talkers,
      ...[...core.people.values()]
        .filter(
          (row) =>
            row.alive &&
            row.tier !== "husk" &&
            row.id !== player.id &&
            row.householdId !== me.householdId &&
            !talkers.includes(row.id as PersonId),
        )
        .map((row) => row.id as PersonId),
    ];
    let talked = 0;
    for (const otherId of drawn) {
      if (lengths.length >= SMALL_TALK_TURNS) break;
      talked += 1;
      // Opened as the bench opens it: what the player hears is kept at once
      // (handler.ts calls noteHeard on open), so a talk that ends at its
      // opening still counts its hello as heard.
      const talk = openConversation(core, player.id, otherId);
      noteHeard(core, talk);
      for (let turn = 0; turn < 4 && talk.choices.length; turn += 1)
        say(core, talk, talk.choices[(turn * 3) % talk.choices.length]!.key);
      const measured = talk.lines.filter(smallTalk);
      if (!measured.length) passedOver.push(otherId);
      for (const line of measured) lengths.push(line.text.split(/\s+/).length);
    }
    lengths.sort((a, b) => a - b);
    const shortShare = lengths.filter((n) => n <= 3).length / lengths.length;
    process.stdout.write(
      `SMALL-TALK ${base.placeMetadata?.placeName} (seed ${seed}): median ${lengths[Math.floor(lengths.length / 2)]} (card ${median}), short ${shortShare.toFixed(3)} (card ${short}), ${lengths.length} small-talk turns in ${talked} talks; passed over ${passedOver.length} with none\n`,
    );
    expect(
      lengths.length,
      `${base.placeMetadata?.placeName} (seed ${seed}): ${lengths.length} small-talk turns in ${talked} talks; passed over ${passedOver.join(", ")}`,
    ).toBeGreaterThanOrEqual(SMALL_TALK_TURNS);
    expect(
      Math.abs(lengths[Math.floor(lengths.length / 2)]! - median),
    ).toBeLessThanOrEqual(3);
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
    let silent = 0;
    for (const otherId of others.slice(0, 15)) {
      const talk = openConversation(core, player.id, otherId, { director });
      // Someone with nothing on record to say says nothing: never "Hey." and
      // "I'll see you." with nothing between (owner, Oct 24).
      if (!talk.lines.length) {
        silent += 1;
        continue;
      }
      for (let turn = 0; turn < 8 && talk.choices.length; turn += 1)
        say(core, talk, talk.choices[0]!.key);
      expect(talk.topics.length).toBeLessThanOrEqual(2);
      if (talk.topics.length === 2) {
        const kindOf = (id: string) => id.replace(/^[^>]*>/, "").split(":")[0]!;
        expect(CONVERSATION_DATA.related[kindOf(talk.topics[0]!)]).toContain(
          kindOf(talk.topics[1]!),
        );
      }
      // A talk that said something closes on the other person's line.
      if (!talk.choices.length) {
        expect(talk.lines.at(-1)?.speakerId).toBe(otherId);
        expect(
          talk.lines.some(
            (line) => line.kind !== "greet" && line.kind !== "farewell",
          ),
        ).toBe(true);
        closed += 1;
      }
    }
    expect(closed + silent).toBeGreaterThan(0);
  });
  it("opens a reunion scene's talk on a school or workplace the two once shared only when decades have passed and the record shows it (owner, Oct 15, evening)", () => {
    const book = director.ledger.people.get(player.id)!;
    const template = book.moments[0]!;
    let checked = 0;
    for (const otherId of others) {
      const shared = subjectsBetween(core, player.id, otherId, director).filter(
        (row) => row.kind === "shared-school" || row.kind === "shared-work",
      );
      if (!shared.length) continue;
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
      // "Do you remember <school>?" opens nothing unless a record says
      // something happened to it or decades have passed.
      for (const line of talk.lines) {
        const about = shared.find((row) => line.subjectId.includes(row.id));
        if (about)
          expect(
            about.facts["long-ago"],
            `${otherId}: ${line.text}`,
          ).toBeTruthy();
        else expect(line.text, otherId).not.toMatch(/\bremember\b/i);
      }
      checked += 1;
      if (checked >= 3) break;
    }
    // Edge case by hand: shared work that ended decades ago. The opening
    // keeps few ended jobs, so a job record the player held long ago at
    // another person's employer is put on that employer's books for this check.
    const known = [...core.people.values()]
      .filter((row) => row.alive && row.tier !== "husk" && row.id !== me.id)
      .map((row) => row.id)
      .sort()
      .find((id) => {
        const job = core.people.get(id)?.jobId;
        const org = job ? core.jobs.get(job)?.organizationId : undefined;
        return org && org !== myOrg();
      })!;
    expect(known, "nobody works elsewhere").toBeDefined();
    const theirOrg = core.jobs.get(
      core.people.get(known)!.jobId!,
    )!.organizationId;
    const formerId = `test-former-job:${player.id}`;
    core.jobs.set(formerId, {
      ...core.jobs.get(me.jobId!)!,
      id: formerId,
      organizationId: theirOrg,
      endsAt: makeIsoDate("1995-06-30"),
    });
    financeIndex(core.finance.jobsByOrganization, theirOrg, formerId);
    const work = subjectsBetween(core, player.id, known, director).find(
      (row) => row.kind === "shared-work",
    );
    core.jobs.delete(formerId);
    core.finance.jobsByOrganization.get(theirOrg)!.delete(formerId);
    expect(work?.aboutId).toBe(theirOrg);
    expect(work?.facts["long-ago"]).toBeTruthy();
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
  it("asks one relative after another they share only as both call them, never by a parent's first name or as 'your father' (play-stop-20)", () => {
    const asked = ["kin", "family", "their-family"];
    // Two relatives and the living relatives they have in common, from the
    // opening's family records: the player's own first, then the town's by
    // id, so a drawn world whose player has none still has some to check.
    const actors = [
      me,
      ...[...core.people.values()]
        .filter((row) => row.id !== me.id)
        .sort((a, b) => a.id.localeCompare(b.id)),
    ];
    const seen = new Set<string>();
    const pairs = actors
      .filter((row) => row.alive)
      .flatMap((actor) =>
        [...actor.familyIds].sort().flatMap((id) => {
          const relative = core.people.get(id);
          const key = [actor.id, id].sort().join("|");
          if (!relative?.alive || seen.has(key)) return [];
          seen.add(key);
          const both = [...relative.familyIds].filter(
            (other) =>
              other !== actor.id &&
              actor.familyIds.has(other) &&
              core.people.get(other)?.alive,
          );
          return both.length ? [{ from: actor.id, to: id, both }] : [];
        }),
      );
    expect(pairs.length, "relatives who share a relative").toBeGreaterThan(0);
    const shared: string[] = [];
    for (const { from: a, to: b, both } of pairs) {
      // Something recorded happened to each relative they share (a lost
      // job), so either of the two could talk of them.
      const ledger = {
        people: new Map(
          both.map((other) => [
            other,
            {
              moments: [
                {
                  date: core.date,
                  label: "money:job-lost",
                  causeId: other,
                  counterpartIds: [],
                },
              ],
            },
          ]),
        ),
      };
      const recent = { ledger } as unknown as Parameters<
        typeof subjectsBetween
      >[3];
      for (const [from, to] of [
        [a, b],
        [b, a],
      ] as const)
        for (const row of subjectsBetween(core, from, to, recent)) {
          if (!asked.includes(row.kind) || !both.includes(row.aboutId!))
            continue;
          // Only the speaker's relative asked after by the listener: never
          // introduced, never asked back about as the listener's own.
          expect(row.kind, `${from} to ${to}: ${row.id}`).toBe("family");
          const relative = core.people.get(row.aboutId as PersonId)!;
          const listener = core.people.get(to)!;
          // The one who asks does not live with them.
          expect(relative.householdId, `${from} to ${to}: ${row.id}`).not.toBe(
            listener.householdId,
          );
          // As both call them: the kin address of a parent or grandparent
          // to both ("Dad"), or a shared sibling's first name; never a
          // relation phrase ("your father") or a parent's first name.
          const relationOf = (person: PersonId) =>
            core.people
              .get(person)!
              .pastFacts?.find(
                (f) =>
                  f.kind.startsWith("family:") &&
                  f.facts?.otherPersonId === row.aboutId,
              )
              ?.kind.slice("family:".length);
          const relation = relationOf(from);
          expect(relation, `${from} to ${to}: ${row.id}`).toBe(relationOf(to));
          const said = row.facts.relation!.text;
          if (relation === "sibling")
            expect(said, `${from} to ${to}: ${row.id}`).toBe(
              relative.givenName,
            );
          else {
            expect(said, `${from} to ${to}: ${row.id}`).toBe(
              kinAddress(relation!, relative.looks?.gender ?? "other"),
            );
            expect(said, `${from} to ${to}: ${row.id}`).not.toBe(
              relative.givenName,
            );
          }
          expect(said, `${from} to ${to}: ${row.id}`).not.toMatch(
            /^(my|your) /,
          );
          shared.push(`${to} asks ${from}: ${said} (${row.aboutId})`);
        }
    }
    // Somebody asks after a relative they share, as they call them.
    expect(shared.length, "a shared relative asked after").toBeGreaterThan(0);
    console.log(`shared kin asked after: ${shared.slice(0, 5).join("; ")}`);
  });
  it("remembers the last talk's topic and opens the next one with something else", () => {
    // Any topic a talk keeps to is remembered by the listener: the next talk
    // with the same person opens on another (a shared school is not an opener).
    let checked = 0;
    for (const otherId of talkers) {
      const first = openConversation(core, player.id, otherId, { director });
      if (!first.choices.length || !first.topics[0]) continue;
      say(core, first, first.choices[0]!.key);
      const next = openConversation(core, player.id, otherId, { director });
      if (next.topics[0]) expect(next.topics[0]).not.toBe(first.topics[0]);
      checked += 1;
      if (checked >= 5) break;
    }
    expect(checked).toBeGreaterThan(0);
  });
  it("never opens on a school or an old job without a reason, and a question answered is followed up, not answered with goodbye", () => {
    // 15 talks in a drawn place. Owner, Oct 15, evening (batch 12 rejected).
    const reason = /remember|go to school|work at|work for/i;
    let talks = 0;
    let checkedPairs = 0;
    for (const otherId of talkers) {
      const talk = openConversation(core, player.id, otherId, { director });
      talks += 1;
      // Rule 1: a shared school or workplace is raised only with a reason.
      const subjects = subjectsBetween(core, player.id, otherId, director);
      for (const row of subjects)
        if (row.kind === "shared-school" || row.kind === "shared-work") {
          const long = !!row.facts["long-ago"];
          const said = talk.lines.some((line) =>
            line.subjectId.includes(row.id),
          );
          if (said) expect(long).toBe(true);
        }
      for (let turn = 0; turn < 5 && talk.choices.length; turn += 1) {
        // A yes or no (or any reply) to the other person's question.
        const choice =
          talk.choices.find((row) => /^(yes|no|yeah|nope)\b/i.test(row.text)) ??
          talk.choices[0]!;
        say(core, talk, choice.key);
        void reason;
      }
      // Rule 2 and 3: a farewell is never the next thing said after the
      // other person's own question was answered (an ack may sit between).
      // Every question of theirs the player answered is a pair checked,
      // whether or not the talk went on to a goodbye (fixer round 7 of
      // #8879: in Jackson Center every talk opened on a question of theirs
      // and none reached a goodbye, so counting only goodbyes checked none).
      talk.lines.forEach((asked, at) => {
        const answer = talk.lines[at + 1];
        if (
          asked.speakerId !== talk.otherId ||
          !/\?$/.test(asked.text.trim()) ||
          answer?.speakerId !== player.id
        )
          return;
        checkedPairs += 1;
        let next = at + 2;
        while (next < talk.lines.length && talk.lines[next]!.kind === "ack")
          next += 1;
        expect(talk.lines[next]?.kind, asked.text).not.toBe("farewell");
      });
    }
    expect(talks).toBe(talkers.length);
    expect(checkedPairs).toBeGreaterThan(0);
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
    // Relatives only one side has: a brother is not asked "How's your
    // father?" about their own (play-stop-20). Each is one their own family
    // record names by a relation with a word, which a question after them
    // cites and says.
    const recorded = (personId: string, id: string) => {
      const fact = core.people
        .get(personId)!
        .pastFacts?.find(
          (row) =>
            row.kind.startsWith("family:") && row.facts?.otherPersonId === id,
        );
      return (
        !!fact &&
        !!relationPhrase(
          fact.kind.slice("family:".length),
          core.people.get(id)!.looks?.gender ?? "other",
          "scene",
        )
      );
    };
    const pairs = others.slice(0, 15).flatMap((otherId) => {
      const other = core.people.get(otherId)!;
      const mine = [...me.familyIds].find(
        (id) =>
          id !== otherId &&
          alive(id) &&
          !other.familyIds.has(id) &&
          recorded(me.id, id),
      );
      const theirs = [...other.familyIds].find(
        (id) =>
          id !== me.id &&
          id !== mine &&
          alive(id) &&
          !me.familyIds.has(id) &&
          recorded(otherId, id),
      );
      if (!mine || !theirs) return [];
      introduce(otherId, mine);
      introduce(me.id, theirs);
      // The player clicks into the neighbor's relative, so the director
      // watches them and keeps what happens to them; a relative nobody
      // watches is director-neighbor-relative-happening-unseen.
      director.watch(core, theirs);
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
    // A question turns back only to a relative of the neighbor's whom
    // something recorded happened to, as the player knows it, and never to
    // one the two share (play-stop-20); every pair above has such a relative.
    for (const pair of pairs)
      expect(
        subjectsBetween(core, player.id, pair.otherId, director).map(
          (row) => row.id,
        ),
        pair.otherId,
      ).toContain(`their-family:${pair.theirs}`);
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
    const book = director.ledger.people.get(player.id)!;
    const labels = book.moments
      .filter((row) => row.date >= day)
      .map((row) => row.label);
    // A job left that is small against the person's own traits sits under the
    // moment floor: the director counts it there under the same label and
    // stores no moment, so the record shows it one way or the other.
    const belowFloor = [...book.belowFloor.keys()];
    expect([...labels, ...belowFloor].some((l) => l.includes("job-left"))).toBe(
      true,
    );
    expect(
      [...labels, ...belowFloor].some((l) => l.includes("job-ended")),
    ).toBe(false);
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
    const school = CONVERSATION_WORDS.subjects.school!;
    const keys = new Set((school.answers ?? []).map((move) => move.key));
    // Where, or that they are done: nothing about how it is going.
    expect([...keys].sort()).toEqual(["at", "done"]);
    for (const move of school.answers ?? [])
      expect(move.text).not.toMatch(/^It'?s (okay|fine|good|hard|going well)/);
    // The reply to the same question, from their own record, is where.
    expect(
      (CONVERSATION_WORDS.subjects["school-reply"]?.reply ?? []).every(
        (move) => move.key === "at",
      ),
    ).toBe(true);
  });

  it("never parts with a word the talk already said", () => {
    let talks = 0;
    // The people the player knows, then every other full person: in a world
    // where each talk with someone known ends on their answered question
    // (no goodbye then, by rule), the goodbyes are said to the rest.
    const known = new Set(talkers);
    const everyone = [
      ...talkers,
      ...[...core.people.values()]
        .filter(
          (row) =>
            row.alive &&
            row.tier !== "husk" &&
            row.id !== player.id &&
            !known.has(row.id),
        )
        .map((row) => row.id),
    ];
    for (const otherId of everyone.slice(0, 60)) {
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

// words-home-greet-farewell-lines-are-composed (owner, Nov 11, 2026: "all the
// lines in the game need to be run through the English engine ... a ton of
// different speech versions"): a greeting names the listener or when the two
// last met, a goodbye names what the talk was about, and the hour at home.
describe("hellos and goodbyes are composed from the records", () => {
  const SPOKEN_GAPS = [
    "yesterday",
    "a few days ago",
    "last week",
    "a few weeks ago",
    "a couple of months ago",
    "last year",
    "years ago",
  ];
  /** Plays a talk to its end, taking the replies in turn. */
  const play = (otherId: PersonId) => {
    const talk = openConversation(core, player.id, otherId, { director });
    for (let turn = 0; turn < 8 && talk.choices.length; turn += 1)
      say(core, talk, talk.choices[turn % talk.choices.length]!.key);
    return talk;
  };
  const away = (id: PersonId) =>
    core.people.get(id)?.householdId !== me.householdId;
  const everyone = () =>
    [...core.people.values()]
      .filter(
        (row) =>
          row.alive &&
          row.tier !== "husk" &&
          row.id !== player.id &&
          away(row.id as PersonId),
      )
      .map((row) => row.id as PersonId);

  it("names when the two last met on a second talk, the employer of a talk about work, and says over 30 different greetings and goodbyes in 100 talks", () => {
    const greetings = new Set<string>();
    const goodbyes = new Set<string>();
    // A talk that ends on the other person's answered question says no
    // goodbye (by rule), so more people are talked to than goodbyes counted.
    const people = everyone().slice(0, 200);
    let aboutWork = 0;
    let said = 0;
    const employers: { text: string; sourceRecordIds: readonly string[] }[] =
      [];
    let second = 0;
    for (const round of [0, 1]) {
      // The second talk is the next day: the greeting names the first, and
      // nobody is unsure about yesterday (Fable B's review of #8758).
      if (round) advanceCore(core, addDays(makeIsoDate(core.date), 1));
      for (const otherId of people) {
        const talk = play(otherId);
        // The hello is its own turn; the line after it names the last meeting.
        const greets = talk.lines.filter((line) => line.kind === "greet");
        const greet = greets.at(-1);
        const bye = talk.lines.find((line) => line.kind === "farewell");
        if (greet) greetings.add(greets.map((line) => line.text).join(" "));
        if (greet && round) {
          second += 1;
          expect(greet.wording?.facts, `${otherId}: ${greet.text}`).toContain(
            "when",
          );
          expect(
            SPOKEN_GAPS.some((gap) => greet.text.includes(gap)),
            greet.text,
          ).toBe(true);
          expect(greet.text).not.toMatch(
            /I think|if I remember right|I don't think|a while|ages/,
          );
        }
        const employerFact = talk.topicFacts?.employer;
        if (employerFact) employers.push(employerFact);
        if (!bye) continue;
        said += 1;
        // Variety is read over the first 100 goodbyes, as the title says: the
        // goodbye's wordings are a fixed set, so over 300 talks (a big town's
        // 200 people twice) repeats grow with the count, not with sameness
        // (Bradford, Rhode Island, seed 09ba9bd3...: 312 goodbyes, no
        // wording said more than four times, 147 different).
        if (said <= 100) goodbyes.add(bye.text);
        const employer = talk.topicFacts?.employer?.text;
        if (employer) {
          aboutWork += 1;
          // One screen names a thing once: a goodbye names the employer
          // only when no line before it in the talk did; else the player.
          const before = talk.lines.filter((line) => line !== bye);
          if (before.some((line) => line.text.includes(employer)))
            expect(bye.text, `${otherId}: ${bye.text}`).not.toContain(employer);
          else expect(bye.text, `${otherId}: ${bye.text}`).toContain(employer);
        }
      }
    }
    process.stdout.write(
      `greetings ${greetings.size}, goodbyes ${goodbyes.size} of ${said}, about work ${aboutWork}, second greetings ${second}\n`,
    );
    expect(second).toBeGreaterThan(0);
    expect(aboutWork).toBeGreaterThan(0);
    expect(greetings.size).toBeGreaterThanOrEqual(30);
    // Most goodbyes said differ, and 100 goodbyes composed from the topics
    // these talks recorded say at least 30 different things.
    expect(said).toBeGreaterThan(0);
    expect(goodbyes.size * 2).toBeGreaterThan(Math.min(said, 100));
    const composed = new Set<string>();
    for (let n = 0; n < 100 && employers.length; n += 1) {
      const line = composedLine(
        core,
        people[n % people.length]!,
        "farewell",
        {
          "about-said": employers[n % employers.length]!,
          "about-employer": { text: "yes", sourceRecordIds: [player.id] },
          [n % 2 ? "about-employer-yours" : "about-employer-mine"]: {
            text: "yes",
            sourceRecordIds: [player.id],
          },
        },
        "default",
        `goodbye-variety:${n}`,
      );
      if (line) composed.add(line.text);
    }
    expect(composed.size).toBeGreaterThanOrEqual(30);
  });

  it("at home, a talk given the evening's minute (the opening night) never says goodbye for the morning", () => {
    const housemates = [
      ...(core.households.get(me.householdId)?.memberIds ?? []),
    ]
      .filter((id) => id !== me.id && core.people.get(id)?.alive)
      .map((id) => id as PersonId);
    let byes = 0;
    for (const otherId of housemates)
      for (const minute of [20 * 60 + 30, 21 * 60]) {
        const talk = openConversation(core, player.id, otherId, {
          director,
          minuteOfDay: minute,
        });
        for (let turn = 0; turn < 8 && talk.choices.length; turn += 1)
          say(core, talk, talk.choices[turn % talk.choices.length]!.key);
        const bye = talk.lines.find((line) => line.kind === "farewell");
        if (!bye) continue;
        byes += 1;
        expect(bye.text, bye.text).not.toMatch(/morning|afternoon/);
      }
    process.stdout.write(`evening goodbyes at home: ${byes}\n`);
  });

  it("at home, a talk ends on its last line that says something: no goodbye, no check-in, at any hour", () => {
    // Owner, Nov 12: "I'll be around tonight if you need me." and its kind
    // are "the same bullshit ... with the just non-replies"; the home
    // goodbyes were removed by kind (words composer, unit 2).
    const housemates = [
      ...(core.households.get(me.householdId)?.memberIds ?? []),
    ]
      .filter((id) => id !== me.id && core.people.get(id)?.alive)
      .map((id) => id as PersonId);
    for (const otherId of housemates)
      for (const minute of [7 * 60, 13 * 60, 20 * 60 + 30]) {
        const talk = openConversation(core, player.id, otherId, {
          director,
          minuteOfDay: minute,
        });
        for (let turn = 0; turn < 8 && talk.choices.length; turn += 1)
          say(core, talk, talk.choices[turn % talk.choices.length]!.key);
        expect(
          talk.lines.filter((line) => line.kind === "farewell"),
          `${otherId} at minute ${minute}`,
        ).toEqual([]);
      }
  });
});
