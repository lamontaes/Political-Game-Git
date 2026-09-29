import { describe, expect, it } from "vitest";
import {
  observerSetup,
  openObserverWorld,
} from "../../src/presentation/observer-world";
import { sittingLocalOfficers } from "../../src/simulation/living-world/local-government-seats";
import {
  LOCAL_ELECTIONS_VERSION,
  LOCAL_GOVERNMENT_YEAR,
  localGovernmentYearHandler,
} from "../../src/simulation/living-world/local-elections";
import { peopleKnownTo } from "../../src/simulation/living-world/official-views";
import { homeLocalGovernmentUnits } from "../../src/simulation/nationwide-world/local-governments";
import type { FutureDueItem } from "../../src/simulation/types";
import { recordPersonDeath } from "../../src/simulation/vitality";

/**
 * Tchula, Mississippi (state drawn at random from the 56 jurisdictions, then
 * the town; seed build20-appointments-0005). Its mayor knows only the council,
 * and nobody on the council can fill a council seat, so the vacancy has to
 * come from somebody a council member knows.
 */
const SEED = "build20-appointments-0005";
const TCHULA = "2872440";

describe("a council vacancy", { timeout: 300_000 }, () => {
  it("is filled by somebody a council member knows when the mayor knows nobody eligible", () => {
    const opened = openObserverWorld(observerSetup(SEED, TCHULA));
    let world = opened.world;
    const unit = homeLocalGovernmentUnits(world, opened.anchorPersonId)
      .municipal[0]!;
    const officers = sittingLocalOfficers(world, unit);
    const mayor = officers.find((officer) => officer.mayor)!;
    const member = officers.find((officer) => !officer.mayor)!;
    const town = world.people[mayor.personId]!.homeJurisdictionId;
    world = recordPersonDeath(world, {
      stableKey: "council-vacancy-test:death",
      personId: member.personId,
      diedAt: world.currentDate,
      causeKey: "cause:council-vacancy-fixture",
      sourceEntityIds: [world.id],
      summary: "Died; the cause is not recorded.",
      provenance: { kind: "authored", note: "Council vacancy fixture." },
    });
    const due = {
      id: "due:council-vacancy-test",
      stableKey: `${LOCAL_ELECTIONS_VERSION}:${unit.id}:year:test`,
      sequence: 0,
      scheduledAt: world.currentDate,
      dueAt: world.currentDate,
      transitionKey: LOCAL_GOVERNMENT_YEAR,
      entityIds: [town, opened.anchorPersonId],
      jurisdictionId: town,
      provenance: { kind: "authored", note: "Council vacancy fixture." },
    } as unknown as FutureDueItem;
    const next = localGovernmentYearHandler(world, due).world;
    const appointed = next.history.events.find(
      (event) => event.type === "local.vacancy-appointed",
    );
    expect(appointed?.summary).toMatch(
      /^Mayor .+ appointed .+ until the next election\.$/,
    );
    const appointee = appointed!.involvedEntityIds[0]!;
    const councilKnows = new Set(
      officers
        .filter(
          (officer) =>
            officer.personId !== mayor.personId &&
            officer.personId !== member.personId,
        )
        .flatMap((officer) => peopleKnownTo(world, officer.personId)),
    );
    expect(
      councilKnows.has(appointee) ||
        peopleKnownTo(world, mayor.personId).includes(appointee),
    ).toBe(true);
    expect(next.people[appointee]!.homeJurisdictionId).toBe(town);
  });
});
