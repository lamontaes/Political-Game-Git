/**
 * Every day starts in the morning (owner playtest, Oct 24, play-stop-07): Day
 * pressed from an evening lands on the next calendar date at the controlled
 * person's day-start minute, Week lands on the same morning seven days on,
 * and a campaign outing that the records say takes N hours moves the clock
 * N hours. Played in a world drawn from all 56 places, named in each message.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "./world";
import { BenchPlayer } from "./player";
import { gameStartDate } from "../core2/game-start";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { parameter } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { PlayerMomentV1 } from "../core2/player-v1";
import { townSeats } from "../core2/modules/offices";
import type { CoreState } from "../core2/types";
import { fileCandidacy, openContests } from "../core2/modules/elections";
import { campaignDay } from "./campaign";
import { applyChosenPerson } from "./creator";

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`player-day-morning:${Date.now()}`).digest("hex");

const minutes = (a: PlayerMomentV1, b: PlayerMomentV1) =>
  ((Date.parse(b.date) - Date.parse(a.date)) / 86_400_000) * 1440 +
  (b.minuteOfDay - a.minuteOfDay);

/** The world as played in a drawn place, and who could file there, richest first. */
function openWorld(index: number) {
  const place = drawPlace(runSeed, `play-stop-07:${index}`);
  const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
  const { core, director, playerId } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    { twoLevel: true, placeKey: place.key },
  );
  // Named before play, so a failure anywhere below says where it happened.
  console.log(`world ${index}: ${where}`);
  const startYear = Number(core.date.slice(0, 4));
  const adults = [...core.people.values()]
    .filter((p) => p.alive && startYear - Number(p.birthDate.slice(0, 4)) >= 35)
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
  return { core: core as CoreState, director, adults, where, playerId };
}

/** A local filing (never federal or state) by an adult who holds no seat, from the records. */
function fileLocal(core: CoreState, adults: readonly { id: string }[]) {
  const api = coreAPI(core);
  for (const candidate of adults) {
    if (townSeats(api).some((s) => s.holder?.personId === candidate.id))
      continue;
    core.playerId = candidate.id;
    for (const contest of openContests(api)) {
      if (contest.level === "federal" || contest.level === "state") continue;
      const filed = fileCandidacy(api, {
        personId: candidate.id,
        contestId: contest.id,
        platform: [`${PLATFORM_QUESTIONS[0]}=1`],
      });
      if (
        filed.status !== "refused" &&
        ["petitioning", "on-ballot"].includes(filed.filing.status ?? "")
      )
        return filed.filing;
    }
  }
  return null;
}

/** The character lives out any stop on the way, as a skip does; returns where the clock landed. */
function settle(
  player: BenchPlayer,
  result: { packet: NonNullable<BenchPlayer["packet"]> } | undefined,
  where: string,
) {
  let packet = result!.packet;
  for (let guard = 0; packet.kind !== "complete"; guard++) {
    expect(guard, `the advance finished: ${where}`).toBeLessThan(500);
    expect(packet.kind, where).toBe("stop");
    packet = player.resume({
      kind: "stop",
      pauseId: (packet as { pauseId: string }).pauseId,
    }).packet;
  }
  return packet.at;
}

const EVENING = 20 * 60 + 30;

it(
  "Day lands on the next morning and Week on the same morning a week on",
  { timeout: 600_000 },
  () => {
    // The drawn player, as the play screen drives them.
    const { core, director, where, adults } = openWorld(0);
    // A grown resident: the clock's rule, with no coming of age on the way
    // (that day's own stop is the birthday case below).
    const playerId = adults[0]?.id;
    const start = parameter("playerDayStartMinute", core.data.parameters);
    expect(start, where).toBeGreaterThan(0);
    const player = new BenchPlayer(core, director);
    player.select(playerId!);
    const run = (r: Parameters<typeof settle>[1]) => settle(player, r, where);

    // Day from the cold start lands on a morning, not midnight.
    const first = run(player.advance("day"));
    expect(first.minuteOfDay, `first Day lands on the morning: ${where}`).toBe(
      start,
    );

    // Push on to an evening, then Day lands on the next calendar date's morning.
    const evening = run(player.spend((EVENING - first.minuteOfDay) / 60));
    expect(evening, where).toEqual({ date: first.date, minuteOfDay: EVENING });
    const next = run(player.advance("day"));
    expect(
      next,
      `Day from ${evening.date} 8:30 PM lands on the next morning: ${where}`,
    ).toEqual({
      date: addDays(makeIsoDate(evening.date), 1),
      minuteOfDay: start,
    });

    // Day again from the morning: one day on, same minute.
    const again = run(player.advance("day"));
    expect(again, where).toEqual({
      date: addDays(makeIsoDate(next.date), 1),
      minuteOfDay: start,
    });

    // Week: the same morning seven days on, with every day between lived.
    const week = run(player.advance("week"));
    expect(week, where).toEqual({
      date: addDays(makeIsoDate(again.date), 7),
      minuteOfDay: start,
    });

    // From an evening, Week lands on the morning seven days on from that date.
    const late = run(player.spend((EVENING - start) / 60));
    const weekFromEvening = run(player.advance("week"));
    expect(weekFromEvening, where).toEqual({
      date: addDays(makeIsoDate(late.date), 7),
      minuteOfDay: start,
    });
  },
);

it(
  "a campaign outing spends the hours the records give it on the clock",
  // Measured at 6 seconds in Rainbow City; allow six generated-town attempts.
  { timeout: 600_000 },
  () => {
    for (let index = 0; index < 6; index++) {
      const { core, director, adults, where } = openWorld(index);
      const filing = fileLocal(core, adults);
      if (!filing) continue;
      const player = new BenchPlayer(core, director);
      player.select(filing.personId);
      const run = (r: Parameters<typeof settle>[1]) => settle(player, r, where);
      const before = run(player.advance("day"));
      const taken = campaignDay(core, filing.personId, {
        filingId: filing.id,
        kind: "canvass",
      });
      expect(taken.hours, `the canvass takes hours: ${where}`).toBeGreaterThan(
        0,
      );
      const after = run(player.spend(taken.hours));
      expect(
        minutes(before, after),
        `a ${taken.hours}-hour canvass moves the clock ${taken.hours} hours (${JSON.stringify(before)} to ${JSON.stringify(after)}): ${where}`,
      ).toBe(taken.hours * 60);
      console.info(`canvass ${taken.hours} hours: ${where}`);
      return;
    }
    throw new Error(`No drawn place had a local race to file in: ${runSeed}`);
  },
);

it(
  "a coming of age met on the way is met on its morning, not at midnight",
  { timeout: 600_000 },
  () => {
    const { core, director, where, playerId } = openWorld(2);
    const start = parameter("playerDayStartMinute", core.data.parameters);
    // The resident turns eighteen three days into the week.
    const birthday = addDays(makeIsoDate(core.date), 3);
    const person = core.people.get(playerId!)!;
    applyChosenPerson(core, playerId!, {
      givenName: person.givenName,
      familyName: person.familyName,
      gender: "female",
      birthYear: Number(birthday.slice(0, 4)) - 18,
      birthMonth: Number(birthday.slice(5, 7)),
      birthDay: Number(birthday.slice(8, 10)),
    });
    const player = new BenchPlayer(core, director);
    player.select(playerId!);
    const stopped = settle(player, player.advance("week"), where);
    expect(stopped, `the week stops on the birthday morning: ${where}`).toEqual(
      { date: birthday, minuteOfDay: start },
    );
  },
);
