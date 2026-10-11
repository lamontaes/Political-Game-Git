import { afterEach, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { currentFederalTenure } from "../../simulation/federal-tenures";
import { currentPresidentOf } from "../../simulation/crisis/offices";
import { currentStateExecutiveHolders } from "../../simulation/nationwide-world/state-executives";
import { recordPersonDeath } from "../../simulation/vitality";
import { vicePresidentNominationHandler } from "../../simulation/governing/office-continuity";
import * as appointments from "../../simulation/patronage/appointments";
import { createStableId } from "../../simulation/ids";
import { officeAgeQualification } from "./continuity";

// Observe the admission predicate at the decision boundary; no eligibility read is mocked.
afterEach(() => vi.restoreAllMocks());
it.each(Object.keys(STATES))(
  "private continuity age through the nomination caller in %s",
  (place) => {
    const base = smallWorld({
      place,
      offices: ["congress"],
      seed: "rules2-sendback-age:" + place,
    });
    const vice = currentFederalTenure(base.world, "us-vice-president")!;
    const world = recordPersonDeath(base.world, {
      stableKey: "rules2:vice-death",
      personId: vice.personId,
      diedAt: base.world.currentDate,
      causeKey: "cause:external-fixture",
      sourceEntityIds: [base.world.id],
      summary: "Age admission control.",
      provenance: {
        kind: "authored",
        note: "Public vacancy producer control.",
      },
    });
    const president = currentPresidentOf(world)!;
    const governors = new Set(
      currentStateExecutiveHolders(world).map((row) => row.personId),
    );
    const dead = new Set(world.history.personDeaths.map((row) => row.personId));
    let observed = false;
    vi.spyOn(appointments, "chooseAppointee").mockImplementation(
      (readWorld, input) => {
        observed = true;
        expect(readWorld).toBe(world);
        for (const person of Object.values(world.people)) {
          const otherwiseEligible =
            person.id !== president.personId &&
            person.id !== base.personId &&
            !governors.has(person.id) &&
            !dead.has(person.id);
          // U.S. Constitution, Article II, section 1; this is the legacy caller's 35-year input.
          expect(input.eligible(person.id)).toBe(
            otherwiseEligible &&
              officeAgeQualification(person.birthDate, world.currentDate, 35),
          );
        }
        return null;
      },
    );
    const key = `rules2:vp-nomination:${world.currentDate}:control`;
    vicePresidentNominationHandler(world, {
      id: createStableId("future-due-item", key),
      stableKey: key,
      sequence: world.history.nextSequence,
      scheduledAt: world.currentDate,
      dueAt: world.currentDate,
      transitionKey: "governing:vp-nomination",
      entityIds: [],
      jurisdictionId: null,
      provenance: {
        kind: "authored",
        note: "Nomination caller admission control.",
      },
    });
    expect(observed).toBe(true);
  },
);
