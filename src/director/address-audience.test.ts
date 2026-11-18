/**
 * People outside the player's house hold the President's address on record
 * (pool item director-address-reaches-beyond-the-house; pattern A47, "The
 * first word on the address"). In places drawn from all 56, on the opening:
 *
 * - town residents outside the player's household hold the address, sourced
 *   to the address's own record (they watched it), learned the day it aired,
 *   and the town's share of watchers sits near the sourced audience share;
 * - a neighbor filled in from the counts the next morning is read by the same
 *   rule, and one who holds it is offered the address and its point in a talk
 *   with the player, citing how they learned it.
 *
 * Seed from GOLDEN_PATH_SEED (random when unset); the place used and every
 * place passed over are printed.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { isDemoted } from "../core2/counted-groups";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { P } from "../core2/parameters";
import { residentsRuntime } from "../core2/modules/residents";
import { personOrFillIn } from "../core2/state";
import type { PersonId } from "../core2/types";
import { addressWatchedShare } from "./address-audience";
import { subjectsBetween } from "./conversation";
import { ADDRESS_FACT } from "./opening-facts";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const DRAWS = 6;
/** Counted households of the town filled in, at most, looking for a neighbor who watched. */
const NEIGHBORS = 60;
/** How far the town's share of watchers may sit from the sourced share: one household's worth in a town of a hundred or so full residents. */
const SHARE_SLACK = 0.06;

it(
  `a neighbor outside the player's house holds the address, with its source, and raises it (seed ${seed})`,
  { timeout: 900_000 },
  () => {
    setBookkeeping(false);
    const passed: string[] = [];
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const place = drawPlace(
        draw === 0 ? seed : `${seed}:${draw}`,
        "address-audience",
      );
      const where = `${place.name} (${place.key}), seed ${draw === 0 ? seed : `${seed}:${draw}`}`;
      const { core, director, playerId } = buildBenchWorld(
        place.seed,
        gameStartDate(),
        { twoLevel: true, placeKey: place.key },
      );
      const me = playerId as PersonId;
      const player = core.people.get(me)!;
      const mine = core.knowledgeByPerson.get(me)?.get(ADDRESS_FACT.event);
      if (!mine) {
        passed.push(`${where}: no address recorded`);
        continue;
      }
      const eventId = mine.value;
      const town = player.placeId;
      // Watched: town residents outside the household, from the address's record.
      let residents = 0;
      let holders = 0;
      const outside: PersonId[] = [];
      for (const id of core.peopleByPlace.get(town) ?? []) {
        const person = core.people.get(id);
        if (!person?.alive || isDemoted(person)) continue;
        residents += 1;
        const row = core.knowledgeByPerson.get(id)?.get(ADDRESS_FACT.event);
        if (!row) continue;
        holders += 1;
        if (person.householdId === player.householdId) continue;
        outside.push(id);
        expect(row.sourceId, where).toBe(eventId);
        expect(row.learnedAt, where).toBe(mine.learnedAt);
      }
      expect(
        outside.length,
        `${where}: no one outside the house watched`,
      ).toBeGreaterThan(0);
      expect(
        Math.abs(holders / residents - addressWatchedShare()),
        `${where}: ${holders} of ${residents} watched`,
      ).toBeLessThanOrEqual(SHARE_SLACK);
      // The next morning, the neighbors the player meets are filled in from
      // the counts, each read by the same rule.
      advanceCore(core, addDays(makeIsoDate(core.date), P.one));
      const store = residentsRuntime(core)?.store;
      const households = store
        ? [...store.liveHouseholds()]
            .filter((h) => h.placeId === town)
            .sort((a, b) => a.id.localeCompare(b.id))
            .slice(0, NEIGHBORS)
        : [];
      let filled = 0;
      let watched = 0;
      let raised: { id: PersonId; source: string } | null = null;
      for (const h of households) {
        const first = store!.memberIdsOf(h)[0];
        if (!first) continue;
        const person = personOrFillIn(core, first as PersonId);
        if (!person) continue;
        filled += 1;
        for (const id of core.households.get(person.householdId)?.memberIds ??
          []) {
          const neighbor = core.people.get(id);
          const row = core.knowledgeByPerson.get(id)?.get(ADDRESS_FACT.event);
          if (!neighbor || !row) continue;
          watched += 1;
          expect(row.sourceId, where).toBe(eventId);
          if (ageOnDate(neighbor.birthDate, core.date) < P.votingAge) continue;
          const subjects = subjectsBetween(core, id, me, director);
          const address = subjects.find((row) => row.kind === "address");
          expect(
            address,
            `${where}: ${id} holds it and is not offered it`,
          ).toBeDefined();
          // How they learned it is cited with the address itself.
          expect(address!.facts.quote?.sourceRecordIds, where).toContain(
            row.sourceId,
          );
          if (subjects.some((row) => row.kind === "address-point")) {
            raised = { id, source: row.sourceId };
            break;
          }
        }
        if (raised) break;
      }
      if (!raised) {
        passed.push(
          `${where}: ${filled} counted households filled in, ${watched} watched, none with a point to raise`,
        );
        continue;
      }
      process.stdout.write(
        `address audience: ${where}; ${holders} of ${residents} full residents watched (share ${addressWatchedShare()}); neighbor ${raised.id} filled in on day 1 after ${filled} households raises the point, learned from ${raised.source}; passed over: ${passed.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(
      `No drawn place had a neighbor who watched the address and raises its point: ${passed.join("; ")}`,
    );
  },
);
