import { describe, expect, it } from "vitest";

import {
  formOfAddress,
  REGISTER_CARDS,
  SPEECH_REGISTERS,
} from "./speech-registers";

describe("speech registers", () => {
  it("has a card for every register, and every figure says it was measured and from where", () => {
    for (const register of SPEECH_REGISTERS) {
      const card = REGISTER_CARDS[register];
      expect(card.register).toBe(register);
      for (const check of card.checks) {
        expect(check.basis).toBe("measured");
        expect(check.source.length).toBeGreaterThan(10);
        if (check.unit === "share") {
          expect(check.value).toBeGreaterThanOrEqual(0);
          expect(check.value).toBeLessThanOrEqual(1);
        }
      }
      if (card.setting !== "public-address")
        expect(card.devices).not.toContain("three-part-list");
    }
  });

  it("uses Research 2's one-minute split, not half and half", () => {
    const shares = Object.fromEntries(
      REGISTER_CARDS["house-one-minute"].checks.map((row) => [
        row.key,
        row.value,
      ]),
    );
    expect(shares).toMatchObject({
      tribute: 0.58,
      mixed: 0.11,
      argument: 0.31,
    });
  });

  it("resolves forms of address from the register, the role and the place", () => {
    expect(
      formOfAddress("house-one-minute", "chair", { gender: "female" }),
    ).toBe("Madam Speaker");
    expect(formOfAddress("senate-floor", "chair", { gender: "male" })).toBe(
      "Mr. President",
    );
    expect(
      formOfAddress("house-debate", "colleague", {
        gender: "female",
        fromLabel: "Texas",
      }),
    ).toBe("the gentlewoman from Texas");
    expect(
      formOfAddress("senate-floor", "colleague", {
        gender: "female",
        fromLabel: "Maine",
      }),
    ).toBe("the Senator from Maine");
    expect(
      formOfAddress("state-floor", "colleague", {
        gender: "female",
        fromLabel: "Lackawanna",
      }),
    ).toBe("the gentlelady from Lackawanna");
  });

  it("never guesses a gender it was not told", () => {
    for (const gender of ["unstated", "nonbinary", null] as const) {
      expect(formOfAddress("house-one-minute", "chair", { gender })).toBeNull();
      expect(
        formOfAddress("house-one-minute", "colleague", {
          gender,
          fromLabel: "Ohio",
        }),
      ).toBe("the Representative from Ohio");
    }
    expect(formOfAddress("family", "chair", { gender: "male" })).toBeNull();
  });
});
