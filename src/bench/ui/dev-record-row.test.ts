import { afterEach, describe, expect, it, vi } from "vitest";
import { devRecordDate, traceRecordButton } from "./dev-view.mjs";

afterEach(() => vi.unstubAllGlobals());

describe("Calendar developer record rows", () => {
  it("uses the existing short date and does not accept a timestamp as a date", () => {
    expect(devRecordDate("2027-03-04")).toBe("Mar 4, 2027");
    expect(devRecordDate("2027-03-04T04:00:00Z")).toBe("Invalid Date");
  });

  it("makes the same compact button open the record that it shows", () => {
    const open = vi.fn();
    const addEventListener = vi.fn();
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({ append: vi.fn(), addEventListener })),
    });
    const button = traceRecordButton("record:one", open);
    expect(button).toMatchObject({
      type: "button",
      className: "link small",
      textContent: "record:one",
    });
    expect(addEventListener.mock.calls[0]?.[0]).toBe("click");
    addEventListener.mock.calls[0]?.[1]();
    expect(open).toHaveBeenCalledWith("record:one");
  });
});
