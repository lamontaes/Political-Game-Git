import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { lawInForce } from "./modules/laws";
import { problemOf } from "./modules/constituent-cases";
import type { CoreState, PersonState } from "./types";

/**
 * A stipend post (a part-time public post whose budget line carries less than
 * a full week) keeps the post's own going hourly rate and works fewer hours;
 * it is not paid a cents-an-hour rate for a full-time week (found at
 * Woolstock, Iowa, where the City Attorney's commitment read 94 cents an
 * hour and every post-holder was offered a short-pay case). A worker who is
 * truly paid under the minimum wage still opens one.
 */
// Woolstock, Iowa, pinned by name and seed (it is the place the 94-cent
// City Attorney was found at).
const place = {
  name: "Woolstock, Iowa",
  key: "1987015",
  seed: "a6bc7bc6b5a348493264a233f7dcf3e34b4864dcc1b094808f825c4db4300664",
};
const where = `${place.name} (${place.key}), seed ${place.seed}`;

describe(`stipend posts keep a real rate at ${where}`, () => {
  it("no public post's pay is under the minimum wage, so none opens a short-pay case; a truly shorted worker still does", () => {
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const state = api.state as CoreState;
    const floor = lawInForce(api, "minimum-wage").value;
    expect(floor, where).not.toBeNull();
    const publicHolders: PersonState[] = [];
    const partTime: string[] = [];
    let fullWeek = 0;
    let weeklyPayMinor = 0;
    for (const c of state.work.commitments.values()) {
      if (!/^job:(public|office):/.test(c.jobId)) continue;
      const person = state.people.get(c.personId);
      if (!person) continue;
      expect(c.hourlyMinor, `${where}: ${c.jobId}`).toBeGreaterThanOrEqual(
        floor!,
      );
      publicHolders.push(person);
      weeklyPayMinor += Math.round(
        (c.expectedWeeklyMinutes * c.hourlyMinor) / 60,
      );
      const minutes = c.slots.reduce((n, s) => n + s.minutes, 0);
      expect(minutes, `${where}: ${c.jobId} slots`).toBe(
        c.expectedWeeklyMinutes,
      );
      if (c.expectedWeeklyMinutes < 30 * 60) {
        partTime.push(c.jobId);
        // The pay in total is the line's: the week's minutes at the rate come
        // to the job's daily wage over the week, to a few minor units.
        const week = (c.expectedWeeklyMinutes * c.hourlyMinor) / 60;
        const room =
          state.jobs.get(c.jobId)!.wageDailyMinor *
          api.parameter("daysPerWeek");
        expect(Math.abs(week - room), `${where}: ${c.jobId} pay`).toBeLessThan(
          10,
        );
      } else fullWeek++;
    }
    expect(publicHolders.length, where).toBeGreaterThan(0);
    for (const person of publicHolders) {
      const found = problemOf(api, person);
      expect(
        found?.problem === "paid-under-minimum-wage",
        `${where}: ${person.id} ${JSON.stringify(found)}`,
      ).toBe(false);
    }
    process.stdout.write(
      `${where}: ${publicHolders.length} public holders, ${fullWeek} full-week, ${partTime.length} part-time (${partTime.join(", ")}); none under ${floor}; public pay a week ${weeklyPayMinor} minor\n`,
    );
    // The same worker in an ordinary job paid under the floor is still flagged.
    const victim = [...state.work.commitments.values()].find(
      (c) =>
        !/^job:(public|office):/.test(c.jobId) &&
        state.people.get(c.personId)?.alive &&
        state.people.get(c.personId)!.id.startsWith("person_"),
    );
    expect(victim, `${where}: an ordinary worker`).toBeDefined();
    const shorted = { ...victim!, hourlyMinor: floor! - 100 };
    state.work.commitments.set(shorted.id, shorted);
    const found = problemOf(api, state.people.get(shorted.personId)!);
    expect(found?.problem, where).toBe("paid-under-minimum-wage");
  }, 15_000);
});
