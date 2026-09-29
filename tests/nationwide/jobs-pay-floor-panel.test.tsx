import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { JobListingsPanel } from "../../src/player/JobListingsPanel";
import { nashvilleWithFederalRaise, onDate } from "./federal-raise-fixture";

/*
 * The Jobs screen shows the pay floor line, and the line changes when the
 * enacted raise takes effect. Markup proof; clicking is not claimed here.
 */

describe("the Jobs panel shows the pay floor", () => {
  it("shows the federal rate before the raise and the Act's rate after it", () => {
    const { world, effectiveAt } = nashvilleWithFederalRaise(45);
    const before = renderToStaticMarkup(
      <JobListingsPanel world={world} onWorldChange={() => {}} />,
    );
    expect(before).toContain('data-testid="job-pay-floor"');
    expect(before).toContain("$7.25 an hour, set by federal law");
    const after = renderToStaticMarkup(
      <JobListingsPanel
        world={onDate(world, effectiveAt)}
        onWorldChange={() => {}}
      />,
    );
    expect(after).toContain("$15.00 an hour. Federal law set it from $7.25");
  });
});
