import { describe, expect, it } from "vitest";
import { termStartAfter } from "./elections-calendar";
import type { OfficeInput } from "./offices-local";

// A town office elected outside November takes its seat weeks after the vote,
// not the next January 1 (golden-town-term-start; owner, Oct 14: every winner
// taking office on January 1 is a defect until the record answers why).
const office = (level: OfficeInput["level"]) =>
  ({
    id: `office:${level}:council`,
    level,
    jurisdiction: "jurisdiction_test",
    title: "Council member",
  }) as unknown as OfficeInput;

describe("a town office's term start", () => {
  it("is weeks after a spring vote, not the next January", () => {
    expect(termStartAfter(office("city"), "2025-04-01")).toBe("2025-04-29");
    expect(termStartAfter(office("township"), "2025-05-06")).toBe("2025-06-03");
  });
  it("stays early January after a November vote", () => {
    expect(termStartAfter(office("city"), "2025-11-04")).toBe("2026-01-01");
  });
});
