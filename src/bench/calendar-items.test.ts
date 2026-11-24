import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { calendarItems } from "./calendar";
import { buildBenchWorld } from "./world";

// The calendar is not blank (P47): a person's own birthday, the family's
// birthdays, the holidays and the town's elections come out of the calendar
// bank by what each line says. A place is drawn from all 56 on a seed nobody
// chose, and named in the output.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

describe("the calendar lists what is coming up", () => {
  it("lists the person's birthday, the family's, a holiday and a town's election dates across drawn places", () => {
    const passedOver: string[] = [];
    let electionSeen = false;
    for (let draw = 0; draw < 6 && !electionSeen; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "calendar-items");
      const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const household = [...core.households.values()].find(
        (row) =>
          row.memberIds.length > 1 &&
          row.memberIds.every((id) => core.people.get(id)?.alive),
      );
      expect(household, `${where}: a household of two or more`).toBeDefined();
      const items = calendarItems(core, household!.memberIds[0]!);
      const kinds = new Set(items.map((item) => item.kind));
      for (const kind of ["your-birthday", "birthday", "holiday"])
        expect(kinds.has(kind), `${where}: ${kind} on the calendar`).toBe(true);
      electionSeen = [
        "election",
        "filing-deadline",
        "filing-opens",
        "primary",
      ].some((kind) => kinds.has(kind));
      if (!electionSeen)
        passedOver.push(`${where}: no election date in the window`);
    }
    expect(
      electionSeen,
      `no drawn place had an election date: ${passedOver.join("; ")}`,
    ).toBe(true);
  }, 600_000);
});
