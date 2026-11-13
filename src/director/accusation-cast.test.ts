/**
 * An accusation is staged only for the accused, never for the one who
 * reported it (Fable A, Nov 13, rule 14; Playtester P2, Fruitland, Idaho:
 * "Matthew Reynolds says you offered them money" when Matthew had made the
 * offer and the player had reported it). The justice engine's record names
 * both, the accused first and the reporter second, so both moments are
 * self-named; the cause reads the record's own `accuserId`.
 */
import { expect, it } from "vitest";
import { SITUATION_LIBRARY, causeMatches } from "./scheduling";

const accusation = SITUATION_LIBRARY.types.find(
  (type) => type.key === "accusation",
)!;
const cause = accusation.causes.find(
  (row) => row.match?.label === "feeling:event:justice.accused",
)!;
const recordId =
  "justice.accused:complaint:bribe:2025-02-01:person_offerer:person_player:person_offerer";
const core = {
  durableLog: new Map([
    [
      recordId,
      {
        kind: "justice.accused",
        personIds: ["person_offerer", "person_player"],
        facts: { accuserId: "person_player", offense: "bribery" },
      },
    ],
  ]),
} as never;
const moment = (personId: string, otherId: string) =>
  ({
    personId,
    causeId: recordId,
    causeKind: "justice.accused",
    label: "feeling:event:justice.accused",
    counterpartIds: [otherId],
    selfNamed: true,
    echoes: [],
  }) as never;

it("stages the accusation for the accused and not for the one who reported it", () => {
  const book = {} as never;
  expect(
    causeMatches(cause, book, moment("person_offerer", "person_player"), core),
    "the accused",
  ).toBe(true);
  expect(
    causeMatches(cause, book, moment("person_player", "person_offerer"), core),
    "the one who reported it",
  ).toBe(false);
});
