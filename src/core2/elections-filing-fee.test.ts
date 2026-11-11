/**
 * Filing pays the place's fee (pool item elections-filing-fee-paid). In drawn
 * places (replay with FILING_FEE_SEED) with the filing window open, an adult
 * who holds the fee files and their cash falls by exactly the fee, which goes
 * to the filing government's treasury through the money journal; an adult who
 * cannot pay is refused with the rule `filing-fee` and keeps their cash; a
 * contest whose law sets no fee takes nothing. The place and seed are in every
 * message; places are drawn until one of each case is found, up to a bound.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { advanceToFilingOpen } from "./gov-test-clock";
import {
  checkEligibility,
  fileCandidacy,
  openContests,
} from "./modules/elections";
import { coreAPI } from "./state";

const base = process.env.FILING_FEE_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 10;

it(`filing pays the fee, a candidate short of it is refused, and no fee posts nothing (seed ${base})`, () => {
  const seen = { paid: "", refused: "", free: "" };
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const seed = createHash("sha256")
      .update(`${base}:${attempt}`)
      .digest("hex");
    const place = drawPlace(seed, "filing-fee");
    const where = `${place.name} (${place.key}), seed ${seed}`;
    const was = setBookkeeping(false);
    try {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const { core } = world;
      const api = coreAPI(core);
      advanceToFilingOpen(core);
      const town = core.people.get(world.playerId as never)!.placeId;
      const adults = [...core.people.values()]
        .filter(
          (p) =>
            p.alive &&
            p.tier !== "husk" &&
            p.placeId === town &&
            Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >=
              30,
        )
        .sort((a, b) => a.id.localeCompare(b.id));
      const file = (personId: string, contestId: string) =>
        fileCandidacy(api, {
          personId,
          contestId,
          platform: [],
          party: null,
        });
      for (const contest of openContests(api)) {
        const rows = adults.map((person) => ({
          person,
          checks: checkEligibility(api, person.id, contest.id, null),
        }));
        const fee = rows
          .map((row) => row.checks.find((c) => c.rule === "filing-fee"))
          .find(Boolean);
        if (!fee) {
          const free = rows.find((row) => row.checks.every((c) => c.met));
          if (free && !seen.free) {
            const before = free.person.liquidMinor;
            const result = file(free.person.id, contest.id);
            expect(result.status, `${where}: ${contest.id}, no fee`).not.toBe(
              "refused",
            );
            expect(
              core.people.get(free.person.id)!.liquidMinor,
              `${where}: ${free.person.id} filing for ${contest.id}, which has no fee`,
            ).toBe(before);
            seen.free = `${where}: ${contest.id}, ${free.person.id}, cash unchanged at ${before}`;
          }
          continue;
        }
        const feeMinor = Number(fee.required.slice(1)) * 100;
        const poor = rows.find(
          (row) =>
            row.checks.every((c) => c.met || c.rule === "filing-fee") &&
            row.checks.some((c) => c.rule === "filing-fee" && !c.met),
        );
        if (poor && !seen.refused) {
          const before = poor.person.liquidMinor;
          const result = file(poor.person.id, contest.id);
          expect(
            result.status,
            `${where}: ${poor.person.id} short of ${fee.required}`,
          ).toBe("refused");
          if (result.status === "refused")
            expect(
              result.unmet.map((c) => c.rule),
              `${where}: ${poor.person.id}`,
            ).toContain("filing-fee");
          expect(core.people.get(poor.person.id)!.liquidMinor, where).toBe(
            before,
          );
          seen.refused = `${where}: ${contest.id}, ${poor.person.id} held $${Math.floor(before / 100)} against ${fee.required}, refused`;
        }
        const rich = rows.find(
          (row) =>
            row.checks.every((c) => c.met) &&
            row.person.liquidMinor >= feeMinor,
        );
        if (rich && !seen.paid) {
          const before = rich.person.liquidMinor;
          const result = file(rich.person.id, contest.id);
          expect(
            result.status,
            `${where}: ${rich.person.id} files for ${contest.id}`,
          ).not.toBe("refused");
          expect(
            before - core.people.get(rich.person.id)!.liquidMinor,
            `${where}: ${rich.person.id}'s cash fell by the fee ${fee.required} filing for ${contest.id}`,
          ).toBe(feeMinor);
          seen.paid = `${where}: ${contest.id}, ${rich.person.id} paid ${fee.required} (cash ${before} to ${core.people.get(rich.person.id)!.liquidMinor}), filing filing:${contest.id}:${rich.person.id}`;
        }
      }
      tried.push(
        `${where}: paid ${!!seen.paid}, refused ${!!seen.refused}, free ${!!seen.free}`,
      );
      if (seen.paid && seen.refused && seen.free) break;
    } finally {
      setBookkeeping(was);
    }
  }
  console.log(
    `filing-fee:\n  paid: ${seen.paid}\n  refused: ${seen.refused}\n  free: ${seen.free}`,
  );
  expect(
    Boolean(seen.paid && seen.refused && seen.free),
    `not every case was found in ${ATTEMPTS} drawn places: ${tried.join("; ")} (seed ${base})`,
  ).toBe(true);
}, 7_200_000);
