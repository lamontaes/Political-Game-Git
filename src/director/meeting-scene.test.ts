import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { partiesHere } from "../core2/modules/parties";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { meetingFacts } from "./meeting-facts";

// A first meeting and a tie that grew each ask for something grounded in what
// the two share (owner, Nov 9: a purpose for every scene kind that lacks one;
// the golden path's "meet people"). The facts come from the records the world
// keeps: the employer and the job (jobs engine), the school (school engine),
// the party (parties engine) and the town a person lives in.
//
// A new hire at the player's employer is rare in a played year, so the cause
// of the first meeting is HAND-STAGED: the player and a second person are
// hired through the jobs engine's own writer (`startJob`, copying a real
// coworker's role as `hire` does), and the player's day is played with the
// clock (`advancePlayerV1`) so the director's own producer stages the scene.
// The becoming-friends cause is the relationship engine's own: time together
// until the tie turns. Everything after the cause is the director's.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 6;

it(`the shared facts come from the world's own records in drawn places (seed ${seed})`, () => {
  setBookkeeping(false);
  const found = new Set<string>();
  const lines: string[] = [];
  try {
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const place = drawPlace(seed, `meeting-facts:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      // Into the school year, so the school engine has attended rows.
      advanceCore(core, addDays(makeIsoDate(core.date), 40));
      const adults = [...core.people.values()]
        .filter(
          (row) =>
            row.alive && row.tier !== "husk" && row.id.startsWith("person_"),
        )
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, 400);
      const api = coreAPI(core);
      for (const a of adults)
        for (const b of adults) {
          if (a.id >= b.id) continue;
          const facts = meetingFacts(
            core,
            "becoming-friends",
            "cause",
            a.id,
            b.id,
          );
          for (const key of ["employer", "party", "schoolmate", "kids-school"])
            if (facts[key] && !found.has(key)) {
              found.add(key);
              // A fact is cited to the record it came from.
              const cited = facts[key]!.sourceRecordIds;
              expect(cited.length, `${where}: ${key}`).toBeGreaterThan(0);
              if (key === "employer")
                expect(
                  core.organizations.get(cited[0]!)?.name,
                  `${where}: ${key} cites the employer`,
                ).toBeTruthy();
              if (key === "party")
                expect(
                  partiesHere(api).some((row) => row.id === cited[0]),
                  `${where}: ${key} cites the party`,
                ).toBe(true);
              if (key === "kids-school") {
                expect(facts.child && facts.school, where).toBeTruthy();
                expect(
                  core.people.get(cited[1] as PersonId),
                  where,
                ).toBeTruthy();
              }
              if (key === "party")
                expect(facts.party!.text, where).toMatch(/Party$/);
              lines.push(
                `${where}: ${key} between ${a.id} and ${b.id} (${cited.join(", ")}) ${facts[key]!.text}`,
              );
            }
          if (found.size === 4) break;
        }
    }
    process.stdout.write(`MEETING FACTS\n${lines.join("\n")}\n`);
    for (const key of ["employer", "party", "schoolmate", "kids-school"])
      expect(
        found.has(key),
        `${key} found in no drawn place (seed ${seed}); ${lines.join("; ")}`,
      ).toBe(true);
    expect(
      meetingFacts(
        // A type that does not read them gets nothing.
        { people: new Map() } as never,
        "return",
        "cause",
        "a" as PersonId,
        "b" as PersonId,
      ),
    ).toEqual({});
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
