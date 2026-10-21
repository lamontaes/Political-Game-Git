/**
 * A retiree's death shrinks the funding that pays their group's awards, in
 * the world the owner plays: the bench world in places drawn from all 56 on a
 * seed nobody chose. The opening groups full retirees' Social Security and
 * pension awards behind one funding contract per payer and due date, and the
 * settlement checks that the funding equals the sum of the actual awards it
 * lists. When a listed retiree dies their award ends, so the funding drops
 * the award and its amount; otherwise the next due date throws "Outside
 * obligation refers to missing, inactive or unmatched recipient terms."
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { settleEstate } from "./estates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { drawPlace } from "../../scripts/core2-year/place";
import type { CoreState } from "./types";

const seed =
  process.env.RETIREMENT_GROUP_SEED || randomBytes(8).toString("hex");

describe(`a retiree's death (seed ${seed})`, () => {
  it("takes their award out of the group's funding, and the next due date settles", () => {
    const seen: string[] = [];
    for (let draw = 0; draw < 10; draw++) {
      const place = drawPlace(`${seed}:${draw}`, "retirement-group");
      const world = buildBenchWorld(`${seed}:${draw}`, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core as CoreState;
      const api = coreAPI(core);
      const groups = [...core.finance.contracts.values()].filter(
        (row) =>
          !row.endedAt &&
          (row.externalInflow?.incomeContractIds?.length ?? 0) >= 2 &&
          row.externalInflow!.incomeContractIds!.every((id) => {
            const child = core.finance.contracts.get(id);
            const person = child?.recipientIncome
              ? core.people.get(child.recipientIncome.personId)
              : undefined;
            return person?.alive === true;
          }),
      );
      seen.push(`${place.name}: ${groups.length} groups`);
      const group = groups[0];
      if (!group) continue;
      const ids = [...group.externalInflow!.incomeContractIds!];
      const dead = core.finance.contracts.get(ids[0]!)!;
      const personId = dead.recipientIncome!.personId;
      api.updatePerson(personId, { alive: false });
      api.emit({
        id: `test-death:${personId}`,
        date: core.date,
        kind: "life.death",
        personIds: [personId],
        placeId: core.people.get(personId)!.placeId,
        source: { tag: "SOURCED", citation: "test", asOf: core.date },
      });
      // What the health module does at a death: the estate is settled.
      settleEstate(api, personId, `test-death:${personId}`);
      expect(
        core.finance.contracts.get(dead.id)!.endedAt,
        dead.id,
      ).toBeDefined();
      const funding = core.finance.contracts.get(group.id)!;
      const rest = ids.slice(1);
      expect(funding.externalInflow!.incomeContractIds).toEqual(rest);
      expect(funding.amountMinor).toBe(
        rest.reduce(
          (sum, id) => sum + core.finance.contracts.get(id)!.amountMinor,
          0,
        ),
      );
      // The next due date settles with the survivors.
      advanceCore(core, addDays(makeIsoDate(funding.dueAt), 1));
      console.log(
        `retirement-group-death: ${place.name} (${place.key}), seed ${seed}:${draw}; ${personId} died, ${group.id} now funds ${rest.length} awards`,
      );
      return;
    }
    throw new Error(`no group of two full retirees in: ${seen.join("; ")}`);
  }, 1_800_000);
});
