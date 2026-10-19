import { describe, expect, it } from "vitest";
import { SITUATION_LIBRARY } from "../../src/director/scheduling";
import { MOVES, readBanks, tagFor } from "../english-corpus/tag-moves";
import {
  catalogProblems,
  coverageCells,
  emptiest,
  NARRATOR,
} from "./coverage-table";

/**
 * The tie between the director's catalog and the banks: every situation type
 * has a key, an endpoint and registers from the shared list, every move a role
 * may make is a shared move, and every part carries the tag its bank's rules
 * give it, so the coverage table counts what the engine can say.
 */
describe("the coverage table", () => {
  const banks = readBanks();

  it("ties every situation type and every role's move to the shared list", () => {
    expect(catalogProblems(SITUATION_LIBRARY.types, banks)).toEqual([]);
  });

  it("tags every part with the move its bank's rules give it", () => {
    for (const bank of banks)
      for (const part of bank.parts) {
        expect(part.tag, part.key).toEqual(tagFor(bank.register, part));
        expect(MOVES.moves[part.tag!.move], part.key).toBeDefined();
        if (part.tag!.key) expect(MOVES.keys[part.tag!.key]).toBeDefined();
      }
  });

  it("counts a part only in a cell whose key it fits", () => {
    const cells = coverageCells(SITUATION_LIBRARY.types, banks);
    const condole = cells.find(
      (row) =>
        row.situation === "layoff" &&
        row.role === "coworkers" &&
        row.move === "condole" &&
        row.register === "conversation",
    )!;
    // "Sorry to hear that." is a loss-keyed condolence: it fits a layoff.
    expect(condole.parts).toBeGreaterThan(0);
    const honor = cells.find(
      (row) =>
        row.situation === "race-won" &&
        row.role === "family" &&
        row.move === "comfort" &&
        row.register === "conversation",
    )!;
    // Every comfort the conversation bank holds is keyed to a loss.
    expect(honor.parts).toBe(0);
    // A narrated register has narrator cells, not a cell per role.
    expect(
      cells.some((row) => row.register === "journal" && row.role !== NARRATOR),
    ).toBe(false);
    expect(emptiest(cells).every((row) => row.parts === 0)).toBe(true);
  });

  it("keeps each civic type either wired to its cause or waiting for the director's producer, naming its cause record", () => {
    const civic = [
      "race-won",
      "race-lost",
      "floor-vote",
      "bill-signed",
      "veto",
      "appointment",
      "recall",
      "public-hearing",
      "press-interview",
      "scandal",
      "law-takes-effect",
      "campaign-stop",
      "filing",
      "layoff",
      "eviction-notice",
    ];
    for (const key of civic) {
      const type = SITUATION_LIBRARY.types.find((row) => row.key === key)!;
      expect(type, key).toBeDefined();
      for (const cause of type.causes) {
        // A cause the director now reads has a match and no waiting flag; one
        // still waiting says so. Either way it names the record it reads.
        if (cause.match !== undefined)
          expect(cause.awaitingProducer, key).toBeUndefined();
        else expect(cause.awaitingProducer, key).toBeTruthy();
        expect(
          (cause as { causeRecord?: string }).causeRecord,
          key,
        ).toBeTruthy();
      }
    }
  });
});
