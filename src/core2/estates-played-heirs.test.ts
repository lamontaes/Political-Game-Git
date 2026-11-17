import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { ESTATES_MODULE_ID, heirsOf, settleEstate, willOf } from "./estates";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI, registerModule } from "./state";
import type { CoreEventInput } from "./types";

// Played-world proof: an estate whose heir dies while probate waits still
// reaches that heir's own family, in a world built the way the game builds it.
// The place is drawn from all 56; a place with no such estate is passed over
// and named (CTO, #9747 04:26Z: off its pin at Dennis, MA).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DRAWS = 8;

describe("an estate keeps its heirs through probate (played world)", () => {
  for (const by of ["intestacy", "will"] as const)
    it(`by ${by}, a dead heir's share reaches the heir's own children, seed ${seed}`, () => {
      const passed: string[] = [];
      for (let draw = 0; draw < DRAWS; draw += 1) {
        const place = drawPlace(seed, `estates-played-heirs:${by}:${draw}`);
        const where = `${place.name} (${place.key}), seed ${seed}`;
        const { core } = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        const api = coreAPI(core);
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        const kidsOf = (id: string) =>
          [...(core.people.get(id)?.pastFacts ?? [])]
            .filter((f) => f.kind === "family:child")
            .map((f) => String(f.facts?.otherPersonId))
            .filter((k) => core.people.get(k)?.alive);
        const candidates = [...core.people.values()]
          .filter((p) => p.alive && p.liquidMinor > 100_00)
          .sort((a, b) => a.id.localeCompare(b.id))
          .flatMap((p) => {
            // A will names its beneficiaries (read on the day of death); with none, the law names the heirs.
            const will = willOf(api, p);
            const named =
              by === "will"
                ? (will ?? []).map((r) => r.id)
                : will
                  ? []
                  : heirsOf(api, p).heirs;
            // By the law, a share passes down to an heir's own children
            // only in the descendants' class (Uniform Probate Code §2-103,
            // §2-106): a dead parent's share goes to the surviving parent.
            // So the heir is the decedent's own child there.
            // A will's share passes down only to a beneficiary in the
            // descendants' class too (§2-603), so in both cases the heir is
            // the decedent's own child (CTO, #9747 04:26Z).
            return named
              .filter((h) => kidsOf(h).length > 0 && kidsOf(p.id).includes(h))
              .map((h) => ({ dead: p.id, heir: h }));
          });
        const heard: CoreEventInput[] = [];
        registerModule(core, {
          id: "test:estate-reader",
          eventKinds: ["estate.settled"],
          onEvent: (_api, event) => {
            heard.push(event);
          },
        });
        // An estate the debts take whole never reaches probate: the next
        // candidate in the same world, named.
        let found: { dead: string; heir: string } | undefined;
        for (const row of candidates) {
          if (!core.people.get(row.dead)?.alive) continue;
          api.updatePerson(row.dead, { alive: false });
          settleEstate(api, row.dead, "event:death:proof");
          if (
            api.moduleState(ESTATES_MODULE_ID).table("probate").get(row.dead)
          ) {
            found = row;
            break;
          }
          passed.push(
            `${place.name}: ${row.dead}'s estate left nothing for probate after debts`,
          );
        }
        if (!found) {
          passed.push(
            `${place.name} (${place.key}): no estate over $100 whose ${by === "will" ? "beneficiary" : "heir among the children"} has a living child`,
          );
          continue;
        }
        const { dead, heir } = found;
        const grandkids = kidsOf(heir);
        const before = grandkids.map((k) => core.people.get(k)!.liquidMinor);
        api.updatePerson(heir, { alive: false });
        // Probate closes after its wait, or later while the estate's house
        // is still for sale (estates.ts): wait for the settlement itself, a
        // month at a time, up to two years past the wait.
        advanceCore(
          core,
          addDays(makeIsoDate(core.date), api.parameter("probateDays") + 2),
        );
        const settledFor = () =>
          heard.find((e) => e.facts?.decedentId === dead);
        for (let month = 0; month < 24 && !settledFor(); month += 1)
          advanceCore(core, addDays(makeIsoDate(core.date), 30));
        const settled = settledFor();
        expect(settled, `${where}: probate closed`).toBeDefined();
        expect(settled!.facts!.by).toBe(by);
        const after = grandkids.map((k) => core.people.get(k)!.liquidMinor);
        expect(
          after.some((v, i) => v > before[i]!),
          `${where}: a child of ${heir} was paid`,
        ).toBe(true);
        process.stdout.write(
          `ESTATE HEIRS by ${by}: ${where}, ${dead} to ${heir}; passed over: ${passed.join("; ") || "none"}\n`,
        );
        return;
      }
      throw new Error(
        `No drawn place held the case, seed ${seed}: ${passed.join("; ")}`,
      );
    }, 1_500_000); // Probate's 270 played days, and a house sale's wait, are the game's own time (about 170 s in a played town), after the draws.
});
