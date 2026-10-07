import { describe, expect, it } from "vitest";

import { createLegislativeScenario } from "../src/simulation/legislation-scenarios";
import { measurePosition } from "../src/simulation/legislation";
import { ensureStateExecutiveIncumbent } from "../src/simulation/nationwide-world/state-executives";
import { governorOfficeForJurisdiction } from "../src/simulation/governing/state-governing";
import { STATES } from "../src/simulation/state-reference";
import { enactThroughDesk } from "./fixtures/enact-through-desk";
import { smallWorld } from "./fixtures/small-world";

const PLACES = Object.keys(STATES);
const QUESTION =
  "us-policy-positions:justice-public-safety.mandatory-minimum-sentences";

describe("the shared small test world", () => {
  it("covers all 56 places", () => {
    expect(PLACES).toHaveLength(56);
  });

  it.each(PLACES)("builds a resident world in %s", (usps) => {
    const small = smallWorld({ place: usps });
    expect(small.stateUsps).toBe(usps);
    expect(small.world.personOrder).toHaveLength(4);
    expect(small.world.people[small.personId]!.homeJurisdictionId).toBe(
      small.jurisdictionId,
    );
    expect(small.world.control).toEqual({
      kind: "person",
      personId: small.personId,
    });
  });

  it("is the same world every time for the same request", () => {
    const a = smallWorld({ place: "OH", people: 3 });
    const b = smallWorld({ place: "US-OH", people: 3 });
    expect(b.world.personOrder).toEqual(a.world.personOrder);
  });

  it("starts on the requested date", () => {
    expect(
      smallWorld({ place: "WA", date: "2027-03-01" }).world.currentDate,
    ).toBe("2027-03-01");
  });

  it("seats a governor only when one is asked for", () => {
    expect(
      governorOfficeForJurisdiction(smallWorld({ place: "OH" }).world, "US-OH"),
    ).toBeNull();
    const seated = smallWorld({ place: "OH", offices: ["governor"] });
    expect(
      governorOfficeForJurisdiction(seated.world, "US-OH")?.holderPersonId,
    ).toBeDefined();
  });

  it("resolves requested questions, and refuses an unknown one", () => {
    const small = smallWorld({ place: "KY", laws: [QUESTION] });
    const id = small.propositionIds[QUESTION]!;
    expect(small.world.policyCatalog.propositions[id]!.stableKey).toBe(
      QUESTION,
    );
    expect(small.world.jurisdictions[small.stateJurisdictionId]).toBeDefined();
    expect(() =>
      smallWorld({ place: "KY", laws: ["us-policy-positions:no-such"] }),
    ).toThrow(/No policy question/);
  });
});

describe("a bill made law through the real desk", () => {
  it("carries the bill to the seated governor, who signs it, before it is enacted", () => {
    const scenario = createLegislativeScenario("kentucky");
    const world = ensureStateExecutiveIncumbent(
      scenario.world,
      scenario.playerPersonId,
      "KY",
    );
    const enacted = enactThroughDesk(world, scenario.measureId, {
      context: scenario,
    });
    expect(measurePosition(enacted, scenario.measureId).phase).toBe("enacted");
    expect(
      enacted.history.executiveDispositions!.find(
        (row) => row.measureId === scenario.measureId,
      )!.action,
    ).toBe("signed");
    expect(enacted.control).toEqual(world.control);
  });

  it("never skips an empty desk", () => {
    const scenario = createLegislativeScenario("kentucky");
    expect(() =>
      enactThroughDesk(scenario.world, scenario.measureId, {
        context: scenario,
      }),
    ).toThrow(/No executive is seated/);
  });

  it("asks for the procedure when the bill is not at the desk", () => {
    const scenario = createLegislativeScenario("kentucky");
    expect(() => enactThroughDesk(scenario.world, scenario.measureId)).toThrow(
      /pass its procedure context/,
    );
  });
});
