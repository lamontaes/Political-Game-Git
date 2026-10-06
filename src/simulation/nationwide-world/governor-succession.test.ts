import { describe, expect, it } from "vitest";
import { observerSetup, openObserverWorld } from "../../presentation/observer-world";
import { eventById } from "../event-index";
import { currentStateExecutiveHolders, stateExecutiveOffice } from "./state-executives";
import { seatGovernorSuccessor } from "./governor-succession";

describe("recorded governor succession news scale", () => {
  it("keeps tenure as office state and records the public governor change at major scale", () => {
    const world = openObserverWorld(observerSetup("b22-governor-change-scale")).world;
    const former = currentStateExecutiveHolders(world).find((row) =>
      row.officeKey.endsWith("-governor"),
    );
    expect(former).toBeDefined();
    const office = stateExecutiveOffice(former!.stateUsps)!;

    const result = seatGovernorSuccessor(world, office, {
      vacancyDate: world.currentDate,
      formerHolderId: former!.personId,
      formerTermEvidenceId: former!.termId,
    });

    expect(result.successorId).toBeDefined();
    const tenure = result.world.history.events.find(
      (event) => event.type === "world.office-tenure" &&
        event.tags.includes("provenance:succession"),
    );
    const change = result.world.history.events.find(
      (event) => event.type === "office.governor-changed",
    );
    expect(tenure).toBeDefined();
    expect(change?.tags).toContain("importance:major");
    expect(change?.jurisdictionId).toBe(office.jurisdictionId);
    expect(change?.participants.some((row) => row.personId === result.successorId)).toBe(true);
    expect(eventById(result.world, tenure!.id)?.type).toBe("world.office-tenure");
  }, 30_000);
});
