import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { JobListingsPanel } from "../../src/player/JobListingsPanel";
import { nashvilleWithFederalRaise, onDate } from "./federal-raise-fixture";

/*
 * The owner removed the legal-pay paragraph from Jobs. The underlying law
 * still governs pay; this verifies only the requested read-only UI removal.
 */

describe("the Jobs panel keeps legal-pay narration out of the listings", () => {
  it("omits the paragraph before and after the enacted raise", () => {
    const { world, effectiveAt } = nashvilleWithFederalRaise(45);
    const before = renderToStaticMarkup(
      <JobListingsPanel world={world} onWorldChange={() => {}} />,
    );
    expect(before).toContain('data-testid="job-listings"');
    expect(before).not.toContain('data-testid="job-pay-floor"');
    expect(before).not.toContain("The lowest legal pay here");
    const after = renderToStaticMarkup(
      <JobListingsPanel
        world={onDate(world, effectiveAt)}
        onWorldChange={() => {}}
      />,
    );
    expect(after).toContain('data-testid="job-listings"');
    expect(after).not.toContain("The lowest legal pay here");
    expect(after).not.toContain("About this kind of work");
  });
});
