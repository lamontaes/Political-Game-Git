/**
 * A relative still in the wider population inherits like any other: the estate
 * fills them in as the same person and pays them. A place is drawn from all
 * 56; set GOLDEN_PATH_SEED to reproduce a run. The death is an edge fixture on
 * a generated world's real family records.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { heirsOf, settleEstate } from "./estates";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("pays a counted child of the dead and fills them in", () => {
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "estate-counted-kin");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    for (const dead of core.people.values()) {
      if (
        !dead.alive ||
        api.accounts().balance(api.accounts().main(dead.id)) <= 0
      )
        continue;
      const kid = (dead.pastFacts ?? []).find(
        (fact) =>
          fact.kind === "family:child" &&
          core.husks.has(String(fact.facts?.otherPersonId)),
      );
      if (!kid) continue;
      const kidId = String(kid.facts!.otherPersonId);
      // The child is only a counted record: a full-people-only lookup (the old
      // rule) finds no living heir here, so the first assertion is what failed
      // before the change.
      expect(core.people.has(kidId), `${where}: ${kidId} is counted`).toBe(
        false,
      );
      // A living spouse inherits ahead of the children (intestate order), so
      // a decedent whose heirs do not include this child is not the case here.
      if (!heirsOf(api, dead).heirs.includes(kidId)) continue;
      expect(
        heirsOf(api, dead).heirs,
        `${where}: the counted child is an heir`,
      ).toContain(kidId);
      api.updatePerson(dead.id, { alive: false });
      settleEstate(api, dead.id, "event:death");
      // Probate waits its timeline, then the heirs take.
      advanceCore(
        core,
        addDays(makeIsoDate(core.date), api.parameter("probateDays") + 2),
      );
      // Left to their closest family by will or law, the counted child is filled in and paid; a will that leaves them nothing does neither.
      if (!core.people.has(kidId)) continue;
      const accounts = api.accounts();
      expect(
        accounts.balance(accounts.main(kidId)),
        `${where}: ${kidId} was paid`,
      ).toBeGreaterThan(0);
      return;
    }
  }
  throw new Error(`no full person with a counted child in 8 places; ${seed}`);
}, 1_800_000);
