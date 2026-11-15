import { describe, expect, it } from "vitest";
import research from "../../data/research/offices/state-offices.json" with { type: "json" };
import { stateOffices } from "./offices-state";

// An office's name is its name alone: its seats, terms and form are fields of
// the record, never words in the title the player reads (Account lead, Nov 15:
// "Filing opens for Corporation Commission (5 members, statewide, staggered
// 4-year terms)" on a calendar).
const PLACES = research.places as Record<
  string,
  {
    executives?: {
      key: string;
      title: string;
      seats?: number;
      staggered?: boolean;
      termYears?: number;
      notes?: string;
    }[];
  }
>;

describe("a statewide office is named by its name alone", () => {
  it("has no note in any office title, body name or government name of any state or territory", () => {
    let checked = 0;
    for (const key of Object.keys(PLACES)) {
      for (const { office } of stateOffices(key, "x", "2025-01-20")) {
        const said = `${office.title}|${office.bodyName ?? ""}|${office.governmentName}`;
        expect(said, `${key} ${office.id}`).not.toMatch(/[()]/);
        // One office is one name: no slash between two, no list of boards.
        expect(office.title, `${key} ${office.id}`).not.toMatch(/[/,]/);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(400);
  });

  it.each([
    ["US-AZ", "corporation-commission", "Corporation Commission", 5, 4],
    ["US-TX", "railroad-commission", "Railroad Commission", 3, 6],
  ])(
    "%s: %s is named plainly and keeps its seats and terms as fields",
    (state, key, name, seats, termYears) => {
      const row = PLACES[state]!.executives!.find((e) => e.key === key)!;
      expect(row.title).toBe(name);
      expect(row.seats).toBe(seats);
      expect(row.staggered).toBe(true);
      expect(row.termYears).toBe(termYears);
      const office = stateOffices(state, "x", "2025-01-20").find(
        (o) => o.office.kind === key,
      )!.office;
      expect(office.title).toBe(name);
      expect(office.termYears).toBe(termYears);
    },
  );

  it("US-WI: the superintendent is named plainly and the spring election is a note", () => {
    const row = PLACES["US-WI"]!.executives!.find(
      (e) => e.key === "superintendent",
    )!;
    expect(row.title).toBe("Superintendent of Public Instruction");
    expect(row.notes).toMatch(/spring election/);
  });
});
