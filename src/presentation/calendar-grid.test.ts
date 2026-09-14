import { describe, expect, it } from "vitest";
import { createNewGameWorld } from "./new-game";
import { projectCalendarGrid } from "./calendar-grid";

function ordinaryLife() {
  const game = createNewGameWorld({
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed: "ux39-calendar-grid",
    givenName: "Maya",
    familyName: "Calhoun",
  });
  return { world: game.world, personId: game.playerPersonId };
}

describe("calendar grid", () => {
  it("projects a month grid covering the current month without writing the world", () => {
    const { world, personId } = ordinaryLife();
    const before = JSON.stringify(world);
    const grid = projectCalendarGrid(world, personId, {
      mode: "month",
      dateOrder: "mdy",
    });
    expect(JSON.stringify(world)).toBe(before);
    expect(grid.cells.length % 7).toBe(0);
    expect(grid.cells.length).toBeGreaterThanOrEqual(28);
    expect(grid.cells.some((cell) => cell.isToday)).toBe(true);
    expect(grid.heading).toMatch(/20\d{2}/);
  });

  it("projects a seven-day week and keeps history distinct from upcoming", () => {
    const { world, personId } = ordinaryLife();
    const grid = projectCalendarGrid(world, personId, {
      mode: "week",
      dateOrder: "dmy",
    });
    expect(grid.cells).toHaveLength(7);
    expect(grid.heading.startsWith("Week of ")).toBe(true);
    const today = grid.today.date;
    expect(grid.upcoming.every((entry) => entry.start.date >= today)).toBe(
      true,
    );
    expect(grid.history.every((entry) => entry.start.date < today)).toBe(true);
  });
});
