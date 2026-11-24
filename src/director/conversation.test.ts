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
import { newsModule } from "../core2/modules/news";
import { viewsModule } from "../core2/modules/views";
import { buildPopulation } from "../core2/population";
import { coreAPI } from "../core2/state";
import {
  beliefsModule,
  CONVERSATION_DATA,
  CONVERSATION_RULES,
  doubtsClaim,
  openConversation,
  say,
  subjectsBetween,
  type Conversation,
} from "./conversation";
import { createDirector, DEFAULT_DIRECTOR_DATA } from "./ledger";
import { kinAddress, relationPhrase } from "../english/journal-words";
import type { PersonId } from "../core2/types";

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
const unrelated = [...core.people.values()].filter(
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
// A stranger who shares a school or a workplace with the player asks about
// that first (nothing to lie about); the cases below that turn on a lie need
// strangers whose first question is the player's work, so those come first
// in the list, in the order the population keeps them (drawn-place-tests:
// the draw may hold a shared school, and the cases no longer depend on it).
const asksWork = (id: PersonId) => {
  const kinds = subjectsBetween(core, id, me.id).map((row) => row.kind);
  return (
    kinds.includes("own-work") &&
    !kinds.includes("shared-school") &&
    !kinds.includes("shared-work")
  );
};
const strangers = [
  ...unrelated.filter((row) => asksWork(row.id as PersonId)),
  ...unrelated.filter((row) => !asksWork(row.id as PersonId)),
];
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
  .filter((row) => !doubtsClaim(core, row, me.id))
  .slice(0, 2);
// A doubter is looked for among every full adult the player does not know,
// not only the unrelated workers: a town may hold none among those 38.
const doubters = [...core.people.values()].filter(
  (row) =>
    row.alive &&
    row.tier !== "husk" &&
    row.id !== me.id &&
    !me.knownIds.has(row.id) &&
    age(row.birthDate) >= 18 &&
    doubtsClaim(core, row, me.id),
);
const doubter = doubters[0];
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
/** The other person's first question, after any greeting. */
const recentDays =
  DEFAULT_DIRECTOR_DATA.parameters.directorTalkRecentDays!.value;
const opening = (talk: Conversation) =>
  talk.lines.find(
    (row) =>
      row.kind !== "greet" && row.kind !== "here" && row.kind !== "here-back",
  )!;

// Owner, Nov 11, 2026: "all the lines in the game need to be run through the
// English engine ... a ton of different inserts". Meeting someone new, the
// talk turns to work: both employers are named, the job from its record, and
// nothing is asked that no record answers (words-home-work-lines-are-composed).
describe(`work talk names the employer and the job (${base.placeMetadata?.placeName}, seed ${seed})`, () => {
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
    // The first stranger who asks where the player is from; those who open
    // on something else are passed over and named (drawn-place-tests; fixer
    // round 9 of #8879: in Burlington, Iowa, on 6968d532b27c14b7 the first
    // stranger not asking about work asked about kin, which has no lie).
    const passed: string[] = [];
    const home = strangers
      .map((row) => openConversation(core, player.id, row.id))
      .find((talk) => {
        const kind = opening(talk)?.kind ?? "nothing";
        if (kind.startsWith("home")) return true;
        passed.push(`${talk.otherId}: ${kind}`);
        return false;
      });
    if (!home)
      process.stdout.write(
        `LIE-HOME none asked where the player is from; passed over ${passed.join(", ")}\n`,
      );
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

  it("opens no talk without a line to say (CTO, Nov 18: a blank talk is a broken screen, not nothing)", () => {
    // With the banks cut to what the records can word, the engine opens a
    // talk only where its first line composes; the room marks everyone else
    // unclickable (owner, Nov 1: a talk with no line is no talk). Today that
    // is every talk; the cases that said a turn return with the lines.
    const drawnOthers = [...core.people.values()]
      .filter((row) => row.alive && row.tier !== "husk" && row.id !== player.id)
      .slice(0, 60)
      .map((row) => row.id as PersonId);
    expect(drawnOthers.length).toBeGreaterThan(0);
    for (const otherId of drawnOthers) {
      const talk = openConversation(core, player.id, otherId, { look: true });
      for (const line of talk.lines)
        expect(
          line.text.trim().length,
          `${otherId}: a line with words`,
        ).toBeGreaterThan(0);
      if (!talk.lines.length)
        expect(
          talk.choices.length,
          `${otherId}: no replies to a talk that did not open`,
        ).toBe(0);
    }
  });
});

// words-home-greet-farewell-lines-are-composed (owner, Nov 11, 2026: "all the
// lines in the game need to be run through the English engine ... a ton of
// different speech versions"): a greeting names the listener or when the two
// last met, a goodbye names what the talk was about, and the hour at home.
describe("hellos and goodbyes are composed from the records", () => {
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

  it("never says a slot's own name as its replacement, ends on one goodbye, and keeps the closing words to their talks (round 11, rules 74, 80, 81)", () => {
    for (const otherId of everyone().slice(0, 120)) {
      const talk = play(otherId);
      for (const line of talk.lines) {
        expect(line.text, `${otherId}: ${line.text}`).not.toMatch(
          /\b(at|with|for) work\?/,
        );
        expect(line.text).not.toMatch(/Drive safe/);
        // "just" a head of a department or a body is never said.
        expect(line.text).not.toMatch(
          /\bjust (a|an|the) [^.]*\b(chief|director|manager)\b/i,
        );
      }
      const farewells = talk.lines.filter((line) => line.kind === "farewell");
      expect(farewells.length, `${otherId}`).toBeLessThanOrEqual(1);
      for (const bye of farewells) {
        // One goodbye: a name-closing core takes no closer after it.
        const sentences = bye.text.match(/[^.!?]+[.!?]/g) ?? [];
        expect(
          sentences.filter((sentence) =>
            /^(Take care of yourself|Look after yourself|Until next time|Take it easy|Keep well)/.test(
              sentence.trim(),
            ),
          ).length,
          bye.text,
        ).toBeLessThanOrEqual(1);
        if (/Thanks for the company/.test(bye.text))
          expect(talk.lines.length, bye.text).toBeGreaterThanOrEqual(8);
      }
    }
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
