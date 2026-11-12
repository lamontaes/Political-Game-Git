// @vitest-environment node
// The news reader reads whatever text the kept lead story holds and never throws:
// printed paragraphs, a broadcast, a lede, or the worded reason it has none. Two drawn places.
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import controls from "./data/controls.json";
import { readerBody } from "./ui/newspaper.mjs";

const node = () => {
  const n: Record<string, unknown> = { children: [] };
  n.append = (...c: unknown[]) => (n.children as unknown[]).push(...c);
  return n;
};
(globalThis as Record<string, unknown>).document = {
  createElement: (tag: string) => ({ ...node(), tag }),
};
const texts = (body: Array<{ textContent?: string }>) =>
  body.map((n) => n.textContent).filter(Boolean);
const none = controls.news.noStoryText;

for (const seed of ["news-reader-a", "news-reader-b"]) {
  const place = drawPlace(seed);
  describe(`reader body, ${place.name} (${place.state}), seed ${seed}`, () => {
    const ctx = `${place.key} ${seed}`;
    it("does not throw on a lead with neither paragraphs nor broadcast", () => {
      const body = readerBody({
        lead: { headline: `Headline ${place.name}` },
        none,
      });
      expect(texts(body), ctx).toEqual([none]);
    });
    it("reads the lede when that is all the story holds", () => {
      const body = readerBody({
        lead: { headline: "H", lede: `Lede for ${place.name}.` },
        none,
      });
      expect(texts(body), ctx).toEqual([`Lede for ${place.name}.`]);
    });
    it("reads a broadcast and the address when present", () => {
      const body = readerBody({
        lead: { headline: "H", broadcast: [{ text: "Tonight." }] },
        address: ["Quote."],
        none,
      });
      expect(texts(body), ctx).toEqual(["Tonight.", "Quote."]);
    });
    it("prefers printed paragraphs", () => {
      const body = readerBody({
        lead: { paragraphs: ["One.", "Two."], broadcast: [{ text: "x" }] },
        none,
      });
      expect(texts(body), ctx).toEqual(["One.", "Two."]);
    });
  });
}
