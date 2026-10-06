import { describe, expect, it } from "vitest";

import { ECONOMY_VISIBILITY, economyVisibilityFor } from "./economy-visibility";
import type { PlayerOfficeScopeEntry } from "../simulation/governing/office-consequence";

describe("economy visibility", () => {
  it("uses the data table to union two offices and their jurisdictions", () => {
    const offices: PlayerOfficeScopeEntry[] = [
      {
        officeKey: "mayor:town-a",
        title: "Mayor",
        jurisdictionId: "town-a" as never,
        level: "town",
      },
      {
        officeKey: "governor:US-KY",
        title: "Governor",
        jurisdictionId: "state-ky" as never,
        level: "state-executive",
      },
    ];
    const visible = economyVisibilityFor(offices);
    expect(visible.mount.has("program-lines")).toBe(true);
    expect(visible.mount.has("state-macro-series")).toBe(true);
    expect(visible.jurisdictions.has("town-a" as never)).toBe(true);
    expect(visible.jurisdictions.has("state-ky" as never)).toBe(true);
  });

  it("keeps the ordinary public-record route switch in the table", () => {
    expect(ECONOMY_VISIBILITY.resident?.lookItUp).toBe("full");
  });

  it("does not turn a state-only starting place into resident state-budget access", () => {
    const resident = economyVisibilityFor(
      [],
      "state-mo" as never,
      "state-placeholder",
    );
    expect(resident.lookItUpFor("state-mo" as never)).toBe("none");
    expect(resident.mount.has("public-budget")).toBe(false);
  });
});
