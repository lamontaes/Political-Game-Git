import { describe, expect, it } from "vitest";

import { formatMinute } from "./player-calendar";
import { proseDate } from "./prose-dates";

describe("player-facing dates", () => {
  it("says a stored ISO date the American way", () => {
    expect(proseDate("2026-01-20")).toBe("January 20, 2026");
    expect(`${proseDate("2026-09-04")}, ${formatMinute(13 * 60 + 5)}`).toBe(
      "September 4, 2026, 1:05 PM",
    );
  });

  it("leaves text that is not a date alone rather than inventing one", () => {
    expect(proseDate("No current record")).toBe("No current record");
  });
});
