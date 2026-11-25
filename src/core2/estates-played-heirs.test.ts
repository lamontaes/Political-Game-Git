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

// The chain where an heir dies during probate is checked here by will, the
// case drawn places hold. By intestacy that chain is rare among full people
// (the CTO, #9747 06:30Z, after twenty drawn places held none), so it is
// checked at the rule level on constructed records in
// estates-heirs-fixed-at-death.test.ts ("pays a child who dies during
// probate's share to that child's own child"); here an intestate estate the
// world holds is checked to settle and pay its heirs as the law orders.
describe("an estate keeps its heirs through probate (played world)", () => {
  for (const by of ["will"] as const)
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
        // An estate the debts take whole never reaches probate, and the will
        // is the one the decedent held on the day they died (the probate
        // row's): either way, the next candidate in the same world, named.
        let found: { dead: string; heir: string } | undefined;
        for (const row of candidates) {
          if (!core.people.get(row.dead)?.alive) continue;
          api.updatePerson(row.dead, { alive: false });
          settleEstate(api, row.dead, "event:death:proof");
          const kept = api
            .moduleState(ESTATES_MODULE_ID)
            .table("probate")
            .get(row.dead) as unknown as { will?: unknown } | undefined;
          if (!kept) {
            passed.push(
              `${place.name}: ${row.dead}'s estate left nothing for probate after debts`,
            );
            continue;
          }
          if (!!kept.will !== (by === "will")) {
            passed.push(
              `${place.name}: ${row.dead} ${kept.will ? "held a will" : "held no will"} on the day of death`,
            );
            continue;
          }
          found = row;
          break;
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
        // Probate closes after its wait. An estate whose last owner's house
        // is still for sale pays the heirs its cash then and keeps the
        // probate row open (`partial`) for the house's proceeds; the court's
        // closing record (`estate.settled`) comes when the house sells
        // (estates.ts). Either pays the heirs: wait for one, a month at a
        // time, up to two years past the wait.
        advanceCore(
          core,
          addDays(makeIsoDate(core.date), api.parameter("probateDays") + 2),
        );
        const settledFor = () =>
          heard.find((e) => e.facts?.decedentId === dead);
        // The probate row a cash-only pass leaves open for the house's sale.
        const cashPaid = () => {
          const row = api
            .moduleState(ESTATES_MODULE_ID)
            .table("probate")
            .get(dead) as unknown as
            { partial?: boolean; will?: unknown } | undefined;
          return row?.partial ? row : undefined;
        };
        for (
          let month = 0;
          month < 24 && !settledFor() && !cashPaid();
          month += 1
        )
          advanceCore(core, addDays(makeIsoDate(core.date), 30));
        const settled = settledFor();
        const partial = cashPaid();
        expect(
          settled ?? partial,
          `${where}: probate closed, or paid the cash with the house for sale`,
        ).toBeDefined();
        if (settled) expect(settled.facts!.by).toBe(by);
        else
          expect(!!partial!.will, `${where}: paid by ${by}`).toBe(
            by === "will",
          );
        const after = grandkids.map((k) => core.people.get(k)!.liquidMinor);
        expect(
          after.some((v, i) => v > before[i]!),
          `${where}: a child of ${heir} was paid`,
        ).toBe(true);
        process.stdout.write(
          `ESTATE HEIRS by ${by}: ${where}, ${dead} to ${heir}, ${settled ? "settled" : "cash paid, house for sale"}; passed over: ${passed.join("; ") || "none"}\n`,
        );
        return;
      }
      throw new Error(
        `No drawn place held the case, seed ${seed}: ${passed.join("; ")}`,
      );
    }, 2_700_000); // Probate's 270 played days, and a house sale's wait, are the game's own time (about 170 s in a played town), after the draws.

  it(`an intestate estate the world holds settles, and its living heirs are paid as the law orders, seed ${seed}`, () => {
    const passed: string[] = [];
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const place = drawPlace(seed, `estates-played-heirs:law:${draw}`);
      const where = `${place.name} (${place.key}), seed ${seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const heard: CoreEventInput[] = [];
      registerModule(core, {
        id: "test:estate-reader",
        eventKinds: ["estate.settled"],
        onEvent: (_api, event) => {
          heard.push(event);
        },
      });
      // An adult with something to leave, kin the law names, no home to
      // sell, and no will on the day of death (the probate row's).
      let found: { dead: string; heirs: string[] } | undefined;
      for (const p of [...core.people.values()]
        .filter((q) => q.alive && q.liquidMinor > 100_00)
        .sort((a, b) => a.id.localeCompare(b.id))) {
        if (!core.people.get(p.id)?.alive) continue;
        const heirs = heirsOf(api, p).heirs.filter(
          (h) => core.people.get(h)?.alive,
        );
        if (!heirs.length) continue;
        const household = core.households.get(p.householdId);
        const others = household?.memberIds.some(
          (m) => m !== p.id && core.people.get(m)?.alive,
        );
        const dwelling = core.modules.has("housing")
          ? (api
              .moduleState("housing")
              .table("dwellings")
              .get(`dwelling:${p.householdId}`) as unknown as
              { tenure?: string } | undefined)
          : undefined;
        if (!others && dwelling?.tenure === "own") continue;
        api.updatePerson(p.id, { alive: false });
        settleEstate(api, p.id, "event:death:proof");
        const kept = api
          .moduleState(ESTATES_MODULE_ID)
          .table("probate")
          .get(p.id) as unknown as
          { will?: unknown; heirs: string[] } | undefined;
        if (!kept || kept.will) {
          passed.push(
            `${place.name}: ${p.id} ${kept ? "held a will" : "left nothing for probate after debts"}`,
          );
          continue;
        }
        found = { dead: p.id, heirs: kept.heirs };
        break;
      }
      if (!found) {
        passed.push(
          `${place.name} (${place.key}): no intestate estate over $100 with living heirs`,
        );
        continue;
      }
      advanceCore(
        core,
        addDays(makeIsoDate(core.date), api.parameter("probateDays") + 2),
      );
      const settled = heard.find((e) => e.facts?.decedentId === found!.dead);
      expect(settled, `${where}: probate closed`).toBeDefined();
      expect(settled!.facts!.by).toBe("intestacy");
      // The settlement's own record: every heir the law named on the day of
      // death who is still living was paid a share of it.
      const paid = new Map(
        String(settled!.facts!.heirs ?? "")
          .split(" ")
          .filter(Boolean)
          .map((row) => {
            const [id, amount] = row.split("=");
            return [id!, Number(amount)] as const;
          }),
      );
      for (const h of found.heirs)
        if (core.people.get(h)?.alive)
          expect(
            paid.get(h) ?? 0,
            `${where}: heir ${h} of ${found.dead} was paid`,
          ).toBeGreaterThan(0);
      process.stdout.write(
        `ESTATE HEIRS by law: ${where}, ${found.dead} to ${found.heirs.join(", ")}; passed over: ${passed.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(
      `No drawn place held an intestate estate, seed ${seed}: ${passed.join("; ")}`,
    );
  }, 1_500_000);
});
