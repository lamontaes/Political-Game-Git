import { describe, expect, it } from "vitest";
import { STATES } from "../../simulation/state-reference";
import { programEndedAtDate } from "./program-term";

describe("standalone program sunset rule", () => {
  it.each(Object.keys(STATES))("matches date ordering for US-%s", (usps) => {
    const year = 2026 + (usps.charCodeAt(0) % 2);
    const lastDay = `${year}-06-30`;
    expect(programEndedAtDate(`${year}-06-29`, lastDay)).toBe(false);
    expect(programEndedAtDate(lastDay, lastDay)).toBe(false);
    expect(programEndedAtDate(`${year}-07-01`, lastDay)).toBe(true);
    expect(programEndedAtDate(`${year}-07-01`, null)).toBe(false);
  });
});
