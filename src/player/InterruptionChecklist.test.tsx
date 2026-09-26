import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_INTERRUPTIONS } from "../presentation/shell-navigation";
import { InterruptionChecklist } from "./InterruptionChecklist";

describe("the interruption checklist", () => {
  it("shows the player's own election day as a stop that cannot be switched off", () => {
    const html = renderToStaticMarkup(
      <InterruptionChecklist
        interruptions={DEFAULT_INTERRUPTIONS}
        onChange={() => {}}
        testIdPrefix="shell-stop"
      />,
    );
    const row = html.match(
      /<li data-testid="shell-stop-own-election">[\s\S]*?<\/li>/,
    )?.[0];
    expect(row).toContain("Your own election day");
    expect(row).toMatch(/checked=""/);
    expect(row).toMatch(/disabled=""/);
    expect(html).toContain('data-testid="shell-stop-always"');
    expect(html).toContain('data-testid="shell-stop-stopForWorkShifts"');
  });
});
