import { describe, expect, it } from "vitest";

import { amend, billOnTheFloor } from "./vote-bundle.fixture";

describe("the amendment record's single-subject trail", () => {
  it("keeps the adopted rider's rule citation in a single-subject state", () => {
    const setup = billOnTheFloor("general-policy", "kentucky");
    const world = amend(setup, setup.world, "yea");
    expect(world.history.legislativeAmendments?.at(-1)).toMatchObject({
      status: "adopted",
      singleSubjectRuleCitationAtAdoption: expect.any(String),
    });
  });

  it("does not attach the adoption trail to a rejected amendment", () => {
    const setup = billOnTheFloor();
    const world = amend(setup, setup.world, "nay");
    expect(world.history.legislativeAmendments?.at(-1)).toMatchObject({
      status: "rejected",
    });
    expect(world.history.legislativeAmendments?.at(-1)).not.toHaveProperty(
      "singleSubjectRuleCitationAtAdoption",
    );
  });
});
