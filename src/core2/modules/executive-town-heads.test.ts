/**
 * A town's department heads (fire chief, city administrator, ...) are
 * appointed over the whole town, its counted adults included, not from the
 * player's own household (pool item gov-appointments-weigh-counted-adults).
 * Ten places are drawn from all 56. Every head is a person whose job, home and
 * household agree with the town's records; every post in a town with counted
 * adults weighed at least one of them; and the heads who were counted adults
 * filled in when named carry it on their appointment's record, by id. The
 * count of heads from the player's household is logged, not bounded here: a
 * post weighs every full adult but only a few counted ones, a fault of its
 * own (pool item gov-town-posts-weigh-both-tiers-from-one-list). Replay with
 * TOWN_HEADS_SEED.
 */
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../bench/world";
import { setBookkeeping } from "../bookkeeping";
import { countedResidentsOf } from "../electorate";
import { gameStartDate } from "../game-start";
import { coreAPI } from "../state";
import { appointmentsIn } from "./executive";
import { lawChain } from "./laws";

setBookkeeping(false);

const base = process.env.TOWN_HEADS_SEED ?? randomBytes(8).toString("hex");
const PLACES = Number(process.env.TOWN_HEADS_PLACES ?? 10);

describe(`a town's department heads over ${PLACES} drawn places (seed ${base})`, () => {
  it("come from the whole town: each a person on record, the counted adults weighed", () => {
    let heads = 0,
      family = 0,
      householdAdults = 0,
      townAdults = 0;
    const filledIn: string[] = [];
    const rows: string[] = [];
    for (let at = 0; at < PLACES; at += 1) {
      const seed = `${base}:${at}`;
      const place = drawPlace(seed, "town-heads");
      const where = `${place.name} (${place.key}), seed ${seed}`;
      const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const town = lawChain(api).townPlaceId;
      const home = new Set<string>(
        core.households.get(core.people.get(playerId! as never)!.householdId)
          ?.memberIds ?? [],
      );
      const year = Number(core.date.slice(0, 4));
      const adult = (birth: string) => year - Number(birth.slice(0, 4)) >= 18;
      // The town's adults, full and counted (each counted record by its weight).
      for (const id of core.peopleByPlace.get(town as never) ?? []) {
        const person = core.people.get(id);
        if (person?.alive && adult(person.birthDate)) townAdults += 1;
      }
      let countedAdults = 0;
      for (const voter of countedResidentsOf(core, town))
        if (adult(voter.birthDate)) {
          townAdults += voter.weight;
          countedAdults += 1;
        }
      for (const id of home) {
        const person = core.people.get(id as never);
        if (person?.alive && adult(person.birthDate)) householdAdults += 1;
      }
      const posts = appointmentsIn(api, town).filter((row) =>
        row.id.startsWith("appointment:town:"),
      );
      let mine = 0;
      for (const row of posts) {
        heads += 1;
        const person = core.people.get(row.holderId as never);
        expect(
          person?.alive,
          `${where}: ${row.id} holder ${row.holderId}`,
        ).toBe(true);
        // Their home and household agree with the records, and so does their job.
        expect(
          core.households
            .get(person!.householdId)
            ?.memberIds.includes(person!.id),
          `${where}: ${row.holderId}'s household`,
        ).toBe(true);
        if (person!.jobId)
          expect(
            core.jobs.get(person!.jobId)?.id,
            `${where}: ${row.holderId}'s job`,
          ).toBe(person!.jobId);
        if (home.has(row.holderId)) {
          family += 1;
          mine += 1;
        }
        // The appointment's own record says when the head was a counted adult filled in for it.
        const event = core.durableLog.get(
          `appointed:${row.id}:${row.since}` as never,
        );
        expect(event, `${where}: ${row.id}'s appointment record`).toBeDefined();
        if (event?.facts?.filledIn === "counted")
          filledIn.push(`${row.holderId} (${row.post}, ${place.name})`);
        // A town with counted adults weighed at least one of them for the post.
        if (countedAdults > 0)
          expect(
            Number(event?.facts?.countedWeighed ?? 0),
            `${where}: ${row.id} weighed no counted adult`,
          ).toBeGreaterThan(0);
      }
      rows.push(
        `${where}: ${mine} of ${posts.length} heads from the household (${posts.map((p) => `${p.post}=${p.holderId}`).join(", ")})`,
      );
    }
    const said = `${rows.join("; ")}; total ${family} of ${heads} heads from households holding ${householdAdults} of ${Math.round(townAdults)} adults`;
    appendFileSync(
      process.env.TOWN_HEADS_LOG ?? "/dev/null",
      `\ntown-heads (${base}): ${said}; filled in: ${filledIn.join(", ") || "none"}`,
    );
    expect(heads, said).toBeGreaterThan(0);
    expect(filledIn.length, said).toBeGreaterThan(0);
  }, 3_600_000);
});
