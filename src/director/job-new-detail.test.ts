import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { openConversation, say, subjectsBetween } from "./conversation";

// A question is never left unanswered (owner, Oct 15, batch 12: "A yes or no
// never ends a talk; the asker follows up"; the Oct 28 proof year: "What will
// you be doing there?" answered with "Let's talk more tomorrow, okay?"). A
// relative who tells of a new job, asked what it is, says what the job record
// holds: its title. In a place drawn from all 56, played day by
// day until someone in the player's household starts a job.
// Places are drawn until a household starts a job, at most PLACES of them,
// each named.
const PLACES = 3;
const MAX_DAYS = 180;

function playedUntilAJobStarts(seed: string) {
  const place = drawPlace(seed, "job-new-detail");
  console.log(`${place.name} (${place.key}), seed ${seed}`);
  const world = buildBenchWorld(place.seed, "2025-01-20", {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const playerId = world.playerId!;
  const player = core.people.get(playerId)!;
  const household = (core.households.get(player.householdId)?.memberIds ?? [])
    .filter((id) => core.people.get(id)?.alive)
    .sort();
  for (const id of household) director.watch(core, id);
  const told = () => {
    for (const id of household.filter((row) => row !== playerId)) {
      const subject = subjectsBetween(core, id, playerId, director).find(
        (row) => row.kind === "job-new-detail",
      );
      if (subject) return { speakerId: id, subject };
    }
    return null;
  };
  let found = told();
  for (let day = 0; !found && day < MAX_DAYS; day += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    found = told();
  }
  return found ? { core, director, playerId, ...found } : null;
}

it(
  "a relative asked about a new job says what it is",
  { timeout: 1_200_000 },
  () => {
    setBookkeeping(false);
    const base =
      process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
    let played: ReturnType<typeof playedUntilAJobStarts> = null;
    for (let n = 0; !played && n < PLACES; n += 1)
      played = playedUntilAJobStarts(`${base}-${n}`);
    if (!played) {
      // No household in the drawn places started a job: nothing to ask.
      console.log(`no new job in ${PLACES} households in ${MAX_DAYS} days`);
      return;
    }
    const { core, director, playerId, speakerId, subject } = played;
    const jobId = subject.aboutId!;
    const job = core.jobs.get(jobId)!;
    const talk = openConversation(core, playerId, speakerId, { director });
    const opened = talk.lines.find((line) =>
      line.subjectId?.startsWith("job-new:"),
    );
    if (!opened) {
      console.log("the talk opened on something bigger than the new job");
      return;
    }
    const ask = talk.choices.find((choice) => choice.move === "ask");
    expect(ask, "the player may ask what the job is").toBeTruthy();
    const before = talk.lines.length;
    say(core, talk, ask!.key);
    const answer = talk.lines
      .slice(before + 1)
      .find((line) => line.speakerId === speakerId);
    expect(answer, "the relative answers the question").toBeTruthy();
    expect(answer!.kind).not.toBe("farewell");
    expect(answer!.sourceRecordIds).toContain(jobId);
    expect(answer!.text.toLowerCase()).toContain(
      job.title.toLowerCase().slice(0, 4),
    );
  },
);
