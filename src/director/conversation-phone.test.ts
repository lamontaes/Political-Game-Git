/**
 * A call is greeted and ended as a call (round 12, by-phone lines). Pinned to
 * three named places and fixed seeds (skill pinned-tests): the other person
 * answers, the player says who it is in their own words, the greeting never
 * says a thing that needs the two in one room ("Good to see you"), and the
 * goodbye never invites a stop-in. A visit, with the same people, never says
 * what only a call says.
 */
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { buildBenchWorld } from "../bench/world";
import bank from "../../data/english/parts/conversation.json" with { type: "json" };
import { meetOverTalk, noteHeard, openConversation, say } from "./conversation";

/** Words that need the two people in one room. */
const IN_ROOM =
  /good to see you|good seeing you|nice seeing you|always good to see|run(ning)? into|there you are|look who it is|thought that was you|stop(ped)? (in|by)|come (by|see|back)|see you around|just who i wanted to see/i;
/** Words only a call says. */
const ON_THE_LINE =
  /^(hello\?|yes, hello\?)$|it's (me|[A-Z][a-z]+)\.$|thanks for (calling|the call)|glad you called|call (me )?anytime|hear your voice|let you go/i;

/** A hello said as a question ("What's up?") is a greeting, not a question that wants an answer. */
const GREETING_FORMULA =
  /^((Oh, hi|Hey|Hey, you)\. )?(What's up|What's going on|How are you doing)\?$|^(Hello|Yes, hello)\?$/;
/** The days a call is tried on: a world at opening has little news yet. */
const NEAR_DAYS = [0, 10, 30];
/** A long gap: the three "it's been a while" lines need `when-long`; at Deepstep, day 300 has three people long out of touch, enough for the rotation (least recently said first) to reach all three. */
const LONG_DAYS = [300];
/** Every line said in any call of the run. */
const PLAYED = new Set<string>();

const SEEDS = [
  ["phone-pin-a", "b550a10bcd3bf708"],
  ["phone-pin-b", "18661a5958abacd3"],
  ["phone-pin-c", "5c1b2e77d3a94f10"],
] as const;

describe("a call is greeted and ended as a call", () => {
  // The cut of Nov 17 left no talk subject a call can carry, so no call is
  // offered at the pinned places on days 0 to 300; these cases wait on the
  // first subjects (CTO, Nov 18 18:27Z on #9750: story-call-subjects-after-the-cut).
  // The marks come off when the first subject lands.
  it.fails.each(SEEDS)(
    "%s: no in-room words on a call, none of the line's on a visit",
    (_name, seed) => {
      setBookkeeping(false);
      const place = drawPlace(seed, "phone:0");
      const { core, director, playerId } = buildBenchWorld(
        place.seed,
        gameStartDate(),
        { twoLevel: true, placeKey: place.key },
      );
      director.watch(core, playerId);
      core.focusPersonIds.add(playerId);
      const me = core.people.get(playerId as PersonId)!;
      const api = coreAPI(core);
      const others = [...core.people.values()]
        .filter(
          (row) =>
            row.alive &&
            row.tier !== "husk" &&
            row.id !== me.id &&
            (row.householdId === me.householdId || row.jobId !== undefined),
        )
        .sort(
          (a, b) =>
            Number(b.householdId === me.householdId) -
            Number(a.householdId === me.householdId),
        )
        .slice(0, 8);
      for (const row of others)
        api.meet(me.id, row.id, {
          placeId: me.placeId,
          sourceId: "fixture-meeting",
          cause: "met-in-group",
          hours: 1,
        });
      let answered = 0;
      let named = 0;
      for (const [at, row] of others.entries()) {
        const call = openConversation(core, playerId as PersonId, row.id, {
          director,
          byPhone: true,
        });
        for (const line of call.lines.filter(
          (item) => item.kind === "greet" || item.kind === "farewell",
        ))
          expect(line.text, `${place.name} call ${at}`).not.toMatch(IN_ROOM);
        const greet = call.lines.filter((item) => item.kind === "greet");
        if (greet.length) {
          // The other person answers, then the player says who it is, then the other goes on.
          answered += 1;
          expect(greet.map((item) => item.speakerId === playerId)).toEqual([
            false,
            true,
            false,
          ]);
          if (/it's (me|[A-Z])/.test(greet[1]!.text)) named += 1;
        }
      }
      expect(answered, `${place.name}: calls answered`).toBeGreaterThan(0);
      expect(named, `${place.name}: the player says who it is`).toBe(answered);
      for (const [at, row] of others.entries()) {
        const visit = openConversation(core, playerId as PersonId, row.id, {
          director,
        });
        for (const line of visit.lines)
          expect(line.text, `${place.name} visit ${at}`).not.toMatch(
            ON_THE_LINE,
          );
      }
    },
    60_000,
  );
});

/** What only a doorway says, and a stranger's first words. */
const AT_THE_DOOR =
  /^(heading out|see you again)\.?$|^i'm [A-Z][a-z]+\. i don't think we've met\./i;

const CALL_CASES = [
  ["phone-pin-a", "b550a10bcd3bf708", NEAR_DAYS],
  ["phone-pin-b", "18661a5958abacd3", NEAR_DAYS],
  ["phone-pin-c", "5c1b2e77d3a94f10", NEAR_DAYS],
  ["phone-pin-c-long-gap", "5c1b2e77d3a94f10", LONG_DAYS],
] as const;

const everyCallIsACall = (
  name: (typeof CALL_CASES)[number][0],
  seed: string,
  days: readonly number[],
) => {
  setBookkeeping(false);
  const place = drawPlace(seed, "phone:0");
  const { core, director, playerId } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    { twoLevel: true, placeKey: place.key },
  );
  director.watch(core, playerId);
  core.focusPersonIds.add(playerId);
  const me = core.people.get(playerId as PersonId)!;
  const api = coreAPI(core);
  const housemates = [...core.people.values()].filter(
    (row) =>
      row.alive && row.id !== me.id && row.householdId === me.householdId,
  );
  const relatives = [...core.people.values()].filter(
    (row) =>
      row.alive &&
      row.householdId !== me.householdId &&
      me.familyIds.has(row.id as PersonId),
  );
  const met = [...core.people.values()]
    .filter(
      (row) =>
        row.alive &&
        row.tier !== "husk" &&
        row.id !== me.id &&
        row.householdId !== me.householdId &&
        !me.familyIds.has(row.id as PersonId) &&
        row.jobId !== undefined,
    )
    .slice(0, 8);
  for (const row of met)
    api.meet(me.id, row.id, {
      placeId: me.placeId,
      sourceId: "fixture-meeting",
      cause: "met-in-group",
      hours: 1,
    });
  const callees = [...housemates.slice(0, 3), ...relatives.slice(0, 3), ...met];
  expect(callees.length, `${place.name}: someone to call`).toBeGreaterThan(0);
  let heardGoodbye = 0;
  let callsOffered = 0;
  let offeredEmpty = 0;
  const transcript: string[] = [
    `# Played at ${process.env.PHONE_SHA ?? "(sha not given)"}`,
    `## ${place.name} (${place.key}), seed ${seed}`,
  ];
  const start = makeIsoDate(core.date);
  for (const day of days) {
    if (day) advanceCore(core, addDays(start, day));
    // One call at a time, as a player makes them: looked at, opened,
    // then played, so what one call told is heard by the next.
    for (const row of callees) {
      const where = `${place.name} day ${day}, call to ${row.givenName}`;
      // A call with nothing to say is not offered: the room's own check
      // (look) says so, and the call the player would make says nothing.
      const offered =
        openConversation(core, playerId as PersonId, row.id, {
          director,
          byPhone: true,
          look: true,
        }).lines.length > 0;
      const call = openConversation(core, playerId as PersonId, row.id, {
        director,
        byPhone: true,
      });
      if (offered && !call.lines.length) offeredEmpty += 1;
      if (!call.lines.length) continue;
      callsOffered += 1;
      // What the game does as a call opens: the two have spoken, and what
      // was said is heard today (the talk's own bench road).
      meetOverTalk(core, call);
      noteHeard(core, call);
      // The person answering says hello, as a call is answered.
      expect(call.lines[0]!.speakerId, where).toBe(row.id);
      expect(call.lines[0]!.text, where).toMatch(/^(Hello\?|Yes, hello\?)$/);
      expect(call.lines[1]!.speakerId, where).toBe(playerId);
      // The talk goes on to its end: each offered reply in turn.
      let talk = call;
      for (let turn = 0; turn < 8 && talk.choices.length; turn += 1)
        talk = say(core, talk, talk.choices[turn % talk.choices.length]!.key);
      transcript.push(
        `### ${where}`,
        ...talk.lines.map(
          (line) =>
            `  ${line.speakerId === playerId ? "You" : row.givenName}: ${line.text}`,
        ),
        "",
      );
      if (process.env.PHONE_OUT)
        writeFileSync(
          `${process.env.PHONE_OUT}-${seed}${name.endsWith("long-gap") ? "-long-gap" : ""}.md`,
          transcript.join("\n"),
        );
      // A question the person puts to the player gives the player the
      // next turn: the person never goes straight on to their own news
      // (Words lead, Nov 14), and the hello's own "Hello?" is answered.
      talk.lines.forEach((line, at) => {
        const next = talk.lines[at + 1];
        if (
          next &&
          line.speakerId === row.id &&
          next.speakerId === row.id &&
          /\?$/.test(line.text) &&
          !GREETING_FORMULA.test(line.text)
        )
          expect.fail(
            `${where}: "${line.text}" is followed at once by "${next.text}"`,
          );
      });
      // The goodbye never says again what the hello said (Words lead, Nov 14).
      const said = talk.lines
        .filter((line) => line.speakerId === row.id)
        .map((line) => line.text.toLowerCase());
      expect(
        said.filter((text) => /hear your voice/.test(text)).length,
        `${where}: glad to hear the voice, once`,
      ).toBeLessThanOrEqual(1);
      // A question the player asked is answered: the call never ends on it.
      const last = talk.lines.at(-1)!;
      expect(last.text, `${where}: ends on a question`).not.toMatch(/\?$/);
      // A call ends on a goodbye, always the other person's.
      expect(last.kind, `${where}: a call ends on a goodbye`).toBe("farewell");
      expect(last.speakerId, where).toBe(row.id);
      for (const line of talk.lines) {
        expect(line.text, where).not.toMatch(AT_THE_DOOR);
        expect(line.text, where).not.toMatch(IN_ROOM);
        PLAYED.add(line.text);
        if (line.kind === "farewell") heardGoodbye += 1;
      }
    }
  }
  expect(
    callsOffered,
    `${place.name}: a call is offered to someone`,
  ).toBeGreaterThan(0);
  if (process.env.PHONE_OUT)
    writeFileSync(
      `${process.env.PHONE_OUT}-${seed}${name.endsWith("long-gap") ? "-long-gap" : ""}.md`,
      transcript.join("\n"),
    );
  process.stdout.write(
    `PHONE ${place.name}: ${callees.length} people, ${callsOffered} calls with words, ${offeredEmpty} the room's check offered that opened on nothing, ${heardGoodbye} goodbyes\n`,
  );
};

const CALL_TITLE =
  "%s: a call to a housemate, a relative or someone met says hello first, never introduces, never says a doorway goodbye";

describe("every call is a call (Words lead, Nov 14: five faults)", () => {
  // The cut of Nov 17 left no talk subject a call can carry, so no call is
  // offered at the pinned places on days 0 to 300; these cases wait on the
  // first subjects (CTO, Nov 18 18:27Z on #9750: story-call-subjects-after-the-cut).
  // The marks come off when the first subject lands.
  it.fails.each(CALL_CASES)(CALL_TITLE, everyCallIsACall, 100_000);
});

describe("every line the call has of its own is played", () => {
  it("each phone hello, self line, go-on and goodbye is said in the pinned calls", () => {
    type Part = {
      key: string;
      text: string;
      uses: { requiresFacts?: string[] }[];
    };
    const own = (bank as unknown as { parts: Part[] }).parts.filter(
      (part) =>
        part.key.split(".").at(-1)!.startsWith("phone-") &&
        part.uses.some((use) => use.requiresFacts?.includes("by-phone")),
    );
    const escape = (text: string) =>
      text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const missing = own
      .filter(
        (part) =>
          ![...PLAYED].some((line) =>
            new RegExp(
              `^${part.text
                .split(/\{[a-z-]+\}/)
                .map(escape)
                .join(".+?")}$`,
            ).test(line),
          ),
      )
      .map((part) => part.text);
    process.stdout.write(`PHONE-UNSEEN ${JSON.stringify(missing)}\n`);
    expect(missing, "phone lines never played in the pinned calls").toEqual([]);
  });
});
