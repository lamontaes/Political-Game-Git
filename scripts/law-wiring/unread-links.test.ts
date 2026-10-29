import { describe, expect, it } from "vitest";
import stopgaps from "../../src/core2/data/stopgaps.json" with { type: "json" };
import unwired from "../../src/core2/data/outcome-web/unwired.json" with { type: "json" };
import { splitByReader } from "./unread-links";

const open = (id: string) =>
  (stopgaps as unknown as { id: string; status?: string }[]).some(
    (s) => s.id === id && s.status !== "resolved",
  );
const row = (link: string) => ({
  place: "Prescott, Michigan, US-MI",
  f: { id: `fired:${link}`, link, effect: -0.0021 },
});

describe("which fired outcome links an engine reads", () => {
  // Any link listed unwired under an open stopgap: the list shrinks as
  // families land, so the test takes whichever one is listed now.
  const listed = unwired.links.find((l) => open(l.stopgapId));

  it("does not count a ledger row listed unwired under its open stopgap", () => {
    expect(listed).toBeDefined();
    const { read, unread } = splitByReader(
      [row(listed!.link)],
      unwired.links,
      open,
    );
    expect(read).toEqual([]);
    expect(unread.map((u) => u.stopgapId)).toEqual([listed!.stopgapId]);
  });

  it("still counts a fired link that is not listed unwired", () => {
    const listed = new Set(unwired.links.map((l) => l.link));
    const linkRead = "minimum-wage-to-poverty";
    expect(listed.has(linkRead)).toBe(false);
    const { read, unread } = splitByReader(
      [row(linkRead)],
      unwired.links,
      open,
    );
    expect(read).toHaveLength(1);
    expect(unread).toEqual([]);
  });

  it("counts a listed link once its stopgap is resolved", () => {
    const { read, unread } = splitByReader(
      [row(listed!.link)],
      unwired.links,
      () => false,
    );
    expect(read).toHaveLength(1);
    expect(unread).toEqual([]);
  });
});
