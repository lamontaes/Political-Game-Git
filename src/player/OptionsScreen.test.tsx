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
