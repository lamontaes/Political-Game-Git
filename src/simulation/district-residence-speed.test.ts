import { describe, expect, it } from "vitest";
import { districtIdentityCatalog } from "../districts/catalog";
import {
  bindingFromIdentity,
  districtIdentityByRecordId,
} from "../districts/query";
import { canonicalJson } from "./canonical-json";
import { addDays } from "./dates";
import { createScenarioWorld, LEXINGTON_DEMO_CONTEXT } from "./demo";
import {
  districtResidenceSince,
  establishDistrictResidence,
} from "./district-residence";
import type { DistrictSeatBinding, EntityId, IsoDate, World } from "./types";

// Authored fixture memberships exercise record mechanics, not legal eligibility.
for (const [name, firstId, secondId] of [
  ["Kentucky", "state-lower:21001", "state-lower:21002"],
  ["Alaska", "state-lower:02001", "state-lower:02002"],
] as const) {
  describe(`district-residence snapshots in the ${name} fixture`, () => {
    const base = createScenarioWorld(
      `district-copy:${name}`,
      LEXINGTON_DEMO_CONTEXT,
    );
    const people = base.personOrder.filter(
      (id) => base.people[id]!.birthDate < addDays(base.currentDate, -30),
    );
    const binding = (id: string) =>
      bindingFromIdentity(
        districtIdentityByRecordId(districtIdentityCatalog(), id)!,
      );
    const firstBinding = binding(firstId);
    const secondBinding = binding(secondId);
    const started = addDays(base.currentDate, -10);
    const changed = addDays(base.currentDate, -3);
    const input = (
      personId: EntityId,
      seat: DistrictSeatBinding,
      since: IsoDate,
    ) => ({
      personId,
      binding: seat,
      startedOn: since,
      provenance: {
        method: "authored" as const,
        sourceEventId: null,
        note: "Synthetic record-mechanics fixture.",
      },
    });
    const recorded = (
      world: World,
      personId: EntityId,
      seat: DistrictSeatBinding,
      since: IsoDate,
    ) => {
      const result = establishDistrictResidence(
        world,
        input(personId, seat, since),
      );
      if (result.kind === "refused") throw new Error(result.reason);
      return result;
    };

    it("preserves cached old queries and source records when another person appends", () => {
      expect(people.length).toBeGreaterThanOrEqual(2);
      const first = recorded(base, people[0]!, firstBinding, started);
      expect(
        districtResidenceSince(
          first.world,
          people[0]!,
          firstBinding,
          base.currentDate,
        ),
      ).toBe(started);
      const source = canonicalJson(first.world);
      const second = recorded(first.world, people[1]!, firstBinding, changed);
      expect(
        second.world.history.districtResidenceIntervals!.slice(0, -1),
      ).toEqual(first.world.history.districtResidenceIntervals);
      expect(second.world.history.districtResidenceIntervals!.at(-1)).toBe(
        second.interval,
      );
      expect(
        districtResidenceSince(
          second.world,
          people[0]!,
          firstBinding,
          base.currentDate,
        ),
      ).toBe(started);
      expect(
        districtResidenceSince(
          second.world,
          people[1]!,
          firstBinding,
          base.currentDate,
        ),
      ).toBe(changed);
      expect(
        districtResidenceSince(
          first.world,
          people[1]!,
          firstBinding,
          base.currentDate,
        ),
      ).toBeNull();
      expect(canonicalJson(first.world)).toBe(source);
    });

    it("closes and replaces one person's interval without changing cached snapshots or a fork", () => {
      const first = recorded(base, people[0]!, firstBinding, started);
      expect(
        districtResidenceSince(
          first.world,
          people[0]!,
          firstBinding,
          base.currentDate,
        ),
      ).toBe(started);
      const source = canonicalJson(first.world);
      const replaced = recorded(
        first.world,
        people[0]!,
        secondBinding,
        changed,
      );
      const other = recorded(first.world, people[1]!, firstBinding, changed);
      expect(replaced.world.history.districtResidenceIntervals![0]).toEqual({
        ...first.interval,
        endedOn: changed,
      });
      expect(replaced.world.history.districtResidenceIntervals![0]!.id).toBe(
        first.interval.id,
      );
      expect(first.interval.endedOn).toBeNull();
      expect(
        districtResidenceSince(
          replaced.world,
          people[0]!,
          firstBinding,
          addDays(changed, -1),
        ),
      ).toBe(started);
      expect(
        districtResidenceSince(
          replaced.world,
          people[0]!,
          firstBinding,
          changed,
        ),
      ).toBeNull();
      expect(
        districtResidenceSince(
          replaced.world,
          people[0]!,
          secondBinding,
          changed,
        ),
      ).toBe(changed);
      expect(
        districtResidenceSince(
          other.world,
          people[0]!,
          firstBinding,
          base.currentDate,
        ),
      ).toBe(started);
      expect(canonicalJson(first.world)).toBe(source);
    });

    it("keeps same-district and backward-replacement refusals unchanged", () => {
      const first = recorded(base, people[0]!, firstBinding, started);
      const duplicate = establishDistrictResidence(
        first.world,
        input(people[0]!, firstBinding, changed),
      );
      expect(duplicate).toEqual({
        kind: "refused",
        reason:
          "This character already has an open residence interval in that district.",
        world: first.world,
      });
      const backwards = establishDistrictResidence(
        first.world,
        input(people[0]!, secondBinding, addDays(started, -1)),
      );
      expect(backwards).toEqual({
        kind: "refused",
        reason:
          "A later district residence cannot start before the still-open interval it would replace.",
        world: first.world,
      });
    });

    it("refuses an existing closed stable key without rewriting the source", () => {
      const first = recorded(base, people[0]!, firstBinding, started);
      const closed = {
        ...first.world,
        history: {
          ...first.world.history,
          districtResidenceIntervals: [{ ...first.interval, endedOn: changed }],
        },
      };
      const source = canonicalJson(closed);
      expect(
        districtResidenceSince(
          closed,
          people[0]!,
          firstBinding,
          base.currentDate,
        ),
      ).toBeNull();
      expect(
        establishDistrictResidence(
          closed,
          input(people[0]!, firstBinding, started),
        ),
      ).toEqual({
        kind: "refused",
        reason: "That district-residence interval is already recorded.",
        world: closed,
      });
      expect(canonicalJson(closed)).toBe(source);
      expect(
        districtResidenceSince(
          first.world,
          people[0]!,
          firstBinding,
          base.currentDate,
        ),
      ).toBe(started);
    });
  });
}
