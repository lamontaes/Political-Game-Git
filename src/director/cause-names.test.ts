import { expect, it } from "vitest";
import { causeMatches } from "./scheduling";

// A cause that names the moment's person matches; one a person only heard of
// from a tie does not (a hearing never casts a listener as its speaker).
const cause = {
  match: { label: "cause:event:public-comment", causeNames: "subject" },
} as never;
const moment = (personId: string) =>
  ({
    personId,
    causeId: "public-comment:bill:1",
    label: "cause:event:public-comment",
    counterpartIds: [],
    echoes: [],
  }) as never;
const core = {
  durableLog: new Map([
    ["public-comment:bill:1", { personIds: ["person_speaker"] }],
  ]),
} as never;

it("matches the speaker and not a listener who heard of the comment", () => {
  const book = {} as never;
  expect(causeMatches(cause, book, moment("person_speaker"), core)).toBe(true);
  expect(causeMatches(cause, book, moment("person_listener"), core)).toBe(
    false,
  );
});
