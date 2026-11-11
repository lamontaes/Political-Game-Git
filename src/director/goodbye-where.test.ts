import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { PersonId } from "../core2/types";
import { openConversation, say } from "./conversation";

// A goodbye that names the player says only what is true where and when it
// is said (Fable B's review of #8822, Nov 11; owner's rule: words know the
// hour and the person): never "Thanks for stopping by" between housemates at
// home, never "Don't work too hard" to someone with no job, never "Enjoy the
// rest of your day" in the evening. The conditions are facts of the talk
// (`partingLine`): the place the player came to, the player's job, the
// household, the hour.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "goodbye-where");
const EVENING = 20 * 60;
/** The goodbyes said only where the player came to the speaker's work. */
const AT_THEIR_WORK = [
  "Thanks for stopping by",
  "Come see us again",
  "You know where to find me",
  "I'd better get back to it",
  "Glad you stopped by",
  "Come by again",
  "Stop in anytime",
  "Good of you to stop",
  "Back to work for me",
];
/** The goodbyes never said between housemates at home. */
const NOT_AT_HOME = ["Drive safe", "Say hi to your folks"];

it(`says a goodbye only where and when it is true (${place.name}, seed ${seed})`, () => {
  setBookkeeping(false);
  const { core, director, playerId } = buildBenchWorld(
    place.seed,
    "2025-01-20",
    { twoLevel: true, placeKey: place.key },
  );
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  const me = playerId as PersonId;
  /** Every goodbye said in talks between one player and the others, played to their end. */
  const goodbyes = (
    asPlayer: PersonId,
    others: readonly PersonId[],
    options: { minuteOfDay?: number; visitOrganizationId?: string } = {},
  ) => {
    const said: string[] = [];
    for (const otherId of others)
      for (let again = 0; again < 3; again += 1) {
        const talk = openConversation(core, asPlayer, otherId, {
          director,
          ...options,
        });
        for (let turn = 0; turn < 8 && talk.choices.length; turn += 1)
          say(core, talk, talk.choices[turn % talk.choices.length]!.key);
        for (const line of talk.lines)
          if (line.kind === "farewell") said.push(line.text);
      }
    return said;
  };
  const people = [...core.people.values()].filter(
    (row) => row.alive && row.tier !== "husk",
  );
  const household = people
    .filter(
      (row) =>
        row.id !== me && row.householdId === core.people.get(me)!.householdId,
    )
    .map((row) => row.id as PersonId);
  const away = people
    .filter((row) => row.householdId !== core.people.get(me)!.householdId)
    .slice(0, 60)
    .map((row) => row.id as PersonId);
  const has = (lines: readonly string[], starts: readonly string[]) =>
    lines.filter((line) => starts.some((start) => line.includes(start)));

  // At home in the evening, between housemates: none of them.
  const home = goodbyes(me, household, { minuteOfDay: EVENING });
  expect(
    has(home, [...AT_THEIR_WORK, ...NOT_AT_HOME, "Enjoy the rest of your day"]),
    "at home in the evening",
  ).toEqual([]);
  // Away, with no visit on record: nothing that says the player came to them,
  // and nothing about the rest of the day in the evening.
  const out = goodbyes(me, away, { minuteOfDay: EVENING });
  expect(has(out, [...AT_THEIR_WORK, "Enjoy the rest of your day"])).toEqual(
    [],
  );
  // Someone with no job, standing in as the player: never told not to work too hard.
  const jobless = people.find(
    (row) => !row.jobId && row.id !== me && row.givenName,
  );
  expect(jobless, "someone in town without a job").toBeDefined();
  const idle = goodbyes(jobless!.id as PersonId, away.slice(0, 40));
  expect(has(idle, ["Don't work too hard"])).toEqual([]);
  // At the speaker's work, where the player came to them: those goodbyes may be said.
  const atWork: string[] = [];
  for (const otherId of away) {
    const job = core.people.get(otherId)?.jobId;
    const org = job ? core.jobs.get(job)?.organizationId : undefined;
    if (org)
      atWork.push(
        ...goodbyes(me, [otherId], {
          minuteOfDay: 11 * 60,
          visitOrganizationId: org,
        }),
      );
  }
  const there = has(atWork, AT_THEIR_WORK);
  process.stdout.write(
    `GOODBYE AT THEIR WORK: ${there.length} of ${atWork.length}, e.g. "${there[0] ?? "-"}"\n`,
  );
  process.stdout.write(
    `GOODBYE WHERE ${place.name}: ${home.length} at home, ${out.length} away, ${idle.length} to ${jobless!.givenName} (no job)\n`,
  );
  expect(home.length + out.length, "goodbyes said").toBeGreaterThan(0);
  // A heavy draw takes about 47 s (Phoenixville, Pennsylvania, seed 785d131f…;
  // Gate desk 5, Nov 11), past vitest's 30 s default.
}, 180_000);
