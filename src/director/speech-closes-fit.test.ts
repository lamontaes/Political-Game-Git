import { describe, expect, it } from "vitest";
import outlines from "./data/speech-outlines.json" with { type: "json" };
import bank from "../../data/english/parts/opening-speech.json" with { type: "json" };

/**
 * A close names the theme only in its short form (the lead, Nov 12: "On how
 * we keep people safe and treat them fairly, St. David has waited long
 * enough." put the long name into a frame built for a short one). Every
 * close or hope frame is checked against every theme: none takes the long
 * name, and every short name fits the slot (`themeShortWords`).
 */
const data = outlines as unknown as {
  themeNames: Record<string, string>;
  themeShort: Record<string, string>;
  themeShortWords: { value: number };
};
const themes = Object.keys(data.themeNames).filter((key) => key !== "about");
const closing = (
  bank as unknown as { parts: { key: string; move: string; text: string }[] }
).parts.filter((part) => part.move === "close" || part.move === "hope");

describe("a close says the theme short", () => {
  it("gives every theme a short form that fits a close's slot", () => {
    const long = themes.filter(
      (theme) =>
        !data.themeShort[theme] ||
        data.themeShort[theme]!.split(/\s+/).length >
          data.themeShortWords.value,
    );
    expect(long).toEqual([]);
  });

  it("puts no theme's long name into a close or hope frame", () => {
    const frames = closing
      .filter((part) => part.text.includes("{theme-name}"))
      .map((part) => part.key);
    expect(frames).toEqual([]);
  });

  it("composes every close frame with every theme within the slot", () => {
    const over = closing
      .filter((part) => part.text.includes("{theme-short}"))
      .flatMap((part) =>
        themes
          .map((theme) =>
            part.text.replace("{theme-short}", data.themeShort[theme]!),
          )
          .filter(
            (text) =>
              (text.split(".")[0] ?? "").split(/\s+/).length >
              data.themeShortWords.value + 12,
          ),
      );
    expect(over).toEqual([]);
  });
});
