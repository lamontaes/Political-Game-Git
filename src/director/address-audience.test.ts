/**
 * People outside the player's house hold the President's address on record
 * (pool item director-address-reaches-beyond-the-house; pattern A47, "The
 * first word on the address"). In places drawn from all 56, on the opening:
 *
 * - town residents outside the player's household hold the address, sourced
 *   to the address's own record (they watched it), learned the day it aired,
 *   and the town's share of watchers sits near the sourced audience share;
 * - a town resident met (filled in from the counts) the next morning is read
 *   by the same rule, or has been told since, and one who holds it is offered
 *   the address and its point in a talk with the player, citing how they
 *   learned it;
 * - on day 1 a coworker (the work engine's jobs at the player's employer, and
 *   the coworkers met at work) or a neighbor of a working-age player holds
 *   it, by watching it or being told by someone other than the player, and on
 *   day 16, after the paper's story has run, everyone who watched it still
 *   cites the address itself.
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
import { coworkersToMeet } from "../core2/modules/jobs";
import { coreAPI, personOrFillIn } from "../core2/state";
import type { PersonId } from "../core2/types";
import { addressWatchedShare } from "./address-audience";
import { subjectsBetween } from "./conversation";
import { ADDRESS_FACT } from "./opening-facts";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const DRAWS = 6;
/** Counted households of the town filled in, at most, looking for a resident met the next day who watched. */
const NEIGHBORS = 60;
/** How far the town's share of watchers may sit from the sourced share: one household's worth in a town of a hundred or so full residents. */
const SHARE_SLACK = 0.06;

it(
  `a town resident outside the player's house holds the address, with its source, and one met the next day raises it (seed ${seed})`,
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
      const known = [...player.knownIds].filter(
        (id) =>
          core.people.get(id as PersonId)?.householdId !== player.householdId,
      );
      const knownHolders = known.filter((id) =>
        core.knowledgeByPerson.get(id)?.has(ADDRESS_FACT.event),
      ).length;
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
          // One who watched it cites the address's own record; anyone else
          // was told at a contact since (a relationship the news engine
          // passed it on).
          const sawIt = core.knowledgeByPerson
            .get(id)
            ?.has(`event:${eventId}:experienced`);
          if (sawIt)
            expect(row.sourceId, `${where}: ${id} watched it`).toBe(eventId);
          else
            expect(
              core.relationships.has(row.sourceId),
              `${where}: ${id} learned it from ${row.sourceId}`,
            ).toBe(true);
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
        `address audience: ${where}; ${holders} of ${residents} full residents watched (share ${addressWatchedShare()}); ${knownHolders} of the ${known.length} people the player knows outside the house hold it; resident ${raised.id} filled in on day 1 after ${filled} households raises the point, learned from ${raised.source}; passed over: ${passed.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(
      `No drawn place had a neighbor who watched the address and raises its point: ${passed.join("; ")}`,
    );
  },
);

/** Days played before the paper's story has run in most towns: a watcher's source must still be the address itself then. */
const PRINTED_BY = 16;
/** The player's age for the coworker case: the middle of working life. */
const WORKING_AGE = 40;

it(
  `on day 1 a coworker or neighbor of the player holds the address, by watching or being told, and keeps having watched it once the paper prints it (seed ${seed})`,
  { timeout: 900_000 },
  () => {
    setBookkeeping(false);
    const passed: string[] = [];
    for (let draw = 0; draw < DRAWS * 2; draw += 1) {
      const drawn = draw === 0 ? `${seed}:near` : `${seed}:near:${draw}`;
      const place = drawPlace(drawn, "address-audience-near");
      const where = `${place.name} (${place.key}), seed ${drawn}`;
      // The case is a player who goes to work the next morning: an adult of
      // working age (an 18-year-old has no job and knows no one in town in
      // most draws), born nearest the age the creator would pick.
      const opening = gameStartDate();
      const { core, director, playerId } = buildBenchWorld(
        place.seed,
        opening,
        {
          twoLevel: true,
          placeKey: place.key,
          playerBirthDate: `${Number(opening.slice(0, 4)) - WORKING_AGE}${opening.slice(4)}`,
        },
      );
      const me = playerId as PersonId;
      const mine = core.knowledgeByPerson.get(me)?.get(ADDRESS_FACT.event);
      if (!mine) {
        passed.push(`${where}: no address recorded`);
        continue;
      }
      const eventId = mine.value;
      const start = makeIsoDate(core.date);
      const watchers = [...core.knowledgeByPerson]
        .filter(
          ([, known]) => known.get(ADDRESS_FACT.event)?.sourceId === eventId,
        )
        .map(([id]) => id);
      advanceCore(core, addDays(start, P.one));
      const player = core.people.get(me)!;
      // Who works with the player (the work engine's jobs at the same
      // employer) and who lives near them (the people they know in town
      // outside their house).
      const employer = player.jobId
        ? core.jobs.get(player.jobId)?.organizationId
        : undefined;
      const ties = new Map<PersonId, string>();
      // Going to work, the player meets the coworkers the workplace lets one
      // know, filled in from the employer's books (the work engine's list).
      const job = player.jobId ? core.jobs.get(player.jobId) : undefined;
      if (job)
        for (const id of coworkersToMeet(coreAPI(core), job, me))
          if (personOrFillIn(core, id as PersonId))
            ties.set(
              id as PersonId,
              `coworker at ${job.organizationId}, met at work`,
            );
      if (employer)
        for (const job of core.jobs.values())
          if (
            job.organizationId === employer &&
            job.personId !== me &&
            job.endsAt === undefined &&
            core.people.has(job.personId)
          )
            ties.set(job.personId, `coworker at ${employer}`);
      for (const id of player.knownIds) {
        const other = core.people.get(id as PersonId);
        if (
          other?.alive &&
          other.placeId === player.placeId &&
          other.householdId !== player.householdId &&
          !ties.has(other.id)
        )
          ties.set(other.id, "neighbor (known, in town, another household)");
      }
      // Whoever it came from first, following each telling back to someone
      // who watched it: one it reached from the player's own house has
      // nothing to tell the player, so the case is a chain that starts with
      // a watcher outside it.
      const origin = (id: PersonId): PersonId | null => {
        const seen = new Set<PersonId>();
        for (let at: PersonId | undefined = id; at && !seen.has(at);) {
          seen.add(at);
          const source = core.knowledgeByPerson
            .get(at)
            ?.get(ADDRESS_FACT.event)?.sourceId;
          if (source === eventId) return at;
          const tie = source ? core.relationships.get(source) : undefined;
          if (!tie) return null;
          at = tie.actorId === at ? tie.otherId : tie.actorId;
        }
        return null;
      };
      const fromOutside = (id: PersonId) => {
        const first = origin(id);
        return (
          !!first && core.people.get(first)?.householdId !== player.householdId
        );
      };
      const holders = [...ties].filter(([id]) =>
        core.knowledgeByPerson.get(id)?.has(ADDRESS_FACT.event),
      );
      const holder = holders.find(([id]) => fromOutside(id));
      if (!holder) {
        passed.push(
          `${where}: none of ${ties.size} coworkers and neighbors holds it on day 1 from a watcher outside the player's house (${holders.length} hold it from the player's house)`,
        );
        continue;
      }
      const [holderId, tie] = holder;
      const row = core.knowledgeByPerson
        .get(holderId)!
        .get(ADDRESS_FACT.event)!;
      // How they learned it: the address itself (watched), a talk at a contact
      // (the relationship the news engine passed it on), or a printed story.
      const how =
        row.sourceId === eventId
          ? "watched"
          : core.relationships.has(row.sourceId)
            ? "told"
            : /^(printed|news\.read):/.test(row.sourceId)
              ? "story"
              : "unknown";
      expect(
        how,
        `${where}: ${holderId} learned it from ${row.sourceId}`,
      ).not.toBe("unknown");
      if (
        ageOnDate(core.people.get(holderId)!.birthDate, core.date) >=
        P.votingAge
      )
        expect(
          subjectsBetween(core, holderId, me, director).some(
            (subject) => subject.kind === "address",
          ),
          `${where}: ${holderId} holds it and is not offered it`,
        ).toBe(true);
      // The paper's story later does not replace having watched it.
      advanceCore(core, addDays(start, PRINTED_BY));
      const replaced = watchers.filter(
        (id) =>
          core.knowledgeByPerson.get(id)?.get(ADDRESS_FACT.event)?.sourceId !==
            eventId && core.people.get(id as PersonId)?.alive,
      );
      const printed = [...core.knowledgeByPerson.values()].filter((known) =>
        /^(printed|news\.read):/.test(
          known.get(ADDRESS_FACT.event)?.sourceId ?? "",
        ),
      ).length;
      expect(
        replaced.map(
          (id) =>
            `${id}: ${core.knowledgeByPerson.get(id)?.get(ADDRESS_FACT.event)?.sourceId}`,
        ),
        `${where}: watchers whose source was replaced (passed over: ${passed.join("; ")})`,
      ).toEqual([]);
      const contact = core.relationships.get(row.sourceId);
      process.stdout.write(
        `address near the player: ${where}; ${holderId}, ${tie}, holds it on day 1, ${how}, from ${row.sourceId}${contact ? ` (a ${contact.kind} tie, last together ${contact.lastContactDate})` : ""}, first watched by ${origin(holderId)} (the player is ${me}); on day ${PRINTED_BY} all ${watchers.length} watchers still cite ${eventId} and ${printed} people cite a printed story; passed over: ${passed.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(
      `No drawn place had a coworker or neighbor of the player holding the address on day 1: ${passed.join("; ")}`,
    );
  },
);
