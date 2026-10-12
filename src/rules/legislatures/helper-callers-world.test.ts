import { describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { stateCandidacyPack } from "../../simulation/candidacy-packs";
import {
  stateLegislators,
  stateLegislatureEstablished,
} from "../../simulation/nationwide-world/state-legislature-opening";
import { seatedStateLegislators as nativeSeated } from "../../simulation/governing/joint-assembly";
import { seatedStateLegislators } from "./seated-officeholders";
import * as life from "../../simulation/life-queries";
import {
  activeResourceObligationsForOwner,
  currentResourceCutoff,
} from "../../simulation/resource-queries";
import { relationshipLeverage as nativeLeverage } from "../../simulation/relationship-leverage";
import { relationshipLeverage } from "./relationship-leverage";
import { nextIntakeDate } from "./procedure-calendar";
import {
  applyCongressLawmaking,
  CONGRESS_INTAKE_TRANSITION,
} from "../../simulation/governing/congress-lawmaking";
import { addDays, makeIsoDate } from "../../simulation/dates";
import { drawLegislativeStartingProcedures } from "../../simulation/legislative-starting-procedures";
import { legislatureForState } from "../../simulation/legislature-game-profile";
import { rulePackById } from "../../simulation/legislature-rule-packs";
import * as statute from "../../simulation/governing/statute-effective-date";
import { medianReadCutoff } from "./session-cutoff";
// Private constants travel with their owner. The median is observed through
// the unchanged snapshot builder with an explicit missing-source-table control.
describe("legislatures: calendar, seating and dependence caller closure", () => {
  it.each(Object.keys(STATES))(
    "matches raw generated facts in %s",
    (place) => {
      let world = smallWorld({
        place: `US-${place}`,
        seed: `rules2-helper-callers:${place}`,
        date: "2026-01-01",
        offices: ["congress", "state-legislature"],
        household: true,
      }).world;
      const pack = stateCandidacyPack(`US-${place}`);
      expect(
        seatedStateLegislators(
          {
            packs: new Map(pack ? [[`US-${place}`, pack]] : []),
            establishedPackIds: new Set(
              pack && stateLegislatureEstablished(world, pack.packId)
                ? [pack.packId]
                : [],
            ),
            membersByPack: new Map(
              pack ? [[pack.packId, stateLegislators(world, pack.packId)]] : [],
            ),
          },
          place,
        ),
      ).toEqual(nativeSeated(world, place));
      const ids = world.personOrder.slice(0, 3),
        lc = life.currentLifeCutoff(world),
        rc = currentResourceCutoff(world);
      const facts = {
        households: new Map(
          ids.map((id) => [id, life.householdMembershipsAt(world, id, lc)]),
        ),
        work: new Map(
          ids.map((id) => [id, life.activeWorkRelationshipsAt(world, id, lc)]),
        ),
        care: new Map(
          ids.map((id) => [
            id,
            life.activeCareResponsibilitiesAt(world, id, lc),
          ]),
        ),
        groups: new Map(
          ids.map((id) => [
            id,
            life.activeOrganizationParticipationsAt(world, id, lc),
          ]),
        ),
        obligations: new Map(
          ids.map((id) => [
            id,
            activeResourceObligationsForOwner(
              world,
              { kind: "person", personId: id },
              rc,
            ),
          ]),
        ),
        flows: world.history.resourceFlows,
      };
      for (const first of ids)
        for (const second of ids)
          expect(relationshipLeverage(facts, first, second)).toEqual(
            nativeLeverage(world, first, second),
          );
      world = { ...world, control: { kind: "observer" } };
      for (const date of [
        "2026-01-01",
        "2026-02-28",
        "2026-11-30",
        "2026-12-31",
        "2028-02-29",
      ]) {
        const currentDate = makeIsoDate(date),
          at = {
            ...world,
            currentDate,
            currentMoment: { ...world.currentMoment, date: currentDate },
          };
        // The first invocation schedules the native opening intake. The second
        // reaches private nextIntakeDate because that opening receipt now exists.
        const opened = applyCongressLawmaking(addDays(currentDate, -1), at);
        const after = applyCongressLawmaking(addDays(currentDate, -1), opened);
        expect(
          after.history.futureDueItems
            .filter((row) => row.transitionKey === CONGRESS_INTAKE_TRANSITION)
            .some((row) => row.dueAt === nextIntakeDate(currentDate)),
        ).toBe(true);
        expect(applyCongressLawmaking(addDays(currentDate, -1), after)).toEqual(
          after,
        );
      }
      const packs = Object.keys(STATES).flatMap((key) => {
        const p = legislatureForState(`US-${key}`);
        return p && key !== "DC" ? [rulePackById(p.packId)] : [];
      });
      const source = vi.spyOn(statute, "stateSessionEnds").mockReturnValue([]);
      try {
        const snapshot = drawLegislativeStartingProcedures(world);
        for (const entry of Object.values(snapshot))
          if (
            !legislatureForState(entry.jurisdictionKey)!.session
              .regularSessionLatestAdjournment
          )
            expect(entry.regularSessionCutoff).toEqual(medianReadCutoff(packs));
      } finally {
        source.mockRestore();
      }
    },
    30000,
  );
});
