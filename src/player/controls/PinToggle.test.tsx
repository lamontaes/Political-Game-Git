import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PinToggle } from "./PinToggle";

describe("PinToggle", () => {
  it("says Pin in words beside a pin icon, never a star", () => {
    const html = renderToStaticMarkup(
      <PinToggle
        pinned={false}
        name="Jane Doe"
        testid="t"
        onToggle={() => {}}
      />,
    );
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('aria-label="Pin Jane Doe"');
    expect(html).toContain("pg-pin-icon");
    expect(html).toContain(">Pin<");
    expect(html).not.toMatch(/[★☆]/);
  });

  it("says Unpin, with the kind when one row pins two things", () => {
    const html = renderToStaticMarkup(
      <PinToggle
        pinned
        name="Lexington"
        noun="government"
        testid="t"
        onToggle={() => {}}
      />,
    );
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-label="Unpin Lexington"');
    expect(html).toContain("Unpin government");
  });
});
