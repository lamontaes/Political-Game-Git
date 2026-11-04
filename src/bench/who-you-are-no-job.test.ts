import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { personCard } from "./card";
import { buildBenchWorld } from "./world";

// Who you are says why a grown player holds no job (path 10), from the
// household's records: who at home earns and where, or that nobody does.
// Draws go on until a 35-year-old player with no job appears.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("a grown player with no job is told why, from the household's records", () => {
  const birth = `${Number(gameStartDate().slice(0, 4)) - 35}-06-15`;
  for (let draw = 0; draw < 12; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "who-you-are-no-job");
    const where = `${place.name}, seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
      playerBirthDate: birth,
    });
    const card = personCard(core, playerId!);
    // A grown player is at no school now, though they went to some
    // (Confirmer, Nov 4: a 39-year-old's plate named their old school).
    expect(card.schoolNow, `${where}: a school at 35`).toBeNull();
    if (card.job) {
      expect(card.noJob, `${where}: a job and a reason`).toBeNull();
      continue;
    }
    expect(card.noJob, `${where}: no reason given`).not.toBeNull();
    const why = card.noJob!;
    const player = core.people.get(playerId!)!;
    const home = core.households.get(player.householdId)!;
    expect(why.recordIds[0], where).toBe(home.id);
    const earners = home.memberIds.filter(
      (id) =>
        id !== player.id &&
        core.people.get(id)?.alive &&
        core.people.get(id)?.jobId,
    );
    if (earners.length) {
      // The earner named is one of the home's own, with their job's employer.
      const [, earnerId, jobId, employerId] = why.recordIds;
      expect(earners, where).toContain(earnerId);
      const earner = core.people.get(earnerId!)!;
      expect(earner.jobId, where).toBe(jobId);
      const employer = core.organizations.get(employerId!)!;
      expect(why.text, where).toContain(
        `${earner.givenName} ${earner.familyName}`,
      );
      expect(why.text, where).toContain(employer.name);
    } else expect(why.recordIds, where).toEqual([home.id]);
    console.log(`${where}: ${why.text} (${why.recordIds.join(", ")})`);
    return;
  }
  throw new Error(`no 35-year-old without a job in twelve draws, seed ${seed}`);
}, 1_800_000);
