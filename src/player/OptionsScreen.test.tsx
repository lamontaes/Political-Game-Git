import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OptionsScreen } from "./OptionsScreen";

afterEach(() => vi.unstubAllGlobals());

describe("date format in Options", () => {
  it("reads the saved display preference from the setting used by Calendar", () => {
    vi.stubGlobal("localStorage", {
      getItem: (key: string) =>
        key === "our-civic-duty.calendar-date-order" ? "day-month" : null,
      setItem: vi.fn(),
    });
    const html = renderToStaticMarkup(<OptionsScreen onBack={() => {}} />);
    expect(html).toContain("Date format");
    expect(html).toContain('name="calendar-date-order"');
    expect(html).toMatch(/checked=""[^>]*\/>Day \/ month \/ year/);
  });
});

describe("the options screen carries no authored sentence", () => {
  it("has no note under Options and no sentence literal in its file", () => {
    const html = renderToStaticMarkup(<OptionsScreen onBack={() => {}} />);
    expect(html).not.toContain("game-note");
    const text = readFileSync(join(__dirname, "OptionsScreen.tsx"), "utf8")
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join("\n");
    expect(text.match(/"[A-Z][^"]{25,}[.?!]"/g) ?? []).toEqual([]);
    expect(text.match(/>\s*[A-Z][a-z]+ [a-z ,'&;]{20,}/g) ?? []).toEqual([]);
  });
});
