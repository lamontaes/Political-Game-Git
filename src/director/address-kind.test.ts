import { describe, expect, it } from "vitest";
import type { PersonState } from "../core2/types";
import {
  ADDRESS_KINDS,
  chooseAddressKind,
  scoreKinds,
  type AddressSituation,
} from "./address-kind";
import { measureSlide } from "../core2/term-read";

// The kind of address a speaker gives (owner, Nov 8): the world's situation
// times the speaker's pull. Pure arithmetic on a situation and a person's
// recorded traits, so these use small hand-made speakers; the played-world
// proof is in opening-address-kinds.test.ts.
const speaker = (traits: Record<string, number> = {}): PersonState =>
  ({ id: "person:speaker", traits }) as unknown as PersonState;
const calm: AddressSituation = {
  slide: 0,
  worstArea: 0,
  grief: 0,
  workShare: 0,
};

describe("the kind of address", () => {
  it("is a bad year's candor, railing or sorrow, and a good year's hope or lap", () => {
    const hard: AddressSituation = { ...calm, slide: -0.6, worstArea: -0.8 };
    const good: AddressSituation = { ...calm, slide: 0.6 };
    const candid = speaker({ "personality-v1:facet-sincere": 1 });
    const railing = speaker({
      "personality-v1:facet-hostile": 1,
      "personality-v1:facet-argumentative": 1,
    });
    expect(chooseAddressKind(candid, hard)).toBe("crisis");
    expect(chooseAddressKind(railing, hard)).toBe("combative");
    expect(chooseAddressKind(speaker(), good)).toMatch(/victory|hopeful/);
    expect(
      chooseAddressKind(speaker({ "personality-v1:facet-proud": 1 }), good),
    ).toBe("victory");
    expect(
      chooseAddressKind(speaker({ "personality-v1:facet-light-hearted": 1 }), {
        ...good,
        slide: 0.1,
      }),
    ).toBe("hopeful");
  });

  it("opens with the dead after a disaster, and fades as the days pass", () => {
    const tender = speaker({ "personality-v1:facet-tender-hearted": 1 });
    expect(
      chooseAddressKind(tender, { ...calm, grief: 0.9, slide: 0.05 }),
    ).toBe("mourning");
    expect(
      chooseAddressKind(tender, { ...calm, grief: 0.02, slide: 0.05 }),
    ).not.toBe("mourning");
  });

  it("slides: a worse year never lowers the crisis or railing score, and nothing is a coin", () => {
    let last = -1;
    for (let step = 0; step <= 10; step++) {
      const slide = -step / 10;
      const rows = scoreKinds(speaker(), { ...calm, slide });
      const crisis = rows.find((row) => row.kind === "crisis")!.score;
      expect(crisis).toBeGreaterThanOrEqual(last);
      last = crisis;
    }
    // The same speaker in the same situation gives the same kind, every time.
    const kinds = new Set(
      Array.from({ length: 5 }, () =>
        chooseAddressKind(speaker(), { ...calm, slide: -0.3 }),
      ),
    );
    expect(kinds.size).toBe(1);
    expect(
      scoreKinds(speaker(), calm)
        .map((row) => row.kind)
        .sort(),
    ).toEqual([...ADDRESS_KINDS].sort());
  });

  it("reads a measure's move as a slide toward better or worse", () => {
    expect(measureSlide(100, 100, 1)).toBe(0);
    expect(measureSlide(100, 112, 1)).toBeGreaterThan(0.5);
    expect(measureSlide(100, 112, -1)).toBeLessThan(-0.5);
    expect(measureSlide(100, 101, 1)).toBeLessThan(0.1);
    expect(Math.abs(measureSlide(1, 1000, 1))).toBeLessThanOrEqual(1);
  });
});
